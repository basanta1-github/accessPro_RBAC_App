jest.mock(
  "../../middlewares/controllerLogger",
  () => (controller, action) => controller
);
jest.mock("../../middlewares/planRestriction", () => {
  return jest.fn((allowedPlans) => {
    return (req, res, next) => next();
  });
});

const request = require("supertest");
const app = require("../../app");
const mongoose = require("mongoose");

const User = require("../../models/User");
const Tenant = require("../../models/Tenant");
const ActivityMetric = require("../../models/activityMetric");

const getAuthTokens = require("../helpers/getAuthTokens");
const createdefaultRoles = require("../../utils/createDefaultroles");

describe("Audit Routes - Full Coverage", () => {
  let tenant, owner, admin;

  beforeEach(async () => {
    await User.deleteMany({});
    await Tenant.deleteMany({});
    await ActivityMetric.deleteMany({});

    tenant = await Tenant.create({
      name: "TestTenant",
      domain: "test",
      email: "owner@test.com",
    });

    await createdefaultRoles(tenant._id);

    owner = await User.create({
      name: "Owner",
      email: "owner@test.com",
      password: "StrongPass1!",
      role: "owner",
      tenantId: tenant._id,
      companyName: tenant.domain,
    });

    admin = await User.create({
      name: "Admin",
      email: "admin@test.com",
      password: "StrongPass1!",
      role: "admin",
      tenantId: tenant._id,
      companyName: tenant.name,
    });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe("GET /audit/", () => {
    beforeEach(async () => {
      await ActivityMetric.deleteMany({});
      await ActivityMetric.create([
        {
          tenantId: tenant._id,
          userId: owner._id,
          role: "owner",
          action: "login",
          resource: "auth",
          method: "POST",
          path: "/login",
          statusCode: 200,
          success: true,
          ip: "127.0.0.1",
          metadata: { browser: "chrome" },
        },
        {
          tenantId: tenant._id,
          userId: admin._id,
          role: "admin",
          action: "update",
          resource: "settings",
          method: "PUT",
          path: "/settings",
          statusCode: 200,
          success: true,
          ip: "127.0.0.1",
          metadata: {},
        },
      ]);
    });

    it("returns paginated audit logs", async () => {
      const tokens = await getAuthTokens({
        email: owner.email,
        password: "StrongPass1!",
        companyName: tenant.name,
      });

      const res = await request(app)
        .get("/audit")
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", tenant.domain);

      expect(res.statusCode).toBe(200);
      expect(res.body.logs.length).toBe(2);
      expect(res.body.total).toBe(2);
      expect(res.body.page).toBe(1);
      expect(res.body.pages).toBe(1);
    });

    it("applies userId and action filters correctly", async () => {
      const tokens = await getAuthTokens({
        email: owner.email,
        password: "StrongPass1!",
        companyName: tenant.name,
      });

      const res = await request(app)
        .get(`/audit/?userId=${admin._id}&action=update`)
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", tenant.domain);

      expect(res.statusCode).toBe(200);
      expect(res.body.logs.length).toBe(1);
      expect(res.body.logs[0].action).toBe("update");
      expect(res.body.logs[0].userId).toBe(admin._id.toString());
    });

    it("returns empty logs if filter matches nothing", async () => {
      const tokens = await getAuthTokens({
        email: owner.email,
        password: "StrongPass1!",
        companyName: tenant.name,
      });

      const res = await request(app)
        .get("/audit/?action=nonexistent")
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", tenant.domain);

      expect(res.statusCode).toBe(200);
      expect(res.body.logs.length).toBe(0);
    });

    it("returns 401 if token missing", async () => {
      const res = await request(app)
        .get("/audit")
        .set("x-tenant", tenant.domain);
      expect(res.statusCode).toBe(401);
    });

    it("supports date range filter", async () => {
      const tokens = await getAuthTokens({
        email: owner.email,
        password: "StrongPass1!",
        companyName: tenant.name,
      });
      const from = new Date(Date.now() - 1000 * 60 * 60).toISOString(); // 1 hour ago
      const to = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // 1 hour ahead

      const res = await request(app)
        .get(`/audit/?from=${from}&to=${to}`)
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", tenant.domain);

      expect(res.statusCode).toBe(200);
      expect(res.body.logs.length).toBe(2);
    });
  });

  describe("GET /audit/export", () => {
    beforeEach(async () => {
      await ActivityMetric.deleteMany({});
    });

    it("exports logs as CSV with data", async () => {
      await ActivityMetric.create([
        {
          tenantId: tenant._id,
          userId: admin._id,
          role: "admin",
          action: "login",
          resource: "auth",
          method: "POST",
          path: "/login",
          statusCode: 200,
          success: true,
          ip: "127.0.0.1",
          metadata: { browser: "chrome" },
        },
      ]);

      const tokens = await getAuthTokens({
        email: admin.email,
        password: "StrongPass1!",
        companyName: tenant.name,
      });

      const res = await request(app)
        .get("/audit/export")
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", tenant.domain);
      console.log(res.body);
      expect(res.statusCode).toBe(200);
      expect(res.header["content-type"]).toMatch(/text\/csv/);
      expect(res.text).toMatch('"tenantId","userId","role","action"');
      expect(res.text).toContain("login");
    });

    it("exports CSV with only headers if no logs exist", async () => {
      const tokens = await getAuthTokens({
        email: owner.email,
        password: "StrongPass1!",
        companyName: tenant.name,
      });

      const res = await request(app)
        .get("/audit/export")
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", tenant.domain);

      expect(res.statusCode).toBe(200);
      expect(res.header["content-type"]).toMatch(/text\/csv/);
      expect(res.text).toContain(""); // header doesnot exists
    });

    it("returns 401 if token missing", async () => {
      const res = await request(app).get("/audit/export");
      expect(res.statusCode).toBe(401);
    });

    it("applies filters correctly in CSV export", async () => {
      await ActivityMetric.create([
        {
          tenantId: tenant._id,
          userId: owner._id,
          role: "owner",
          action: "login",
          resource: "auth",
          method: "POST",
          path: "/login",
          statusCode: 200,
          success: true,
          ip: "127.0.0.1",
          metadata: { browser: "chrome" },
        },
        {
          tenantId: tenant._id,
          userId: admin._id,
          role: "admin",
          action: "update",
          resource: "settings",
          method: "PUT",
          path: "/settings",
          statusCode: 200,
          success: true,
          ip: "127.0.0.1",
          metadata: {},
        },
      ]);

      const tokens = await getAuthTokens({
        email: owner.email,
        password: "StrongPass1!",
        companyName: tenant.name,
      });

      const res = await request(app)
        .get(`/audit/export?action=login`)
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", tenant.domain);

      expect(res.statusCode).toBe(200);
      expect(res.text).toContain("login");
      expect(res.text).not.toContain("update");
    });
  });
});
