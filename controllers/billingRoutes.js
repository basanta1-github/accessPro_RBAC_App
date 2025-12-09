const express = require("express");
const router = express.Router();
const stripe = require("../utils/stripe.js");
const Tenant = require("../models/Tenant.js");
const { sendInvoiceEmail } = require("../utils/stripeEmail.js");
const protect = require("../middlewares/authentication.js");
const tenantIsolation = require("../middlewares/tenantIsolation.js");

const DOMAIN = process.env.CLIENT_URL || "http://localhost:5000";
const tenantMiddleware = require("../middlewares/tenantMiddleware.js");
const { strict } = require("assert");

// subscription plans
const PLANS = {
  Free: { price: null },
  Pro: { priceId: process.env.STRIPE_PRO_PRICE_ID },
  Enterprise: { priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID },
};

// helper to send invoice email
const sendInvoice = async (tenant, amount = 0) => {
  const html = `<p>hi ${tenant.name},</p>
    <p>Your subscription to the <b>${
      tenant.subscription && tenant.subscription.plan
        ? tenant.subscription.plan
        : "N/A"
    }</b> plan is active.</p>
    <p>Amount Charged: $${(amount / 100).toFixed(2)}</p>
    <p>Thank you !</p>`;
  await sendInvoiceEmail(tenant.email, "Your Subscription Invoice", html);
};

// send cancellation and refund email
const sendCancellationEmail = async (
  tenant,
  plan,
  refundAmount = 0,
  refundId = null
) => {
  const html = `<p>Hi ${tenant.name},</p>
    <p>Your subscription to the <b>${plan}</b> plan has been cancelled.</p>
    ${
      refundAmount > 0
        ? `<p>A refund of <b>$${(refundAmount / 100).toFixed(
            2
          )}</b> has been processed to your card.</p>`
        : `<p>No refund was issued.</p>`
    }
    ${refundId ? `<p>Your refund id: <code>${refundId}</code></p>` : ""}
    <p>If you have any questions, please contact support.</p>
    <p>Thank you !</p>`;
  await sendInvoiceEmail(
    tenant.email,
    "Subscription Cancelled and Refunded",
    html
  );
};

// central refund logic used by both cancel route and webhook
// returns {refundAmount, refundId, alreadyRefunded}
// NOTE: This helper NO LONGER mutates or saves tenant. Caller must persist tenant when appropriate.
const doRefundIfNeeded = async (tenant) => {
  // ensure subscription object
  tenant.subscription = tenant.subscription || {};
  const plan = tenant.subscription.plan;
  let refundAmount = 0;
  let refundId = null;

  // idempotency: if we already recorded a refund in DB, then return it (no writes)
  if (
    tenant.subscription.lastRefund &&
    tenant.subscription.lastRefund.refundId
  ) {
    return {
      refundAmount: tenant.subscription.lastRefund.amount || 0,
      refundId: tenant.subscription.lastRefund.refundId,
      alreadyRefunded: true,
    };
  }
  try {
    // ENTERPRISE: one-time payment (we saved payment intent id)
    //
    if (plan === "Enterprise" && tenant.subscription.stripePaymentIntentId) {
      const paymentIntentId = tenant.subscription.stripePaymentIntentId;

      // Check for existing refunds on this payment_intent (avoid double refunds)
      const existingRefunds = await stripe.refunds.list({
        payment_intent: paymentIntentId,
        limit: 10,
      });

      if (
        existingRefunds &&
        existingRefunds.data &&
        existingRefunds.data.length
      ) {
        // Use the first refund (most recent)
        const r = existingRefunds.data[0];
        refundAmount = r.amount || 0;
        refundId = r.id;
        return { refundAmount, refundId, alreadyRefunded: true };
      }

      // get payment intent to determine amount
      const paymentIntent = await stripe.paymentIntents.retrieve(
        paymentIntentId
      );
      const totalAmount = paymentIntent.amount || 0;

      const startDate = tenant.subscription.currentPeriodStart
        ? new Date(tenant.subscription.currentPeriodStart)
        : new Date();
      const cancelDate = new Date();
      const daysUsed = Math.ceil(
        (cancelDate - startDate) / (1000 * 60 * 60 * 24)
      );

      // full refund if cancelled within 30 days
      refundAmount = totalAmount;
      if (daysUsed > 30) {
        const usedAmount = Math.round((totalAmount / 365) * daysUsed);
        refundAmount = Math.max(totalAmount - usedAmount, 0);
      }
      if (refundAmount < 0) refundAmount = 0;

      if (refundAmount > 0) {
        // Create refund but DO NOT persist tenant here
        const refund = await stripe.refunds.create({
          payment_intent: paymentIntentId,
          amount: refundAmount,
          metadata: { customer: tenant.subscription.stripeCustomerId || "" },
        });
        refundId = refund.id;
        return { refundAmount, refundId, alreadyRefunded: false };
      }

      // no refund needed
      return {
        refundAmount: 0,
        refundId: null,
        alreadyRefunded: false,
        message: "refund for enterprise",
      };
    } else if (plan === "Pro" && tenant.subscription.stripeSubscriptionId) {
      const charges = await stripe.charges.list({
        customer: tenant.subscription.stripeCustomerId,
        limit: 1,
      });
      const latestCharge = charges.data[0];
      console.log(latestCharge.id);

      if (!latestCharge) {
        console.log("No charges found for this customer");
        return {
          refundAmount: 0,
          refundId: null,
          alreadyRefunded: false,
          message: "No charge found to refund for Pro subscription",
        };
      }

      const totalAmount = latestCharge.amount || 0;

      const startDate = tenant.subscription.currentPeriodStart
        ? new Date(tenant.subscription.currentPeriodStart)
        : new Date();
      const cancelDate = new Date();
      const daysUsed = Math.ceil(
        (cancelDate - startDate) / (1000 * 60 * 60 * 24)
      );

      // Refund only if within 30 days
      refundAmount = daysUsed <= 30 ? totalAmount : 0;

      if (refundAmount > 0) {
        const refund = await stripe.refunds.create({
          charge: latestCharge.id,
          amount: refundAmount,
          metadata: { customer: tenant.subscription.stripeCustomerId || "" },
        });
        refundId = refund.id;
        return {
          refundAmount,
          refundId,
          alreadyRefunded: false,
          message: "Refund issued",
        };
      } else {
        return {
          refundAmount: 0,
          refundId: null,
          alreadyRefunded: false,
          message: "No refund needed",
        };
      }
    }

    // For Free or other cases, no refund
    return {
      refundAmount: 0,
      refundId: null,
      alreadyRefunded: false,
      message: "No refund needed for other cases",
    };
  } catch (refundError) {
    console.error("refund failed: ", refundError);
    // Throw so caller can abort and avoid DB changes
    throw new Error(
      "Refund processing failed: " + (refundError?.message || refundError)
    );
  }
};

router.post(
  "/subscribe",
  protect,
  tenantIsolation,
  tenantMiddleware,
  async (req, res) => {
    try {
      const { plan, paymentMethodId, email } = req.body;
      // validate the plan
      if (!PLANS[plan] || !email || !paymentMethodId)
        if (email) req.tenant.email = email; // update tenant email if provided

      // if no email in DB, throw error
      if (!req.tenant.email) {
        return res
          .status(400)
          .json({ message: "Email is required for billing" });
      }

      // check if the tenant already has the payment method stored and do not provide the paymentMethodId

      if (req.tenant.subscription?.defaultPaymentMethod && !paymentMethodId) {
        return res.json({
          message:
            "Payment method already exists. Please provide the paymentMethodId in your request to upgrade/change plan.",
        });
      }
      // Block if tenant already has an active paid subscription
      if (
        req.tenant.subscription &&
        req.tenant.subscription.status === "active" &&
        req.tenant.subscription.plan &&
        req.tenant.subscription.plan !== "Free"
      ) {
        return res.status(400).json({
          message: `You already have an active ${req.tenant.subscription.plan} plan. Please cancel your current subscription before subscribing to a new plan.`,
          cancelSubscriptionUrl: `${DOMAIN}/api/billing/cancel-subscription`,
          // optional: only for internal reference, avoid exposing sensitive IDs
          subscriptionInfo: {
            plan: req.tenant.subscription.plan,
            currentPeriodEnd: req.tenant.subscription.currentPeriodEnd || null,
            subscriptionId:
              req.tenant.subscription.plan === "Enterprise"
                ? req.tenant.subscription.checkoutSessionId // or stripePaymentIntentId
                : req.tenant.subscription.stripeSubscriptionId,
          },
        });
      }

      // Create Stripe customer if not exists

      let customerId = req.tenant.subscription.stripeCustomerId;
      let customer = null;
      if (customerId) {
        try {
          customer = await stripe.customers.retrieve(customerId);
          if (customer.deleted) customer = null;
        } catch (error) {
          customer = null;
        }
      }
      if (!customer) {
        customer = await stripe.customers.create({
          email: req.tenant.email,
          metadata: { tenantId: req.tenant._id.toString() },
        });

        customerId = customer.id;
        req.tenant.subscription = {
          ...(req.tenant.subscription || {}),
          stripeCustomerId: customerId,
        };
      }
      // first time paid plan (no payment method id) -> create a stripe checkout session

      if (!paymentMethodId) {
        const session = await stripe.checkout.sessions.create({
          mode: "setup",
          customer: customerId,
          payment_method_types: ["card"],
          success_url: `${DOMAIN}/api/billing/stripe-success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${DOMAIN}/api/billing/stripe-cancel`,
        });
        // Save stripeCustomerId immediately, so tenant can be found later
        req.tenant.subscription = {
          ...(req.tenant.subscription || {}),
          stripeCustomerId: customerId,
        };
        await req.tenant.save();

        // return the client secret + a frontend URL for your card page
        return res.json({
          message:
            "Open the frontend URL to enter card and save it (you will receive a paymentMethodId).",
          checkoutUrl: session.url,
          subscription: req.tenant.subscription,
        });
      }

      // SECOND STEP: paymentMethodId provided --> attach and set default
      // attach to customer (idempotent if already attached)

      // fetch payment method

      const paymentMethod = await stripe.paymentMethods.retrieve(
        paymentMethodId
      );
      // ⚡ Fail fast if payment method email does not match tenant email
      if (
        paymentMethod.billing_details?.email &&
        paymentMethod.billing_details.email !== req.tenant.email
      ) {
        return res.status(400).json({
          message: "Payment method email does not match your account email",
        });
      }

      //  Attach payment method if not already attached
      if (!paymentMethod.customer) {
        await stripe.paymentMethods.attach(paymentMethodId, {
          customer: customerId,
        });
      } else if (paymentMethod.customer !== customerId) {
        return res.status(400).json({
          message:
            "This payment method is not registered with your account/email",
        });
      }

      //  Set default payment method

      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });

      // save Payment method on tenant
      req.tenant.subscription = {
        ...(req.tenant.subscription || {}),
        defaultPaymentMethod: paymentMethodId,
        stripeCustomerId: customerId,
        plan,
        status: "active",
      };

      // FREE PLAN (no priceId) -> save PM + activate immediately
      const priceId = PLANS[plan].priceId ?? null;
      if (plan !== "Free" && !PLANS[plan].priceId) {
        return res.status(500).json({
          message: `Price ID missing for plan ${plan}. Check your environment variables.`,
        });
      }

      console.log("Using priceId:", priceId); // debug output

      // FREE plan (no priceId) -> save PM + activate immediately
      if (!priceId) {
        await Promise.all([req.tenant.save(), sendInvoice(req.tenant, 0)]);
        return res.json({
          message: `Plan ${plan} activated and card saved`,
          paymentMethodId,
        });
      }

      // if plans has a priceId --> create subscription

      if (priceId) {
        // cancel previous subscription if exists
        if (req.tenant.subscription.stripeSubscriptionId) {
          try {
            await stripe.subscriptions.cancel(
              req.tenant.subscription.stripeSubscriptionId,
              {
                invoice_now: true,
              }
            );
          } catch (e) {
            console.warn("Failed to cancel previous subscription", e);
          }
        }
        if (plan === "Enterprise") {
          // enterprise plan -> one time payment
          const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "payment",
            customer: customerId,
            line_items: [
              {
                price: priceId,
                quantity: 1,
              },
            ],
            success_url: `${DOMAIN}/api/billing/stripe-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${DOMAIN}/api/billing/stripe-cancel`,
          });

          req.tenant.subscription.checkoutSessionId = session.id;
          await req.tenant.save();

          return res.json({
            message: `Enterprise plan one-time payment session created`,
            checkoutUrl: session.url,
          });
        }
        const subscription = await stripe.subscriptions.create({
          customer: customerId,
          items: [{ price: priceId }],
          default_payment_method: paymentMethodId,
          expand: ["latest_invoice.payment_intent", "latest_invoice"],
        });
        req.tenant.subscription.stripeSubscriptionId = subscription.id;

        // ✅ Store current period dates as Date objects
        req.tenant.subscription.currentPeriodEnd =
          subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000)
            : null;
        req.tenant.subscription.currentPeriodStart =
          subscription.current_period_start
            ? new Date(subscription.current_period_start * 1000)
            : null;

        req.tenant.subscription.cancelAtPeriodEnd =
          subscription.cancel_at_period_end;

        req.tenant.subscription.amountPaid =
          subscription.latest_invoice?.amount_paid;

        // ⚠️ PaymentIntent might be null here
        req.tenant.subscription.stripePaymentIntentId =
          subscription.latest_invoice?.payment_intent || null;

        // ✅ Save tenant after updating subscription
        await Promise.all([
          req.tenant.save(),
          sendInvoice(req.tenant, req.tenant.subscription.amountPaid),
        ]);

        return res.json({
          message: `${plan} subscription created`,
          subscription,
        });
      }

      return res.json({
        message: `Plan ${plan} activated and card saved`,
        paymentMethodId,
      });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ message: "subscription failed", err: error.message });
    }
  }
);

router.get("/stripe-success", async (req, res) => {
  const { session_id } = req.query;
  if (!session_id) return res.status(400).send("No session Id provided");

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: [
        "payment_intent",
        "setup_intent",
        "subscription",
        "subscription.latest_invoice.payment_intent",
      ],
    });

    const customerId = session.customer;

    // find tenant by stripe customer id
    const tenant = await Tenant.findOne({
      "subscription.stripeCustomerId": customerId,
    });
    if (!tenant) return res.status(404).send("Tenant not found");
    const plan = tenant.subscription.plan;
    let amountPaid = 0;
    let paymentIntentId = null;

    // CASE 1: SetupIntent (saving a card for recurring plans)
    if (session.setup_intent) {
      const setupIntent = session.setup_intent;
      const paymentMethodId = setupIntent.payment_method;

      if (paymentMethodId) {
        // attach payment method to customer
        await stripe.paymentMethods.attach(paymentMethodId, {
          customer: customerId,
        });
        // set default payment method
        await stripe.customers.update(customerId, {
          invoice_settings: { default_payment_method: paymentMethodId },
        });
        tenant.subscription.defaultPaymentMethod = paymentMethodId;
        await tenant.save();
      }

      return res.status(200).json({
        success: true,
        message:
          "Payment method saved successfully. You can now upgrade your plan.",
        paymentMethodId: paymentMethodId,
        customerId,
        email: session.customer_details?.email || tenant.email || null,
      });
    }

    // CASE 2: One-time Enterprise payment
    if (session.payment_intent) {
      const paymentIntentObj =
        typeof session.payment_intent === "string"
          ? await stripe.paymentIntents.retrieve(session.payment_intent)
          : session.payment_intent;

      paymentIntentId = paymentIntentObj.id;
      amountPaid = paymentIntentObj.amount_received || 0;

      //save payment data

      // save payment intent for future refunds
      tenant.subscription.stripePaymentIntentId = paymentIntentId;
      tenant.subscription.amountPaid = amountPaid;
      tenant.subscription.status = "active";
      await tenant.save();

      await sendInvoice(tenant, amountPaid);

      return res.status(200).json({
        success: true,
        message: "Enterprise payment successful and subscription activated.",
        paymentIntentId,
        amountPaid,
        customerId,
        email: session.customer_details?.email || tenant.email || null,
      });
    }
    // case 3 pro plan recurring subscription

    if (session.subscription) {
      const subscription = session.subscription;
      const invoice = subscription.latest_invoice;
      if (invoice?.payment_intent) {
        const paymentIntentObj =
          typeof invoice.payment_intent === "string"
            ? await stripe.paymentIntents.retrieve(invoice.payment_intent)
            : invoice.payment_intent;

        amountPaid = paymentIntentObj.amount_received;
        paymentIntentId = paymentIntentObj.id;

        // update tenant subscription info
        tenant.subscription.stripeSubscriptionId = subscription.id;
        tenant.subscription.amountPaid = amountPaid;
        tenant.subscription.status = "active";
        tenant.subscription.stripePaymentIntentId = paymentIntentId;

        await tenant.save();
      }
      await sendInvoice(tenant, amountPaid);

      return res.status(200).json({
        success: true,
        message: "Pro subscription successful and activated.",
        amountPaid,
        subscriptionId: subscription.id,
        paymentIntentId,
        customerId,
        email: session.customer_details?.email || tenant.email || null,
        subscription: tenant.subscription,
      });
    }
    // fallback
    return res.status(400).send("No setup or payment intent found in session");
  } catch (err) {
    console.log("Error : ", err);
    return res.status(500).json({
      error: {
        message: err.message,
        stack: err.stack,
        name: err.name,
      },
    });
  }
});

// -----------------------------
// Protected cancel route to call from CLI / Postman / admin tools
// It will: attempt refund, if refund ok then cancel subscription, update DB and send email
// If refund was expected but not issued, do NOT update DB nor cancel in stripe (block).
// -----------------------------
router.post("/cancel-subscription", protect, async (req, res) => {
  if (req.tenant.plan === "pro") {
    const { email, subscriptionId } = req.body;
    if (!email || !subscriptionId) {
      return res.json({ message: "missing email or stripe subscription id" });
    }
  } else if (req.tenant.plan === "Enterprise") {
    const { email } = req.body;
    if (!email) {
      return res.json({ message: "missing email" });
    }
  }
  try {
    const tenant = await Tenant.findById(req.tenant.tenantId);

    if (!tenant || !tenant.subscription) {
      return res
        .status(404)
        .json({ message: "Tenant or subscription not found" });
    }

    const paidAmount = tenant.subscription.amountPaid;
    if (tenant.subscription.status === "canceled") {
      console.log("subscription already cancelled");
      res.json({ message: "subscription already cancelled" });
    }
    // fetch latest refund from Stripe if exists
    let refundAmount = 0;
    let refundId = null;

    try {
      const refundResult = await doRefundIfNeeded(tenant);
      //  Return early if already refunded
      if (refundResult.alreadyRefunded) {
        return res.json({
          message: "Subscription has already been refunded",
          refundAmount: refundResult.refundAmount,
          refundId: refundResult.refundId,
        });
      }
      refundAmount = refundResult.refundAmount;
      refundId = refundResult.refundId;

      // block if not fully refunded
      if (!refundResult.alreadyRefunded && refundAmount > 0 && !refundId) {
        return res.status(500).json({
          message: `Refund failed. Cancellation blocked.`,
        });
      }
    } catch (err) {
      console.error("Error fetching payment intent:", err);
      return res.status(500).json({
        message: "Failed to fetch payment info",
        error: err.message,
      });
    }

    // block cancellation if refund amount is not equal to paid amount
    console.log(refundAmount, paidAmount, "line 634");
    if (refundAmount !== paidAmount) {
      return res.status(400).json({
        message: `Cancellation blocked: refund amount (${
          refundAmount / 100
        }) does not match paid amount (${paidAmount / 100}).`,
      });
    }
    // cancel subs in stripe
    try {
      if (tenant.subscription.stripeSubscriptionId) {
        await stripe.subscriptions.cancel(
          tenant.subscription.stripeSubscriptionId
        );
      }
    } catch (err) {
      console.warn("Failed to cancel Stripe subscription:", err);
    }

    // mark subscription canceled
    tenant.subscription.status = "canceled";
    tenant.subscription.stripeSubscriptionId = null;
    if (refundAmount > 0 || refundId) {
      tenant.subscription.lastRefund = {
        refundId: refundId || null,
        amount: refundAmount || 0,
        refundedAt: new Date(),
      };
    }
    await tenant.save();

    // send cancellation email using the paid amount
    await sendCancellationEmail(
      tenant,
      tenant.subscription.plan,
      refundAmount,
      refundId
    );

    return res.json({
      message: "Subscription canceled, email sent with refund info",
      amountPaid: paidAmount,
      refundAmount,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Failed to cancel subscription", error: err.message });
  }
});

// stripe Webhook endpoint (public) - stripe will call this
// IMPORTANT: mount this route with express.raw in app.js:
// app.post('/api/billing/webhook', express.raw({type: 'application/json'}), billingRouter);

router.post("/webhook", async (req, res) => {
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
      case "setup_intent.succeeded": {
        const setupIntent = data;
        const tenant = await Tenant.findOne({
          "subscription.stripeSubscriptionId": data.subscription,
        });
        if (tenant) {
          tenant.subscription = tenant.subscription || {};
          tenant.subscription.defaultPaymentMethod = setupIntent.payment_method;
          await tenant.save();
        }
        break;
      }
      case "invoice.payment_succeeded":
        {
          const invoice = event.data.object;
          const tenant = await Tenant.findOne({
            "subscription.stripeSubscriptionId": invoice.subscription,
          });

          if (!tenant) {
            console.log(
              "Tenant not found for subscription:",
              invoice.subscription
            );
            return res.json({ received: true });
          }

          // Update subscription details
          tenant.subscription.stripePaymentIntentId = invoice.payment_intent;
          tenant.subscription.status = "active";
          tenant.subscription.amountPaid = invoice.amount_paid; // in cents
          tenant.subscription.currentPeriodEnd = new Date(
            invoice.lines.data[0].period.end * 1000
          );

          await tenant.save();

          console.log(
            "Saved PaymentIntent ID on invoice.payment_succeeded webhook",
            invoice.payment_intent
          );

          await sendInvoice(tenant, invoice.amount_paid);

          res.json({ received: true });
        }
        break;

      case "invoice.payment_failed": {
        const tenant = await Tenant.findOne({
          "subscription.stripeSubscriptionId": data.subscription,
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
        }
        break;
      }
      case "customer.subscription.deleted":
      case "customer.subscription.updated": {
        const subscription = data;
        const isDeleted = event.type === "customer.subscription.deleted";
        const isCanceled = subscription.status === "canceled";
        if (!isDeleted && !isCanceled) {
          break;
        }
        const tenant = await Tenant.findOne({
          "subscription.stripeSubscriptionId": subscription.id,
        });
        if (!tenant) {
          console.log(
            "Tenant not found for deletion of subscription: ",
            subscription.id
          );
          break;
        }
        if (tenant.subscription && tenant.subscription.status === "canceled") {
          console.log(
            "Tenant already marked canceled, skipping:",
            tenant._id.toString()
          );
          break;
        }

        // Keep original plan for email
        const planBeforeCancel = tenant.subscription.plan || "Free";

        // Try refund logic (doRefundIfNeeded no longer writes)
        try {
          const { refundAmount, refundId, alreadyRefunded } =
            await doRefundIfNeeded(tenant);

          // Persist refund info only if refund exists or alreadyRefunded
          if (refundId || alreadyRefunded) {
            tenant.subscription = tenant.subscription || {};
            tenant.subscription.lastRefund = {
              refundId:
                refundId ||
                (tenant.subscription.lastRefund &&
                  tenant.subscription.lastRefund.refundId) ||
                null,
              amount:
                refundAmount ||
                (tenant.subscription.lastRefund &&
                  tenant.subscription.lastRefund.amount) ||
                0,
              refundedAt: new Date(),
            };
          }

          // mark cancel in db and save
          tenant.subscription.status = "canceled";
          tenant.subscription.stripeSubscriptionId = null;
          tenant.subscription.plan = tenant.subscription.plan || "Free";
          await tenant.save();

          // Send cancellation email (with refund info)
          await sendCancellationEmail(
            tenant,
            planBeforeCancel,
            refundAmount,
            refundId
          );
        } catch (err) {
          console.error(
            "Error while processing subscription deletion webhook refund:",
            err
          );
          // Do not modify tenant if refund helper failed unexpectedly; just log and continue
        }

        break;
      }
      case "refund.created": {
        // data is a refund object
        const refund = data;
        let stripeCustomerId =
          refund.metadata?.customer || refund.customer || null;

        // If no customer on refund metadata/object, try to fetch the charge and extract customer
        if (!stripeCustomerId && refund.charge) {
          try {
            const chargeObj = await stripe.charges.retrieve(refund.charge);
            stripeCustomerId = chargeObj?.customer || null;
          } catch (err) {
            console.warn(
              "Failed to fetch charge for refund to determine customer:",
              err?.message || err
            );
          }
        }

        if (!stripeCustomerId) {
          console.log("No stripeCustomerId on refund.created, skipping");
          break;
        }

        const tenant = await Tenant.findOne({
          "subscription.stripeCustomerId": stripeCustomerId,
        });
        if (tenant) {
          if (!tenant.subscription) tenant.subscription = {};
          tenant.subscription.lastRefund = {
            refundId: refund.id,
            amount: refund.amount || 0,
            refundedAt: new Date(),
          };
          await tenant
            .save()
            .catch((e) => console.error("save refund in tenant failed", e));

          // send refund email
          await sendInvoiceEmail(
            tenant.email,
            "Your refund has been processed",
            `<p>Hi ${tenant.name},</p>
             <p>Your recent payment has been refunded.</p>
             <p>Refund Amount: <b>$${((refund.amount || 0) / 100).toFixed(
               2
             )}</b></p>
             <p>If this wasn't you, please contact support.</p>`
          );
          console.log("Refund email sent to customer.");
        }
        break;
      }
      case "charge.refunded": {
        // data is a charge object
        const charge = data;
        const stripeCustomerId = charge.customer || charge.metadata?.customer;
        if (!stripeCustomerId) {
          console.log("No stripeCustomerId on charge.refunded, skipping");
          break;
        }

        const tenant = await Tenant.findOne({
          "subscription.stripeCustomerId": stripeCustomerId,
        });
        if (!tenant) {
          console.log(
            "Tenant not found for refund, skipping:",
            stripeCustomerId
          );
          break;
        }

        // Try to get refund id and amount from charge.refunds if available
        let refundId = null;
        let amountRefunded = charge.amount_refunded || 0;
        if (
          charge.refunds &&
          charge.refunds.data &&
          charge.refunds.data.length
        ) {
          refundId = charge.refunds.data[0].id;
          amountRefunded = charge.refunds.data[0].amount || amountRefunded;
        }

        tenant.subscription = tenant.subscription || {};
        tenant.subscription.lastRefund = {
          refundId: refundId,
          amount: amountRefunded,
          refundedAt: new Date(),
        };
        await tenant
          .save()
          .catch((err) =>
            console.error("Failed to save tenant refund info", err)
          );

        await sendInvoiceEmail(
          tenant.email,
          "Your refund has been processed",
          `<p>Hi ${tenant.name},</p>
           <p>Your recent payment has been refunded.</p>
           <p>Refund Amount: <b>$${((amountRefunded || 0) / 100).toFixed(
             2
           )}</b></p>
           <p>If this wasn't you, please contact support.</p>`
        );

        console.log("Refund email sent to customer (charge.refunded).");
        break;
      }
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  } catch (err) {
    console.error("Error handling webhook event:", err);
  }

  // return 200 to Stripe
  res.json({ received: true });
});

module.exports = router;
