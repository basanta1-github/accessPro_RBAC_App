const request = require("supertest");
const app = require("../../app.js");
const BlackListedTokens = require("../../models/blackListedToken.js");
const User = require("../../models/User.js");
const jwt = require("jsonwebtoken");
const Tenant = require("../../models/Tenant");

describe("Auth Middleware", () => {
  let token;
  let user;
  let tenant;

  beforeAll(async () => {
    // Create tenant (required by your app design)
    tenant = await Tenant.create({
      name: "Test Company",
      domain: "testco",
      email: "admin@testco.com",
    });

    // Create real user
    user = await User.create({
      name: "Test Owner",
      email: "test@test.com",
      password: "password123", // schema will hash
      role: "owner",
      tenantId: tenant._id,
      companyName: tenant.name,
    });

    token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        tenantId: tenant._id,
        companyName: tenant.name,
        permissions: ["*"],
      },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "1h" }
    );
  });
  afterEach(async () => {
    await BlackListedTokens.deleteMany({});
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Tenant.deleteMany({});
  });

  it("allows req with valid token on logout", async () => {
    const res = await request(app)
      .post("/logout") // test logout route
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
  });
  it("rejects req with no token on logout", async () => {
    const res = await request(app).post("/logout"); // test logout route
    expect(res.statusCode).toBe(401);
  });
  it("rejects req with invalid token on logout", async () => {
    const res = await request(app)
      .post("/logout") // test logout route
      .set("Authorization", `Bearer invalidtoken`);
    expect(res.statusCode).toBe(401);
  });
});
