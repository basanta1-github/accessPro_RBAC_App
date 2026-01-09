// jest.mock("nodemailer", () => ({
//   createTransport: jest.fn(() => ({
//     sendMail: jest.fn().mockResolvedValue(true),
//   })),
// }));
// jest.mock("../../middlewares/restrictByUserLimit", () =>
//   jest.fn((req, res, next) => next())
// );
jest.mock(
  "../../middlewares/controllerLogger",
  () => (controller, action) => controller
);
jest.mock("../../middlewares/cache", () => ({
  cacheMiddleware: jest.fn(() => (req, res, next) => next()),
  invalidateCache: jest.fn(() => Promise.resolve(true)),
}));
jest.mock("../../utils/checkEmailExists", () => jest.fn());
jest.mock("../../utils/htmltemplates/sendEmail", () =>
  jest.fn().mockResolvedValue(true)
);
jest.mock("../../utils/notificationService", () => ({
  notify: jest.fn(),
}));

const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../../app");
const jwt = require("jsonwebtoken");

const User = require("../../models/User");
const Tenant = require("../../models/Tenant");
const Invite = require("../../models/Invite");

const getAuthTokens = require("../helpers/getAuthTokens");
const checkEmailExists = require("../../utils/checkEmailExists");
const NotificationService = require("../../utils/notificationService");
const sendInviteEmail = require("../../utils/htmltemplates/sendEmail");
const createdefaultRoles = require("../../utils/createDefaultroles");

// const nodemailer = require("nodemailer");

describe("User Invite & Management Routes", () => {
  let tenant, owner, admin;

  beforeEach(async () => {
    await User.deleteMany({});
    await Tenant.deleteMany({});
    // await Roles.deleteMany({});
    process.env.INVITE_TOKEN_SECRET = "testsecret";

    tenant = await Tenant.create({
      name: "Test Company",
      domain: "testcompany",
      email: "owner@test.com",
    });
    await createdefaultRoles(tenant._id);

    owner = await User.create({
      name: "Owner",
      email: "owner@test.com",
      password: "StrongPass1!",
      role: "owner",
      tenantId: tenant._id,
      companyName: tenant.name,
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

  /* ===================== INVITE USER ===================== */

  describe("POST /users/invite", () => {
    it("owner and admin can invite employee", async () => {
      checkEmailExists.mockResolvedValue(true);
      const inviters = [owner, admin];
      for (const inviter of inviters) {
        const tokens = await getAuthTokens({
          email: inviter.email,
          password: "StrongPass1!", // raw password
          companyName: inviter.companyName,
        });

        const res = await request(app)
          .post("/inviteRoute/invite")
          .set("Authorization", `Bearer ${tokens.accessToken}`)
          .set("x-tenant", tenant.domain)
          .send({
            email: "pokhrelb246@gmail.com",
            role: "employee",
          });
        expect(checkEmailExists).toHaveBeenCalledWith("pokhrelb246@gmail.com");
        expect(res.statusCode).toBe(201);
        expect(res.body.message).toBe("Invite sent");

        expect(NotificationService.notify).toHaveBeenCalledWith(
          "invite",
          expect.objectContaining({
            email: "pokhrelb246@gmail.com",
            tenantName: tenant.name,
            token: expect.any(String),
          })
        );
        jest.clearAllMocks();
      }
    });

    it("fails if email does not exist", async () => {
      checkEmailExists.mockResolvedValue(false);

      const tokens = await getAuthTokens({
        email: owner.email,
        password: "StrongPass1!", // raw password
        companyName: owner.companyName,
      });
      const res = await request(app)
        .post("/inviteRoute/invite")
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", tenant.domain)
        .send({
          email: "fake@email.com",
          role: "employee",
        });
      expect(res.statusCode).toBe(400);
    });
  });

  //  ===================== ACCEPT INVITE =====================

  describe("POST /users/accept-invite", () => {
    let invite;

    beforeEach(async () => {
      invite = await Invite.create({
        email: "newuser@test.com",
        tenantId: tenant._id,
        role: "employee",
        token: jwt.sign(
          {
            email: "newuser@test.com",
            tenantId: tenant._id,
            role: "employee",
          },
          process.env.INVITE_TOKEN_SECRET
        ),
        status: "Pending",
        expiresAt: new Date(Date.now() + 100000),
      });
    });

    it("creates user from valid invite", async () => {
      const res = await request(app).post("/inviteRoute/accept-invite").send({
        token: invite.token,
        name: "New Employee",
        password: "StrongPass1!",
      });
      expect(res.statusCode).toBe(201);

      const user = await User.findOne({ email: "newuser@test.com" });
      expect(user).not.toBeNull();
      expect(user.role).toBe("employee");

      const updatedInvite = await Invite.findById(invite._id);
      expect(updatedInvite.status).toBe("Accepted");
    });

    it("fails if invite already accepted", async () => {
      invite.status = "Accepted";
      await invite.save();

      const res = await request(app).post("/inviteRoute/accept-invite").send({
        token: invite.token,
        name: "New Employee",
        password: "StrongPass1!",
      });
      expect(res.statusCode).toBe(400);
    });
  });
});
