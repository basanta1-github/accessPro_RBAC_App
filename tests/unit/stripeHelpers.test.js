// tests/unit/stripeHelpers.test.js
// process.env.STRIPE_SECRET_KEY = "sk_test_fakeKey";

jest.mock("../../config/stripe", () => ({
  refunds: { list: jest.fn(), create: jest.fn() },
  paymentIntents: { retrieve: jest.fn() },
  charges: { list: jest.fn() },
}));
jest.mock("../../utils/stripeEmail", () => ({
  sendInvoiceEmail: jest.fn(),
}));
const {
  doRefundIfNeeded,
  sendInvoice,
  sendCancellationEmail,
} = require("../../middlewares/stripeHandlers");
const stripe = require("../../config/stripe");
const { sendInvoiceEmail } = require("../../utils/stripeEmail");

describe("Stripe Helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("sendInvoice", () => {
    it("should send invoice email with correct content", async () => {
      const tenant = {
        name: "Tenant A",
        email: "tenant@example.com",
        subscription: { plan: "Pro" },
      };
      await sendInvoice(tenant, 5000);

      expect(sendInvoiceEmail).toHaveBeenCalledTimes(1);
      expect(sendInvoiceEmail).toHaveBeenCalledWith(
        "tenant@example.com",
        "Your Subscription Invoice",
        expect.stringContaining("Tenant A")
      );
    });

    it("should default plan to N/A if missing", async () => {
      const tenant = { name: "Tenant B", email: "tenantb@example.com" };
      await sendInvoice(tenant, 2000);

      expect(sendInvoiceEmail).toHaveBeenCalledWith(
        "tenantb@example.com",
        "Your Subscription Invoice",
        expect.stringContaining("N/A")
      );
    });
  });

  describe("sendCancellationEmail", () => {
    it("should include refund amount if provided", async () => {
      const tenant = { name: "Tenant C", email: "tenantc@example.com" };
      await sendCancellationEmail(tenant, "Pro", 1500, "refund123");

      expect(sendInvoiceEmail).toHaveBeenCalledWith(
        "tenantc@example.com",
        "Subscription Cancelled and Refunded",
        expect.stringContaining("refund123")
      );
    });

    it("should show no refund if amount is 0", async () => {
      const tenant = { name: "Tenant D", email: "tenantd@example.com" };
      await sendCancellationEmail(tenant, "Free");

      expect(sendInvoiceEmail).toHaveBeenCalledWith(
        "tenantd@example.com",
        "Subscription Cancelled and Refunded",
        expect.stringContaining("No refund was issued")
      );
    });
  });

  describe("doRefundIfNeeded", () => {
    it("should return already refunded if lastRefund exists", async () => {
      const tenant = {
        subscription: {
          lastRefund: { refundId: "abc", amount: 5000 },
          plan: "Pro",
        },
      };
      const result = await doRefundIfNeeded(tenant);

      expect(result).toEqual({
        refundAmount: 5000,
        refundId: "abc",
        alreadyRefunded: true,
      });
    });

    it("should refund Enterprise subscription fully if within 30 days", async () => {
      const tenant = {
        subscription: {
          plan: "Enterprise",
          stripePaymentIntentId: "pi_123",
          stripeCustomerId: "cus_123",
          currentPeriodStart: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        },
      };

      stripe.refunds.list.mockResolvedValue({ data: [] });
      stripe.paymentIntents.retrieve.mockResolvedValue({ amount: 10000 });
      stripe.refunds.create.mockResolvedValue({ id: "refund_1" });

      const result = await doRefundIfNeeded(tenant);

      expect(stripe.refunds.create).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 10000 })
      );
      expect(result).toEqual({
        refundAmount: 10000,
        refundId: "refund_1",
        alreadyRefunded: false,
      });
    });

    it("should not refund Enterprise subscription if already refunded in Stripe", async () => {
      const tenant = {
        subscription: {
          plan: "Enterprise",
          stripePaymentIntentId: "pi_123",
          stripeCustomerId: "cus_123",
        },
      };
      stripe.refunds.list.mockResolvedValue({
        data: [{ id: "refund_existing", amount: 5000 }],
      });

      const result = await doRefundIfNeeded(tenant);

      expect(result).toEqual({
        refundAmount: 5000,
        refundId: "refund_existing",
        alreadyRefunded: true,
      });
    });

    it("should refund Pro subscription only if within 30 days", async () => {
      const tenant = {
        subscription: {
          plan: "Pro",
          stripeSubscriptionId: "sub_123",
          stripeCustomerId: "cus_123",
          currentPeriodStart: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        },
      };
      stripe.charges.list.mockResolvedValue({
        data: [{ id: "charge_1", amount: 8000 }],
      });
      stripe.refunds.create.mockResolvedValue({ id: "refund_2" });

      const result = await doRefundIfNeeded(tenant);

      expect(stripe.refunds.create).toHaveBeenCalledWith(
        expect.objectContaining({ charge: "charge_1", amount: 8000 })
      );
      expect(result).toEqual({
        refundAmount: 8000,
        refundId: "refund_2",
        alreadyRefunded: false,
        message: "Refund issued",
      });
    });

    it("should skip refund for Pro subscription if more than 30 days", async () => {
      const tenant = {
        subscription: {
          plan: "Pro",
          stripeSubscriptionId: "sub_123",
          stripeCustomerId: "cus_123",
          currentPeriodStart: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), // 40 days ago
        },
      };
      stripe.charges.list.mockResolvedValue({
        data: [{ id: "charge_1", amount: 8000 }],
      });

      const result = await doRefundIfNeeded(tenant);

      expect(result).toEqual({
        refundAmount: 0,
        refundId: null,
        alreadyRefunded: false,
        message: "No refund needed",
      });
    });

    it("should handle Free or unknown plans with no refund", async () => {
      const tenant = { subscription: { plan: "Free" } };
      const result = await doRefundIfNeeded(tenant);

      expect(result).toEqual({
        refundAmount: 0,
        refundId: null,
        alreadyRefunded: false,
        message: "No refund needed for other cases",
      });
    });

    it("should throw error if Stripe fails", async () => {
      const tenant = {
        subscription: { plan: "Enterprise", stripePaymentIntentId: "pi_fail" },
      };
      stripe.refunds.list.mockRejectedValue(new Error("Stripe down"));

      await expect(doRefundIfNeeded(tenant)).rejects.toThrow(
        "Refund processing failed: Stripe down"
      );
    });
  });
});
