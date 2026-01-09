jest.mock("../../config/stripe", () => ({
  webhooks: { constructEvent: jest.fn() },
  paymentIntents: { retrieve: jest.fn() },
  subscriptions: { retrieve: jest.fn() },
}));

jest.mock("../../middlewares/cache", () => ({
  cacheMiddleware: jest.fn(() => (req, res, next) => next()),
  invalidateCache: jest.fn(() => Promise.resolve(true)),
}));
jest.mock(
  "../../middlewares/controllerLogger",
  () => (controller, action) => controller
);
jest.mock("../../controllers/activityLogger", () => ({
  track: jest.fn().mockResolvedValue(true),
}));

jest.mock("../../utils/checkEmailExists", () => jest.fn());
jest.mock("../../utils/htmltemplates/sendEmail", () =>
  jest.fn().mockResolvedValue(true)
);
jest.mock("../../utils/notificationService", () => ({
  notify: jest.fn().mockResolvedValue(true),
}));
jest.mock("../../utils/stripeEmail", () => ({
  sendInvoiceEmail: jest.fn().mockResolvedValue(true),
}));

jest.mock("../../middlewares/stripeHandlers", () => ({
  doRefundIfNeeded: jest.fn().mockResolvedValue({
    refundAmount: 1000,
    refundId: "refund_123",
  }),
}));

const request = require("supertest");
const app = require("../../app");
const Tenant = require("../../models/Tenant");
const NotificationService = require("../../utils/notificationService");
const stripe = require("../../config/stripe");
const activityLogger = require("../../controllers/activityLogger");
const { sendInvoiceEmail } = require("../../utils/stripeEmail.js");
const { doRefundIfNeeded } = require("../../middlewares/stripeHandlers.js");

describe("Stripe Webhook Handler", () => {
  let tenant;

  beforeEach(async () => {
    jest.clearAllMocks();
    await Tenant.deleteMany({});
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(Tenant, "findOne").mockResolvedValue(tenant);
    jest.spyOn(Tenant, "findById").mockResolvedValue(tenant);

    tenant = await Tenant.create({
      name: "TestTenant",
      email: "tenant@test.com",
      subscription: {
        stripeCustomerId: "cus_test123",
        plan: "Free", // default plan
        status: "active",
        amountPaid: 0,
      },
    });
  });
  afterAll(() => {
    console.error.mockRestore();
  });

  // signature verfication
  it("rejects webhook with invalid signature", async () => {
    stripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error("invalid signature");
    });

    const res = await request(app)
      .post("/billing/webhook/webhook")
      .set("stripe-signature", "fake-signature")
      .set("Content-Type", "application/json") // ✅ important
      .send(Buffer.from("{}"));

    expect(res.status).toBe(400);
    expect(res.text).toContain("Webhook Error: invalid signature");
  });

  it("accepts webhook with valid signature", async () => {
    const mockTenant = {
      subscription: {},
      save: jest.fn().mockResolvedValue(true),
      email: "tenant@example.com",
    };
    stripe.webhooks.constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          mode: "payment",
          customer: "cus_123",
          id: "sess_123",
          payment_intent: "pi_123",
          metadata: { plan: "Pro" },
        },
      },
    });

    Tenant.findOne = jest.fn().mockResolvedValue(mockTenant);
    stripe.paymentIntents.retrieve.mockResolvedValue({ amount_received: 100 });
    NotificationService.notify.mockResolvedValue(true);

    const res = await request(app)
      .post("/billing/webhook/webhook")
      .set("stripe-signature", "valid-signature")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({}));
    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
    expect(mockTenant.subscription.plan).toBe("Pro");
    expect(mockTenant.save).toHaveBeenCalled();
  });

  // Success path: checkout.session.completed payment
  it("processes checkout.session.completed (payment) correctly", async () => {
    const mockTenant = {
      subscription: {},
      save: jest.fn().mockResolvedValue(true),
      email: "tenant@example.com",
    };
    stripe.webhooks.constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          mode: "payment",
          customer: "cus_123",
          id: "sess_123",
          payment_intent: "pi_123",
          metadata: { plan: "Pro" },
        },
      },
    });

    Tenant.findOne = jest.fn().mockResolvedValue(mockTenant);
    stripe.paymentIntents.retrieve.mockResolvedValue({ amount_received: 100 });
    NotificationService.notify.mockResolvedValue(true);

    const res = await request(app)
      .post("/billing/webhook/webhook")
      .set("stripe-signature", "valid-signature")
      .set("Content-Type", "application/json")
      .send(Buffer.from(JSON.stringify(mockTenant)));
    const updatedTenant = await Tenant.findOne({ _id: tenant._id });
    expect(res.status).toBe(200);
    expect(updatedTenant.subscription.plan).toBe("Pro");
    expect(updatedTenant.subscription.stripePaymentIntentId).toBe("pi_123");
    expect(NotificationService.notify).toHaveBeenCalledWith(
      "subscription_invoice",
      expect.any(Object)
    );
    jest.clearAllMocks();
  });

  // Failure path: internal error or invalid payload
  it("handles internal error gracefully", async () => {
    const fakeEvent = {
      type: "checkout.session.completed",
      data: { object: null },
    };
    stripe.webhooks.constructEvent.mockReturnValue(fakeEvent);
    activityLogger.track.mockResolvedValue(true);

    // Force a DB error by mocking Tenant.findOne
    jest.spyOn(Tenant, "findOne").mockImplementation(() => {
      throw new Error("DB failure");
    });

    const res = await request(app)
      .post("/billing/webhook/webhook")
      .set("stripe-signature", "valid-signature")
      .send(JSON.stringify({}));

    expect(res.status).toBe(200); // still returns 200 to Stripe
    expect(activityLogger.track).toHaveBeenCalledWith(
      expect.objectContaining({
        extra: expect.objectContaining({
          error: "Cannot read properties of null (reading 'mode')",
        }),
      })
    );
  });

  //    invoice.payment_succeeded
  it("processes invoice.payment_succeeded event", async () => {
    const fakeEvent = {
      type: "invoice.payment_succeeded",
      data: {
        object: {
          id: "inv_456",
          subscription: "sub_123",
          amount_paid: 7000,
          payment_intent: "pi_456",
          lines: {
            data: [{ period: { end: Math.floor(Date.now() / 1000) } }],
          },
        },
      },
    };

    stripe.webhooks.constructEvent.mockReturnValue(fakeEvent);

    stripe.subscriptions.retrieve.mockResolvedValue({
      metadata: {
        tenantId: tenant._id.toString(),
        plan: "Pro",
      },
    });
    const mockTenant = {
      ...tenant.toObject(),
      subscription: { ...tenant.subscription },
      save: jest.fn().mockResolvedValue(true),
    };

    jest.spyOn(Tenant, "findById").mockResolvedValue(mockTenant);

    NotificationService.notify.mockResolvedValue(true);

    await Tenant.findByIdAndUpdate(tenant._id, {
      $unset: { "subscription.lastInvoiceIdSent": "" },
    });

    const res = await request(app)
      .post("/billing/webhook/webhook")
      .set("stripe-signature", "valid-signature")
      .set("Content-Type", "application/json")
      .send(Buffer.from(JSON.stringify(fakeEvent))); // ✅ raw buffer like Stripe
    const updatedTenant = await Tenant.findById(tenant._id);
    expect(res.status).toBe(200);
    expect(updatedTenant.subscription.amountPaid).toBe(7000);
    expect(jest.isMockFunction(NotificationService.notify)).toBe(true);
    expect(NotificationService.notify).toHaveBeenCalledWith(
      "subscription_invoice",
      expect.any(Object)
    );
  });
  it("processes invoice.payment_failed event", async () => {
    const fakeEvent = {
      type: "invoice.payment_failed",
      data: {
        object: {
          id: "inv_failed_123",
          subscription: "sub_failed_123",
        },
      },
    };

    stripe.webhooks.constructEvent.mockReturnValue(fakeEvent);

    const mockTenant = {
      subscription: { status: "active", plan: "Pro" },
      email: "tenant@example.com",
      save: jest.fn().mockResolvedValue(true),
    };

    jest.spyOn(Tenant, "findOne").mockResolvedValue(mockTenant);
    const sendInvoiceEmail =
      require("../../utils/stripeEmail").sendInvoiceEmail;

    sendInvoiceEmail.mockResolvedValue(true);

    const res = await request(app)
      .post("/billing/webhook/webhook")
      .set("stripe-signature", "valid-signature")
      .set("Content-Type", "application/json")
      .send(Buffer.from(JSON.stringify(fakeEvent)));

    expect(res.status).toBe(200);
    expect(mockTenant.subscription.status).toBe("past_due");
    expect(sendInvoiceEmail).toHaveBeenCalled();
  });

  it("processes customer.subscription.deleted (cancellation) event", async () => {
    const fakeEvent = {
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_deleted_123",
          status: "canceled",
        },
      },
    };

    stripe.webhooks.constructEvent.mockReturnValue(fakeEvent);

    const mockTenant = {
      subscription: { status: "active", plan: "Pro" },
      save: jest.fn().mockResolvedValue(true),
    };

    jest.spyOn(Tenant, "findOne").mockResolvedValue(mockTenant);
    const doRefundIfNeeded =
      require("../../middlewares/stripeHandlers").doRefundIfNeeded;
    doRefundIfNeeded.mockResolvedValue({
      refundAmount: 1000,
      refundId: "refund_123",
    });
    NotificationService.notify.mockResolvedValue(true);

    const res = await request(app)
      .post("/billing/webhook/webhook")
      .set("stripe-signature", "valid-signature")
      .set("Content-Type", "application/json")
      .send(Buffer.from(JSON.stringify(fakeEvent)));

    expect(res.status).toBe(200);
    expect(mockTenant.subscription.status).toBe("canceled");
    expect(mockTenant.subscription.lastRefund.refundId).toBe("refund_123");
    expect(NotificationService.notify).toHaveBeenCalledWith(
      "subscription_cancelled",
      expect.objectContaining({ refundId: "refund_123" })
    );
  });

  it("processes charge.refunded event", async () => {
    const fakeEvent = {
      type: "charge.refunded",
      data: {
        object: {
          id: "ch_123",
          customer: "cus_test123",
          refunds: { data: [{ id: "re_123", amount: 500 }] },
        },
      },
    };

    stripe.webhooks.constructEvent.mockReturnValue(fakeEvent);

    const mockTenant = {
      subscription: { lastRefund: null, plan: "Pro" },
      save: jest.fn().mockResolvedValue(true),
    };

    jest.spyOn(Tenant, "findOne").mockResolvedValue(mockTenant);

    const res = await request(app)
      .post("/billing/webhook/webhook")
      .set("stripe-signature", "valid-signature")
      .set("Content-Type", "application/json")
      .send(Buffer.from(JSON.stringify(fakeEvent)));

    expect(res.status).toBe(200);
    expect(mockTenant.subscription.lastRefund.refundId).toBe("re_123");
    expect(mockTenant.subscription.lastRefund.amount).toBe(500);
  });
});
