jest.mock("../../middlewares/cache", () => ({
  cacheMiddleware: jest.fn(() => (req, res, next) => next()),
  invalidateCache: jest.fn(() => Promise.resolve(true)),
}));
jest.mock(
  "../../middlewares/controllerLogger",
  () => (controller, action) => controller
);

const request = require("supertest");
const app = require("../../app");
const Tenant = require("../../models/Tenant");
const TenantAuditLog = require("../../models/tenantAuditLog");
const User = require("../../models/User");
const Roles = require("../../models/Roles");
const getAuthTokens = require("../helpers/getAuthTokens");
const createDefaultRoles = require("../../utils/createDefaultroles");

describe("Tenant Routes Integration Tests", () => {
  let tenant, owner, admin, employee;

  beforeEach(async () => {
    // Clear collections
    await Tenant.deleteMany({});
    await User.deleteMany({});
    await Roles.deleteMany({});
    await TenantAuditLog.deleteMany({});
    jest.clearAllMocks();

    // Create tenant
    tenant = await Tenant.create({
      name: "TestCompany",
      domain: "testDomain",
      email: "owner@example.com",
      subscriptionPlan: "Free",
      status: "active",
    });

    // Create roles
    await createDefaultRoles(tenant._id);

    // Create users
    owner = await User.create({
      name: "Owner User",
      email: "owner@example.com",
      password: "StrongPass1!",
      role: "owner",
      companyName: tenant.name,
      tenantId: tenant._id,
    });

    admin = await User.create({
      name: "Admin User",
      email: "admin@example.com",
      password: "StrongPass1!",
      role: "admin",
      companyName: tenant.name,
      tenantId: tenant._id,
    });

    employee = await User.create({
      name: "Employee User",
      email: "employee@example.com",
      password: "StrongPass1!",
      role: "employee",
      companyName: tenant.name,
      tenantId: tenant._id,
    });
  });

  describe("GET /tenants", () => {
    it("should get all tenants", async () => {
      const res = await request(app).get("/tenants");
      expect(res.statusCode).toBe(200);
      expect(res.body.tenants).toHaveLength(1);
      expect(res.body.tenants[0].name).toBe("TestCompany");
    });
  });

  describe("GET /tenants/:id", () => {
    it("owner can get their tenant", async () => {
      const tokens = await getAuthTokens({
        email: owner.email,
        password: "StrongPass1!",
        companyName: tenant.name,
      });

      const res = await request(app)
        .get(`/tenants/${tenant._id}`)
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", tenant.domain);

      expect(res.statusCode).toBe(200);
      expect(res.body.tenant.name).toBe("TestCompany");
    });
    it("admin can get their tenant", async () => {
      const tokens = await getAuthTokens({
        email: admin.email,
        password: "StrongPass1!",
        companyName: tenant.name,
      });

      const res = await request(app)
        .get(`/tenants/${tenant._id}`)
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", tenant.domain);

      expect(res.statusCode).toBe(200);
      expect(res.body.tenant.name).toBe("TestCompany");
    });
    it("employees cannot get the tenant", async () => {
      const tokens = await getAuthTokens({
        email: employee.email,
        password: "StrongPass1!",
        companyName: tenant.name,
      });

      const res = await request(app)
        .get(`/tenants/${tenant._id}`)
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", tenant.domain);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe("access denied");
    });
    it("cannot get tenant if not same tenantId", async () => {
      const otherTenant = await Tenant.create({
        name: "OtherTenant",
        domain: "otherDomain",
        email: "other@example.com",
      });

      const tokens = await getAuthTokens({
        email: owner.email,
        password: "StrongPass1!",
        companyName: tenant.name,
      });

      const res = await request(app)
        .get(`/tenants/${otherTenant._id}`)
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", tenant.domain);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toMatch(/access denied/i);
    });
    it("separate tenants user  cannot access", async () => {
      const tokens = await getAuthTokens({
        email: owner.email,
        password: "StrongPass1!",
        companyName: tenant.name,
      });
      const separatetenant = await Tenant.create({
        name: "separateTestCompany",
        domain: "separatetestDomain",
        email: "separate@example.com",
      });
      const otherTenant = await Tenant.create({
        name: "OtherTenant",
        domain: "otherDomain",
        email: "other@example.com",
      });

      const res = await request(app)
        .get(`/tenants/${otherTenant._id}`)
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", separatetenant.domain);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toMatch(/Cross-tenant access/i);
    });
  });

  describe("PUT /tenants/:id/update", () => {
    it("owner can update tenant details", async () => {
      const tokens = await getAuthTokens({
        email: owner.email,
        password: "StrongPass1!",
        companyName: tenant.name,
      });

      const res = await request(app)
        .put(`/tenants/${tenant._id}/update`)
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", tenant.domain)
        .send({ name: "UpdatedCompany" });

      expect(res.statusCode).toBe(200);
      expect(res.body.tenant.name).toBe("UpdatedCompany");

      const audit = await TenantAuditLog.findOne({ tenantId: tenant._id });
      expect(audit).toBeDefined();
      expect(audit.action).toBe("update");
    });
    it("admin can update tenant details", async () => {
      const tokens = await getAuthTokens({
        email: admin.email,
        password: "StrongPass1!",
        companyName: tenant.name,
      });

      const res = await request(app)
        .put(`/tenants/${tenant._id}/update`)
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", tenant.domain)
        .send({ name: "UpdatedCompany" });

      expect(res.statusCode).toBe(200);
      expect(res.body.tenant.name).toBe("UpdatedCompany");

      const audit = await TenantAuditLog.findOne({ tenantId: tenant._id });
      expect(audit).toBeDefined();
      expect(audit.action).toBe("update");
    });

    it("employee cannot update tenant", async () => {
      const tokens = await getAuthTokens({
        email: employee.email,
        password: "StrongPass1!",
        companyName: tenant.name,
      });

      const res = await request(app)
        .put(`/tenants/${tenant._id}/update`)
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", tenant.domain)
        .send({ name: "ShouldFail" });

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toMatch(/denied/i);
    });
    it("separate tenants user  cannot access", async () => {
      const tokens = await getAuthTokens({
        email: owner.email,
        password: "StrongPass1!",
        companyName: tenant.name,
      });
      const separatetenant = await Tenant.create({
        name: "separateTestCompany",
        domain: "separatetestDomain",
        email: "separate@example.com",
      });

      const res = await request(app)
        .put(`/tenants/${tenant._id}/update`)
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", separatetenant.domain)
        .send({ name: "UpdatedCompany" });

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toMatch(/Cross-tenant access/i);
    });

    it("cannot update tenant if tenantId mismatch", async () => {
      const otherTenant = await Tenant.create({
        name: "OtherTenant",
        domain: "otherDomain",
        email: "other@example.com",
      });

      const tokens = await getAuthTokens({
        email: owner.email,
        password: "StrongPass1!",
        companyName: tenant.name,
      });

      const res = await request(app)
        .put(`/tenants/${otherTenant._id}/update`)
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", tenant.domain)
        .send({ name: "ShouldFail" });

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toMatch(/access denied/i);
    });
  });

  describe("PUT /tenants/:id/deactive", () => {
    it("owner can deactivate tenant", async () => {
      const tokens = await getAuthTokens({
        email: owner.email,
        password: "StrongPass1!",
        companyName: tenant.name,
      });
      const res = await request(app)
        .put(`/tenants/${tenant._id}/deactive`)
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", tenant.domain);
      expect(res.statusCode).toBe(200);
      expect(res.body.tenant.status).toBe("inactive");
      const audit = await TenantAuditLog.findOne({ tenantId: tenant._id });
      expect(audit).toBeDefined();
      expect(audit.action).toBe("deactive");
    });
    it("admin can deactivate tenant", async () => {
      const tokens = await getAuthTokens({
        email: admin.email,
        password: "StrongPass1!",
        companyName: tenant.name,
      });
      const res = await request(app)
        .put(`/tenants/${tenant._id}/deactive`)
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", tenant.domain);
      expect(res.statusCode).toBe(200);
      expect(res.body.tenant.status).toBe("inactive");
      const audit = await TenantAuditLog.findOne({ tenantId: tenant._id });
      expect(audit).toBeDefined();
      expect(audit.action).toBe("deactive");
    });
    it("employee cannot deactivate tenant", async () => {
      const tokens = await getAuthTokens({
        email: employee.email,
        password: "StrongPass1!",
        companyName: tenant.name,
      });
      const res = await request(app)
        .put(`/tenants/${tenant._id}/deactive`)
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", tenant.domain);
      expect(res.statusCode).toBe(403);
      expect(res.body.message).toMatch(/access denied/i);
    });
    it("separate tenants user  cannot access", async () => {
      const tokens = await getAuthTokens({
        email: owner.email,
        password: "StrongPass1!",
        companyName: tenant.name,
      });
      const separatetenant = await Tenant.create({
        name: "separateTestCompany",
        domain: "separatetestDomain",
        email: "separate@example.com",
      });

      const res = await request(app)
        .put(`/tenants/${tenant._id}/update`)
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", separatetenant.domain)
        .send({ name: "UpdatedCompany" });

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toMatch(/Cross-tenant access/i);
    });
  });
});
