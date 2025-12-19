const stripe = require("../utils/stripe.js");
const { sendInvoiceEmail } = require("../utils/stripeEmail.js");
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

module.exports = { doRefundIfNeeded, sendCancellationEmail, sendInvoice };
