jest.mock(
  "../../middlewares/controllerLogger",
  () => (controller, action) => controller
);
jest.mock("../../middlewares/cache", () => ({
  cacheMiddleware: jest.fn(() => (req, res, next) => next()),
  invalidateCache: jest.fn(() => Promise.resolve(true)),
}));
jest.mock("../../utils/createDefaultroles", () =>
  jest.fn().mockResolvedValue(true)
);

const request = require("supertest");
const app = require("../../app");
const mongoose = require("mongoose");

const User = require("../../models/User");
const Tenant = require("../../models/Tenant");
const createDefaultRoles = require("../../utils/createDefaultroles");

const getAuthTokens = require("../helpers/getAuthTokens");

describe("POST /admin/sync-roles", () => {
  let tenant1, tenant2, owner, admin;

  beforeEach(async () => {
    await User.deleteMany({});
    await Tenant.deleteMany({});

    tenant1 = await Tenant.create({
      name: "Company One",
      domain: "company1",
      email: "owner1@test.com",
    });

    tenant2 = await Tenant.create({
      name: "Company Two",
      domain: "company2",
      email: "owner2@test.com",
    });

    owner = await User.create({
      name: "Owner",
      email: "owner1@test.com",
      password: "StrongPass1!",
      role: "owner",
      tenantId: tenant1._id,
      companyName: tenant1.name,
    });

    admin = await User.create({
      name: "Admin",
      email: "admin@test.com",
      password: "StrongPass1!",
      role: "admin",
      tenantId: tenant1._id,
      companyName: tenant1.name,
    });
  });

  it("allows owner to sync roles for all tenants", async () => {
    const tokens = await getAuthTokens({
      email: owner.email,
      password: "StrongPass1!",
      companyName: owner.companyName,
    });

    const res = await request(app)
      .post("/api/admin/sync-roles")
      .set("Authorization", `Bearer ${tokens.accessToken}`);
    console.log(res.body);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Roles synced successfully");

    // called once per tenant
    expect(createDefaultRoles).toHaveBeenCalledTimes(2);
    expect(createDefaultRoles).toHaveBeenCalledWith(tenant1._id);
    expect(createDefaultRoles).toHaveBeenCalledWith(tenant2._id);
  });
  it("rejects admin user", async () => {
    const tokens = await getAuthTokens({
      email: admin.email,
      password: "StrongPass1!",
      companyName: admin.companyName,
    });

    const res = await request(app)
      .post("/api/admin/sync-roles")
      .set("Authorization", `Bearer ${tokens.accessToken}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toMatch(/not authorized/i);

    expect(createDefaultRoles).not.toHaveBeenCalled();
  });
});
