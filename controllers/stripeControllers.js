const stripe = require("../config/stripe.js");
const Tenant = require("../models/Tenant.js");
const DOMAIN = process.env.CLIENT_URL || "http://localhost:5000";
const asyncHandler = require("../middlewares/asyncHandler.js");

const NotificationService = require("../utils/notificationService");

// subscription plans
const PLANS = {
  Free: { price: null },
  Pro: { priceId: process.env.STRIPE_PRO_PRICE_ID },
  Enterprise: { priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID },
};

const stripeSubscription = async (req, res) => {
  try {
    const { plan, paymentMethodId, email } = req.body;
    // validate the plan
    if (!PLANS[plan]) {
      return res.status(400).json({ message: "invalid plan" });
    }
    if (email) req.tenant.email = email; // update tenant email if provided

    // if no email in DB, throw error
    if (!req.tenant.email) {
      return res.status(400).json({ message: "Email is required for billing" });
    }

    // check if the tenant already has the payment method stored and do not provide the paymentMethodId

    if (req.tenant.subscription?.defaultPaymentMethod && !paymentMethodId) {
      return res.json({
        message:
          "Payment method already exists. Please provide the paymentMethodId in your request to upgrade/change plan.",
      });
    }
    // Block if tenant already has an active paid subscription

    const sub = req.tenant.subscription || {};

    const hasActiveEnterprise =
      sub.plan === "Enterprise" && sub.status === "active";

    const hasActivePro = !!sub.stripeSubscriptionId && sub.status === "active";

    if (hasActiveEnterprise || hasActivePro) {
      return res.status(400).json({
        message: `You already have an active subscription. Please cancel your current subscription before subscribing to a new plan.`,
        cancelSubscriptionUrl: `${DOMAIN}/api/billing/cancel-subscription`,
        sub,
      });
    }

    // Create Stripe customer if not exists

    let customerId = sub.stripeCustomerId;
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
    // Save payment method (SetupIntent flow)

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

    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
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
    };
    await req.tenant.save();

    // FREE PLAN (no priceId) -> save PM + activate immediately
    const priceId = PLANS[plan].priceId ?? null;
    if (plan !== "Free" && !PLANS[plan].priceId) {
      return res.status(500).json({
        message: `Price ID missing for plan ${plan}. Check your environment variables.`,
      });
    }

    // FREE plan (no priceId) -> save PM + activate immediately
    if (!priceId) {
      req.tenant.subscription = {
        ...(req.tenant.subscription || {}),
        plan,
        status: "active",
      };
      await Promise.all([
        req.tenant.save(),
        NotificationService.notify("plan_activated", {
          tenant: req.tenant,
          amount: 0,
          plan,
        }),
      ]);
      return res.json({
        message: `Plan ${plan} activated and card saved`,
        paymentMethodId,
      });
    }

    // if plans has a priceId --> create subscription
    // enterprise plan

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
        metadata: {
          plan, // <-- save the intended plan
          tenantId: req.tenant._id.toString(),
        },
      });

      // req.tenant.subscription.checkoutSessionId = session.id;
      // await req.tenant.save();

      // saving the checkout session id before charging may create condusion
      // it might create subscription without charging money
      // so only min info is saved

      req.tenant.subscription = {
        ...(req.tenant.subscription || {}),
        stripeCustomerId: customerId,
      };

      return res.json({
        message: `Enterprise plan one-time payment session created`,
        checkoutUrl: session.url,
      });
    }
    // recurring sub pro

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      default_payment_method: paymentMethodId,
      expand: ["latest_invoice.payment_intent"],
      metadata: {
        plan, // <-- save the intended plan
        tenantId: req.tenant._id.toString(),
      },
    });
    // update tenant subscription info
    req.tenant.subscription = {
      ...(req.tenant.subscription || {}),
      plan,
      status: "incomplete",
      stripeSubscriptionId: subscription.id,
      defaultPaymentMethod: paymentMethodId,
    };

    //  Save tenant after updating subscription
    await req.tenant.save();

    return res.json({
      message: `${plan} subscription created, waiting for the payment confirmation via webhook`,
      subscriptionId: subscription.id,
      subscription,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "subscription failed", err: error.message });
  }
};

const stripeSuccess = async (req, res) => {
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

      await NotificationService.notify("subscription_invoice", {
        tenant,
        amount: amountPaid,
      });

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
      await NotificationService.notify("subscription_invoice", {
        tenant,
        amount: amountPaid,
      });

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
};

const stripeCancelSubscription = async (req, res) => {
  try {
    const tenant = req.tenant;
    // (await Tenant.findById(req.tenant.tenantId)) ||
    // (await Tenant.findOne({
    //   "subscription.checkoutSessionId": subscription.id,
    // }));

    if (!tenant || !tenant.subscription) {
      return res
        .status(404)
        .json({ message: "Tenant or subscription not found" });
    }

    const { plan, stripeSubscriptionId, checkoutSessionId } =
      tenant.subscription;
    if (plan === "Enterprise") {
      if (!checkoutSessionId) {
        return res.json({
          message: "checkout session not stored for Enterprise plan",
        });
      }
      const session = await stripe.checkout.sessions.retrieve(
        checkoutSessionId
      );
      const paymentIntentId = session.payment_intent;

      if (!paymentIntentId) {
        return res.json({
          message: "Payment intent not found for Enterprise plan",
        });
      }

      // Create refund
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
      });

      // Update your DB here
      tenant.subscription.status = "canceled";
      tenant.subscription.lastRefund = {
        refundId: refund.id,
        amount: refund.amount,
        refundedAt: new Date(),
      };
      await tenant.save();
      // Send cancellation email immediately
      await NotificationService.notify("subscription_cancelled", {
        tenant,
        plan,
        refundAmount: refund.amount,
        refundId: refund.id,
      });

      return res.json({
        message:
          "Enterprise payment cancel request received. Refund will be handled via Stripe payment_intent or webhook.",
      });
    }
    if (!stripeSubscriptionId) {
      return res
        .status(400)
        .json({ message: "No active subscription to cancel" });
    }
    try {
      const subscription = await stripe.subscriptions.retrieve(
        stripeSubscriptionId
      );
      console.log("Subscription exists:", subscription);
      if (subscription.status === "canceled") {
        console.log("Subscription already canceled, skipping cancel call.");
        return res.json({
          message: `${tenant.subscription.plan} subscription is already canceled.`,
        });
      }
    } catch (err) {
      console.error("Failed to retrieve subscription:", err);
      return res.status(500).json({
        message: "Failed to retrieve subscription",
        error: err.message,
      });
    }

    // Cancel subscription in Stripe ( Pro)
    await stripe.subscriptions.cancel(stripeSubscriptionId); // ⚠️ this triggers customer.subscription.deleted webhook

    return res.json({
      message: `${plan} subscription cancel request sent. Stripe webhook will handle DB updates and refund.`,
    });
  } catch (err) {
    console.error("Cancel failed:", err);
    res.status(500).json({ message: "Cancel failed", error: err.message });
  }
};

const stripeCheckSubscription = async (req, res) => {
  try {
    const dbSub = req.tenant?.subscription || null;

    // ─────────────────────────────────────────────
    // DB existence
    // ─────────────────────────────────────────────
    const dbExists = !!dbSub && ["active", "trialing"].includes(dbSub.status);

    let dbStatus = dbSub?.status || "none";
    let plan = dbSub?.plan || "Free";
    let stripeSubscriptionId = dbSub?.stripeSubscriptionId || null;
    let currentPeriodEnd = dbSub?.currentPeriodEnd || null;

    if (dbSub) {
      dbStatus = dbSub.status || "unknown";
      plan = dbSub.plan || "unknown";
      stripeSubscriptionId = dbSub.stripeSubscriptionId || null;
      currentPeriodEnd = dbSub.currentPeriodEnd || null;
    }

    // ─────────────────────────────────────────────
    // Stripe existence
    // ─────────────────────────────────────────────
    let stripeExists = false;
    let stripeStatus = "none";

    if (stripeSubscriptionId) {
      try {
        const stripeSub = await stripe.subscriptions.retrieve(
          stripeSubscriptionId
        );
        stripeStatus = stripeSub.status;
        stripeExists = ["active", "trialing"].includes(stripeSub.status);
      } catch (err) {
        // 404 = does not exist in Stripe
        if (err.code === "resource_missing") {
          stripeExists = false;
          stripeStatus = "not_found";
        } else {
          throw err; // real error
        }
      }
    }

    // ─────────────────────────────────────────────
    // Logging (truth)
    // ─────────────────────────────────────────────
    console.log("DB → exists:", dbExists, "status:", dbStatus);
    console.log("Stripe → exists:", stripeExists, "status:", stripeStatus);

    // ─────────────────────────────────────────────
    // Expired (DB-based date)
    // ─────────────────────────────────────────────
    const now = new Date();
    if (currentPeriodEnd && new Date(currentPeriodEnd) < now) {
      return res.status(200).json({
        dbExists,
        stripeExists,
        plan,
        dbStatus,
        stripeStatus,
        currentPeriodEnd,
        reason: "SUBSCRIPTION_EXPIRED",
      });
    }

    // ─────────────────────────────────────────────
    // Inactive entitlement
    // ─────────────────────────────────────────────
    if (
      !dbExists ||
      !stripeExists ||
      !["active", "trialing"].includes(stripeStatus)
    ) {
      return res.status(200).json({
        dbExists,
        stripeExists,
        plan,
        dbStatus,
        stripeStatus,
        reason: "SUBSCRIPTION_INACTIVE",
      });
    }

    // ─────────────────────────────────────────────
    // Fully valid
    // ─────────────────────────────────────────────
    return res.status(200).json({
      dbExists,
      stripeExists,
      plan,
      dbStatus,
      stripeStatus,
      currentPeriodEnd,
      stripeSubscriptionId,
    });
  } catch (err) {
    console.error("check-subscription failed:", err);
    return res.status(500).json({
      dbExists: false,
      stripeExists: false,
      message: "Unable to verify subscription status",
    });
  }
};

module.exports = {
  stripeSubscription: asyncHandler(stripeSubscription),
  stripeSuccess: asyncHandler(stripeSuccess),
  stripeCancelSubscription: asyncHandler(stripeCancelSubscription),
  stripeCheckSubscription: asyncHandler(stripeCheckSubscription),
};
