const sendInviteEmail = require("./htmltemplates/sendEmail.js");
const sendPasswordResetEmail = require("./htmltemplates/sendPasswordResetEmail.js");
const {
  sendInvoice,
  sendCancellationEmail,
} = require("../middlewares/stripeHandlers.js");

class NotificationService {
  static async notify(eventType, payload) {
    // Log every time notify is called

    try {
      switch (eventType) {
        // email events
        case "invite":
          await sendInviteEmail(
            payload.email,
            payload.token,
            payload.tenantName
          );
          return;

        case "password_reset":
          await sendPasswordResetEmail(payload.user, payload.resetLink);
          return;

        case "subscription_invoice":
          await sendInvoice(payload.tenant, payload.amount);
          return;
        case "plan_activated":
          await sendInvoice(payload.tenant, payload.amount);
          return;

        case "subscription_cancelled":
          await sendCancellationEmail(
            payload.tenant,
            payload.plan,
            payload.refundAmount,
            //payload.redund.amount
            //payload.redund.id
            payload.refundId
          );
          return;
        // webhook.system events
        case "webhook_event":
          // optional logging or webhook forwarding
          console.log("Webhook event notification", payload);
          return;

        // pure push notification events
        case "push":
          // future in-app/mobile notification integration
          console.log("Push notification triggered", payload);
          return;

        default:
          console.warn("Unknown notification event:", eventType, payload);
      }
    } catch (err) {
      console.error("NotificationService error:", eventType, err);
    }
  }
}

module.exports = NotificationService;
