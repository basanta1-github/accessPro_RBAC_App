const request = require("supertest");
const express = require("express");
const app = require("../../app");
const Tenant = require("../../models/Tenant");
const User = require("../../models/User");
const Roles = require("../../models/Roles");
const { generateAccessToken } = require("../../utils/generateTokens");

// Mock protect middleware to always attach req.user
jest.mock("../../middlewares/authentication", () => {
  return jest.fn((req, res, next) => {
    req.user = req.headers["mock-user"]
      ? JSON.parse(req.headers["mock-user"])
      : null;
    next();
  });
});

describe("Attach Tenant Middleware", () => {
  let tenant, user, role, token;

  beforeEach(async () => {
    await Tenant.deleteMany({});
    await User.deleteMany({});
    await Roles.deleteMany({});

    tenant = await Tenant.create({
      name: "Tenant A",
      domain: "tenant-a",
      email: "admin@tenanta.com",
    });

    role = await Roles.create({
      name: "owner",
      tenantId: tenant._id,
      permissions: ["tenant:view", "tenant:update"],
    });

    user = await User.create({
      name: "Owner User",
      email: "owner@test.com",
      password: "Password123",
      role: "owner",
      tenantId: tenant._id,
      companyName: tenant.name,
    });

    token = generateAccessToken(user, role.permissions);
  });

  it("allows access when tenant matches", async () => {
    const res = await request(app)
      .get("/api/tenant-check")
      .set("x-tenant", tenant.domain)
      .set("mock-user", JSON.stringify({ tenantId: tenant._id })); // mock user

    expect(res.statusCode).toBe(200);
    expect(res.body.tenant).toBe(tenant.domain);
  });

  it("blocks cross-tenant access", async () => {
    const otherTenant = await Tenant.create({
      name: "Tenant B",
      domain: "tenantb",
      email: "admin@tenantb.com",
    });

    const res = await request(app)
      .get("/api/tenant-check")
      .set("x-tenant", otherTenant.domain)
      .set("mock-user", JSON.stringify({ tenantId: tenant._id })); // same user from tenant A

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe("Cross-tenant access");
  });
});
