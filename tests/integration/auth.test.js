jest.mock(
  "../../middlewares/controllerLogger",
  () => (controller, action) => controller
);
jest.mock("../../middlewares/cache", () => ({
  cacheMiddleware: jest.fn(() => (req, res, next) => next()),
  invalidateCache: jest.fn(() => Promise.resolve(true)),
}));
jest.mock("../../utils/htmltemplates/sendPasswordResetEmail", () =>
  jest.fn(() => Promise.resolve())
);

const request = require("supertest");
const app = require("../../app");
const User = require("../../models/User");
const passwordPolicy = require("../../utils/passwordPolicy");
const Tenant = require("../../models/Tenant");
const getAuthTokens = require("../helpers/getAuthTokens");
const generateOTP = require("../helpers/generateOTP");

const sendPasswordResetEmail = require("../../utils/htmltemplates/sendPasswordResetEmail");

describe("Auth - Integration tests Tests", () => {
  const testUser = {
    name: "Test User",
    email: "test@example.com",
    password: "StrongPass1!",
    companyName: "TestCompany",
    domain: "testDomain",
  };

  /** ------------------------ REGISTER ------------------------ */
  describe("POST /register", () => {
    it("should register a new user successfully", async () => {
      const res = await request(app).post("/register").send(testUser);

      expect(res.statusCode).toBe(201);
      expect(res.body.message).toBe(
        "company registered and owner user created successfully"
      );

      const dbUser = await User.findOne({ email: testUser.email });
      expect(dbUser).not.toBeNull();
    });

    it("should fail if password is weak", async () => {
      // checkEmailExists.mockResolvedValue(true);
      const weakUser = { ...testUser, password: "weak" };
      // check password policy
      const errorMessage = passwordPolicy(weakUser.password);
      expect(errorMessage).not.toBeNull();

      // check api response
      const res = await request(app).post("/register").send(weakUser);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(errorMessage);
    });

    it("should fail if email already exists", async () => {
      // checkEmailExists.mockResolvedValue(false); // simulate email exists

      await request(app).post("/register").send(testUser);

      const res = await request(app).post("/register").send(testUser);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(
        "Tenant with this company name, domain, or email already exists"
      );
    });
  });

  // /** ------------------------ LOGIN ------------------------ */
  describe("POST /login", () => {
    let tenant;
    beforeEach(async () => {
      // create tenant first
      tenant = await Tenant.create({
        name: "TestCompany",
        domain: "testDomain",
        email: "test@example.com",
      });
      const user = new User({
        ...testUser,
        tenantId: tenant._id,
        role: "owner", // must match enum in your schema
      });
      await user.save();
    });

    it("should login successfully with correct credentials", async () => {
      const res = await request(app).post("/login").send({
        email: testUser.email,
        password: testUser.password,
        companyName: testUser.companyName,
      });

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.message).toBe("Login successful");
    });

    it("should fail login with wrong email", async () => {
      const res = await request(app).post("/login").send({
        email: "wrong@example.com", // wrong email
        password: testUser.password,
        companyName: testUser.companyName,
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch("Invalid Credentials or company name");
    });
    it("should fail login with wrong password", async () => {
      const res = await request(app)
        .post("/login")

        .send({
          email: "test@example.com", // wrong email
          password: "wrong password",
          companyName: testUser.companyName,
        });
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(
        "Invalid email or password. If you want to reset your password, use the link below."
      );
    });
  });

  // /** ------------------------ PASSWORD RESET ------------------------ */
  describe("POST /password-reset", () => {
    beforeEach(async () => {
      await User.deleteMany({});
      await Tenant.deleteMany({});

      await request(app).post("/register").send(testUser);
    });

    it("should success password reset if user exists", async () => {
      const res = await request(app).post("/password-reset").send({
        email: testUser.email,
        companyName: testUser.companyName,
        newPassword: "Newpassword#1234",
      });

      expect(sendPasswordResetEmail).toHaveBeenCalledWith(
        expect.objectContaining({ email: testUser.email }),
        expect.any(String)
      );
      expect(res.body.message).toMatch(/success/i);
    });

    it("should fail if email does not exist", async () => {
      const res = await request(app).post("/password-reset").send({
        email: "nonexistent@example.com",
        companyName: "SomeCompany", // must provide companyName
        newPassword: "SomeNewPassword#1", // can also provide dummy password
      });

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toMatch(/not found/i);
    });
  });
  // /** ------------------------ AUTH -2FA FLOW ------------------------ */
  describe("Auth - 2FA flow", () => {
    describe("Auth 2fa - setup", () => {
      beforeEach(async () => {
        await User.deleteMany({});
        await Tenant.deleteMany({});

        const res = await request(app).post("/register").send(testUser);

        if (res.statusCode !== 201) {
          throw new Error("Test setup failed: user not created");
        }
        const createdUser = await User.findOne({ email: testUser.email });
        if (!createdUser)
          throw new Error("Test setup failed: user not created");
        testUser._id = createdUser._id;
        testUser.tenantId = createdUser.tenantId;
      });

      it("should reject 2fa for non admin or non owner", async () => {
        // testUser and token is the owner in this case to create employee from the owner

        const tokens = await getAuthTokens(testUser);
        // create employee through owner
        const employeeUser = {
          name: "Employee",
          email: "employee@gmail.com",
          password: "StrongPass1!",
          role: "employee",
          companyName: testUser.companyName,
        };
        await request(app)
          .post("/api/users/create") // endpoint for creating users
          .set("Authorization", `Bearer ${tokens.accessToken}`)
          .set("x-tenant", testUser.domain)
          .send(employeeUser);
        const dbUser = await User.findOne({ email: employeeUser.email });
        expect(dbUser).toBeDefined();
        // login as employee
        const employeeTokens = await getAuthTokens({
          email: employeeUser.email,
          password: "StrongPass1!", // using plain password here
          companyName: employeeUser.companyName,
        });
        const res = await request(app)
          .post("/2fa/setup")
          .set("Authorization", `Bearer ${employeeTokens.accessToken}`);
        expect(res.statusCode).toBe(403);
        expect(res.body.message).toMatch("2FA only for admin/owner");

        const updatedUser = await User.findOne({ email: employeeUser.email });
        expect(updatedUser.twoFactor.secret).toBeUndefined();
        expect(updatedUser.twoFactor.enabled).toBe(false);
      });
      it("should allow admin/owner to setup 2fa ", async () => {
        const tokens = await getAuthTokens(testUser);
        const res = await request(app)
          .post("/2fa/setup")
          .set("Authorization", `Bearer ${tokens.accessToken}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.qrcode).toBeDefined();
        expect(res.body.manualKey).toBeDefined();

        const updatedUser = await User.findOne({ email: testUser.email });
        expect(updatedUser.twoFactor.secret).toBeDefined();
        expect(updatedUser.twoFactor.enabled).toBe(false);
      });
    });
    describe("POST /2fa/verify-setup", () => {
      beforeEach(async () => {
        await User.deleteMany({});
        await Tenant.deleteMany({});

        // register the admin/owner user
        await request(app).post("/register").send(testUser);
      });

      it("should enable 2FA after verifying the setup token", async () => {
        const tokens = await getAuthTokens(testUser);

        // Step 1: Setup 2FA
        const setupRes = await request(app)
          .post("/2fa/setup")
          .set("Authorization", `Bearer ${tokens.accessToken}`);

        const manualKey = setupRes.body.manualKey;
        const otp = generateOTP(manualKey);

        // Step 2: Verify 2FA setup
        const verifyRes = await request(app)
          .post("/2fa/verify-setup")
          .set("Authorization", `Bearer ${tokens.accessToken}`)
          .send({ token: otp });

        expect(verifyRes.statusCode).toBe(200);
        expect(verifyRes.body.message).toMatch(/enabled successfully/i);

        const updatedUser = await User.findOne({ email: testUser.email });
        expect(updatedUser.twoFactor.enabled).toBe(true);
      });
      it("should reject verification with invalid OTP", async () => {
        const tokens = await getAuthTokens(testUser);

        const invalidOtp = "123456"; // invalid
        const res = await request(app)
          .post("/2fa/verify-setup")
          .set("Authorization", `Bearer ${tokens.accessToken}`)
          .send({ token: invalidOtp });
        expect(res.statusCode).toBe(400);
        expect(res.body.message).toMatch("Invalid OTP");
      });
    });
    describe("Login with 2FA enforcement", () => {
      beforeEach(async () => {
        await User.deleteMany({});
        await Tenant.deleteMany({});
        await request(app).post("/register").send(testUser);
      });

      it("should reject direct login if 2FA is enabled", async () => {
        // Setup 2FA first
        const tokens = await getAuthTokens(testUser);
        const setupRes = await request(app)
          .post("/2fa/setup")
          .set("Authorization", `Bearer ${tokens.accessToken}`);

        const manualKey = setupRes.body.manualKey;
        const otpSetup = generateOTP(manualKey);

        // Verify 2FA setup
        await request(app)
          .post("/2fa/verify-setup")
          .set("Authorization", `Bearer ${tokens.accessToken}`)
          .send({ token: otpSetup });

        // Attempt login now
        const loginRes = await request(app).post("/login").send({
          email: testUser.email,
          password: testUser.password,
          companyName: testUser.companyName,
        });

        expect(loginRes.statusCode).toBe(200);
        expect(loginRes.body.message).toMatch(/2FA verification required/i);
        expect(loginRes.body.action).toBe("verify-2fa-login");
        expect(loginRes.body.userId).toBeDefined();
      });

      it("should allow login after valid 2FA verification", async () => {
        const tokens = await getAuthTokens(testUser);

        const setupRes = await request(app)
          .post("/2fa/setup")
          .set("Authorization", `Bearer ${tokens.accessToken}`);
        const manualKey = setupRes.body.manualKey;
        const otpSetup = generateOTP(manualKey);

        await request(app)
          .post("/2fa/verify-setup")
          .set("Authorization", `Bearer ${tokens.accessToken}`)
          .send({ token: otpSetup });

        const user = await User.findOne({ email: testUser.email });
        const otpLogin = generateOTP(user.twoFactor.secret);

        const verifyLoginRes = await request(app)
          .post("/2fa/verify-login")
          .set("Authorization", `Bearer ${tokens.accessToken}`)
          .send({ userId: user._id, token: otpLogin });
        expect(verifyLoginRes.statusCode).toBe(200);
        expect(verifyLoginRes.body.accessToken).toBeDefined();
        expect(verifyLoginRes.body.refreshToken).toBeDefined();
        expect(verifyLoginRes.body.message).toMatch(/successful/i);
      });

      it("should reject login with invalid 2FA token", async () => {
        const tokens = await getAuthTokens(testUser);

        const setupRes = await request(app)
          .post("/2fa/setup")
          .set("Authorization", `Bearer ${tokens.accessToken}`);
        const manualKey = setupRes.body.manualKey;
        const otpSetup = generateOTP(manualKey);

        await request(app)
          .post("/2fa/verify-setup")
          .set("Authorization", `Bearer ${tokens.accessToken}`)
          .send({ token: otpSetup });

        const user = await User.findOne({ email: testUser.email });

        const res = await request(app)
          .post("/2fa/verify-login")
          .set("Authorization", `Bearer ${tokens.accessToken}`)
          .send({ userId: user._id, token: "000000" }); // invalid OTP

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toMatch(/invalid otp/i);
      });
    });
  });
  // /** ------------------------ LOGOUT ------------------------ */
  describe("POST /logout", () => {
    beforeAll(async () => {
      await User.deleteMany({});
      await Tenant.deleteMany({});

      // Ensure testUser is registered
      await request(app).post("/register").send(testUser);
    });
    it("should logout successfully", async () => {
      const tokens = await getAuthTokens(testUser);
      const res = await request(app)
        .post("/logout")
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .send({
          refreshToken: tokens.refreshToken,
        });
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toMatch(/success/i);
    });
  });
});
