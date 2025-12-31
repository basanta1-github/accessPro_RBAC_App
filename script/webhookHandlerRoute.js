const express = require("express");
const router = express.Router();
const stripe = require("../config/stripe.js");
const Tenant = require("../models/Tenant.js");
const { sendInvoiceEmail } = require("../utils/stripeEmail.js");
const { doRefundIfNeeded } = require("../middlewares/stripeHandlers.js");
const activityLogger = require("../controllers/activityLogger.js");

const NotificationService = require("../utils/notificationService.js");

// stripe Webhook endpoint (public) - stripe will call this
// IMPORTANT: mount this route with express.raw in app.js:
// app.post('/api/billing/webhook', express.raw({type: 'application/json'}), billingRouter);
router.post("/webhook", async (req, res) => {
  console.log(">>> webhook raw body length:", req.body?.length || "(no body)");
  console.log(">>> headers stripe-signature:", req.headers["stripe-signature"]);

  const sig = req.headers["stripe-signature"];
  let event;

  try {
    // MUST USE RAW BODY WHEN MOUNTING
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.WEBHOOK_SIGNING_SECRET
    );
  } catch (error) {
    console.error("Webhook verification failed", error?.message || error);
    return res
      .status(400)
      .send(`Webhook Error: ${error.message || String(error)}`);
  }

  console.log("Received Stripe webhook:", event.type);
  const data = event.data.object;

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode === "setup") {
          console.log("Setup session completed (card saved, no payment)");
          // can save paymentMethodId
          break;
        }
        if (session.mode === "payment") {
          const tenant = await Tenant.findOne({
            "subscription.stripeCustomerId": session.customer,
          });
          console.log(tenant);
          // save subscription info now
          if (!tenant) {
            console.log("tenant not found for the session:", session.id);
            break;
          }
          // Idempotency check
          if (
            tenant.subscription.lastPaymentIntentIdSent ===
            session.payment_intent
          ) {
            console.log(
              "Payment intent already processed:",
              session.payment_intent
            );
            break;
          }
          console.log(session.metadata?.plan);
          tenant.subscription = tenant.subscription || {};
          // Set plan dynamically based on session metadata (safer)
          tenant.subscription.checkoutSessionId = session.id;
          tenant.subscription.stripeCustomerId = session.customer || null;
          tenant.subscription.plan = session.metadata?.plan || "Enterprise";
          tenant.subscription.status = "active";
          console.log(
            tenant.subscription.checkoutSessionId,
            session.id,
            "this is the session id"
          );

          // Get the payment amount
          let amount = 0;
          if (session.payment_intent) {
            const paymentIntent = await stripe.paymentIntents.retrieve(
              session.payment_intent
            );
            amount = paymentIntent.amount_received;
          }

          tenant.subscription.stripePaymentIntentId = session.payment_intent;
          tenant.subscription.lastPaymentIntentIdSent = session.payment_intent;
          await tenant.save();

          try {
            await NotificationService.notify("subscription_invoice", {
              tenant,
              amount,
            });
          } catch (error) {
            console.error(
              "failed to send invoice via notification service:",
              error
            );
          }
          console.log(
            `Checkout completed for ${tenant.email}, charged: $${(
              amount / 100
            ).toFixed(2)}`
          );

          activityLogger
            .track({
              req,
              res,
              user: { _id: null, role: "system" },
              action: "STRIPE_CHECKOUT_COMPLETED",
              resource: "BILLING",
              extra: {
                stripeEvent: event.type,
                plan: tenant.subscription.plan,
                amount,
                sessionId: session.id,
              },
              allowUserTenantFallback: true,
            })
            .catch((err) => console.error("Activity log failed:", err.message));
        }
        break;
      }
      case "invoice.payment_succeeded":
      case "invoice_payment.paid":
        {
          const invoice = event.data.object;
          // get subscription ID safely
          const subscriptionId =
            invoice.subscription ||
            invoice.parent?.subscription_details?.subscription;

          if (!subscriptionId) {
            console.error("No subscription ID found in invoice:", invoice.id);
            return res.status(400).send("No subscription ID found");
          }

          // retrieve subscription to access metadata
          const subscription = await stripe.subscriptions.retrieve(
            subscriptionId
          );

          const tenantId = subscription.metadata.tenantId;
          // fetch tenant from DB
          const tenant = await Tenant.findById(tenantId);
          if (!tenant) {
            console.error("Tenant not found:", tenantId);
          } else {
            console.log("Tenant found:", tenant.email);
          }

          // --- FINAL STATE IDEMPOTENCY ---
          if (tenant.subscription.lastInvoiceIdSent === invoice.id) {
            console.log("Invoice already processed, skipping:", invoice.id);
            break;
          }

          // Update subscription details
          tenant.subscription.status = "active";
          tenant.subscription.plan = subscription.metadata.plan || "Pro";
          tenant.subscription.stripePaymentIntentId = invoice.payment_intent;
          tenant.subscription.amountPaid = invoice.amount_paid; // in cents
          tenant.subscription.currentPeriodEnd = new Date(
            invoice.lines.data[0].period.end * 1000
          );
          tenant.subscription.lastInvoiceIdSent = invoice.id; // idempotency marker

          await tenant.save();
          await NotificationService.notify("subscription_invoice", {
            tenant,
            amount: invoice.amount_paid,
          });

          console.log(
            "Saved PaymentIntent ID on invoice.payment_succeeded webhook",
            invoice.payment_intent
          );

          activityLogger
            .track({
              req,
              res,
              user: { _id: null, role: "system" },
              action: "STRIPE_PAYMENT_SUCCEDED",
              resource: "BILLING",
              extra: {
                stripeEvent: event.type,
                plan: tenant.subscription.plan,
                amount: invoice?.amount_paid,
                invoice,
              },
              allowUserTenantFallback: true,
            })
            .catch((err) => console.error("Activity log failed:", err.message));
        }
        break;

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const tenant = await Tenant.findOne({
          "subscription.stripeSubscriptionId": invoice.subscription,
        });
        if (tenant) {
          tenant.subscription.status = "past_due";
          await tenant.save();
          await sendInvoiceEmail(
            tenant.email,
            "Payment Failed",
            `<p>Hi ${tenant.name}</p>
             <p>Your payment for the <b>${tenant.subscription.plan}</b> plan failed. Please update your payment method.</p>`
          );
          req.tenant = tenant;

          activityLogger
            .track({
              req,
              res,
              user: { _id: null, role: "system" },
              action: "STRIPE_PAYMENT_FAILED",
              resource: "BILLING",
              extra: {
                stripeEvent: event.type,
                invoice,
              },
              allowUserTenantFallback: true,
            })
            .catch((err) => console.error("Activity log failed:", err.message));
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object;

        const tenant = await Tenant.findOne({
          "subscription.stripeSubscriptionId": subscription.id,
        });

        if (!tenant) break;

        const planBeforeCancel = tenant.subscription.plan;
        console.log(subscription.status);
        console.log(tenant.subscription.status);

        // Only proceed if subscription status changed to canceled
        if (subscription.status !== "canceled") break;

        // Check idempotency: don't run if already marked canceled in DB
        if (tenant.subscription.status === "canceled") break;

        // Refund (safe, idempotent)
        const { refundAmount, refundId } = await doRefundIfNeeded(tenant);

        tenant.subscription.status = "canceled";
        tenant.subscription.stripeSubscriptionId = null;

        if (refundId) {
          tenant.subscription.lastRefund = {
            refundId,
            amount: refundAmount,
            refundedAt: new Date(),
          };
        }

        await tenant.save();

        // Send ONE cancellation email
        await NotificationService.notify("subscription_cancelled", {
          tenant,
          plan: planBeforeCancel,
          refundAmount,
          refundId,
        });
        activityLogger
          .track({
            req,
            res,
            user: { _id: null, role: "system" },
            action: "STRIPE_SUBSCRIPTION_CANCELLED",
            resource: "BILLING",
            extra: {
              stripeEvent: event.type,
              plan: tenant.subscription.plan,
              amount: refundAmount,
            },
            allowUserTenantFallback: true,
          })
          .catch((err) => console.error("Activity log failed:", err.message));

        break;
      }
      case "charge.refunded": {
        const charge = event.data.object;
        const customerId = charge.customer;

        const tenant = await Tenant.findOne({
          "subscription.stripeCustomerId": customerId,
        });

        if (!tenant) break;

        const refund = charge.refunds?.data?.[0];
        if (!refund) break;

        // Idempotency guard
        if (tenant.subscription?.lastRefund?.refundId === refund.id) break;

        tenant.subscription.lastRefund = {
          refundId: refund.id,
          amount: refund.amount,
          refundedAt: new Date(),
        };

        await tenant.save();

        // DO NOT send email here
        // Email already sent in subscription.deleted

        activityLogger
          .track({
            req,
            res,
            user: { _id: null, role: "system" },
            action: "STRIPE_REFUND_CREATED",
            resource: "BILLING",
            extra: {
              stripeEvent: event.type,
              plan: tenant.subscription.plan,
              amount: refund.amount,
              refundId: refund.id,
              chargeId: charge.id,
            },
            allowUserTenantFallback: true,
          })
          .catch((err) => console.error("Activity log failed:", err.message));

        break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  } catch (err) {
    console.error("Error handling webhook event:", err);
    activityLogger
      .track({
        req,
        res,
        user: { _id: null, role: "system" },
        action: "STRIPE_WEBHOOK_FAILED",
        resource: "BILLING",
        extra: { stripeEvent: event.type, error: err.message },
        allowUserTenantFallback: true,
      })
      .catch((err) => console.error("Activity log failed:", err.message));
  }

  // return 200 to Stripe
  res.json({ received: true });
});

module.exports = router;
