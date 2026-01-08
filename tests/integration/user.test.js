// // Mock cache and logger middleware

// jest.mock("../../middlewares/restrictByUserLimit", () =>
//   jest.fn((req, res, next) => next())
// );
// jest.mock("../../middlewares/authorize", () => {
//   return jest.fn(() => {
//     // this is the middleware function that Express calls
//     return (req, res, next) => {
//       // mock user injected for tests
//       req.user = { _id: "fakeUserId", role: "owner", tenantId: "fakeTenantId" };
//       next();
//     };
//   });
// });
// jest.mock("../../middlewares/attachTenant", () => {
//   return (req, res, next) => {
//     req.user = { _id: "fakeUserId", role: "owner", tenantId: "fakeTenantId" };
//     req.tenant = { _id: "fakeTenantId" };
//     req.tenantId = "fakeTenantId";
//     next();
//   };
// });
// jest.mock("../../middlewares/tenantSubDomain", () =>
//   jest.fn((req, res, next) => next())
// );

// jest.mock("../../controllers/activityLogger", () => ({
//   track: jest.fn(() => Promise.resolve()),
// }));
jest.mock(
  "../../middlewares/controllerLogger",
  () => (controller, action) => controller
);
jest.mock("../../middlewares/cache", () => ({
  cacheMiddleware: jest.fn(() => (req, res, next) => next()),
  invalidateCache: jest.fn(() => Promise.resolve(true)),
}));

// jest.setTimeout(30000);

// tests/integration/userRoutes.test.js
const request = require("supertest");
const app = require("../../app");
const User = require("../../models/User");
const Tenant = require("../../models/Tenant");
const Roles = require("../../models/Roles");
const getAuthTokens = require("../helpers/getAuthTokens");
const createDefaultRoles = require("../../utils/createDefaultroles");

describe("User Routes Integration Tests", () => {
  let tenant, owner, admin, employee;
  beforeEach(async () => {
    await User.deleteMany({});
    await Tenant.deleteMany({});
    await Roles.deleteMany({});
    jest.clearAllMocks();

    // Create tenant
    tenant = await Tenant.create({
      name: "TestCompany",
      domain: "testDomain",
      email: "owner@example.com",
    });

    await createDefaultRoles(tenant._id);

    // Create users
    owner = await User.create({
      name: "Owner User",
      email: "owner@example.com",
      password: "StrongPass1!",
      role: "owner",
      companyName: "TestCompany",
      tenantId: tenant._id,
    });

    admin = await User.create({
      name: "Admin User",
      email: "admin@example.com",
      password: "StrongPass1!",
      role: "admin",
      companyName: "TestCompany",
      tenantId: tenant._id,
    });

    employee = await User.create({
      name: "Employee User",
      email: "employee@example.com",
      password: "StrongPass1!",
      role: "employee",
      companyName: "TestCompany",
      tenantId: tenant._id,
    });
  });

  describe("GET /getUsers", () => {
    it("should fetch all users for tenant", async () => {
      const tokens = await getAuthTokens({
        email: owner.email,
        password: "StrongPass1!", // raw password
        companyName: owner.companyName,
      });

      const res = await request(app)
        .get("/api/users/getUsers")
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", tenant.domain);

      expect(res.statusCode).toBe(200);
      expect(res.body.total).toBe(3);
      expect(res.body.users.map((u) => u.email)).toContain("admin@example.com");
    });
    it("separate tenants user  cannot access", async () => {
      const separatetenant = await Tenant.create({
        name: "separateTestCompany",
        domain: "separatetestDomain",
        email: "separate@example.com",
      });
      const tokens = await getAuthTokens({
        email: employee.email,
        password: "StrongPass1!",
        companyName: tenant.name,
      });

      const res = await request(app)
        .get("/api/users/getUsers")
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", separatetenant.domain);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toMatch(/Cross-tenant access/i);
    });
  });

  describe("POST /create", () => {
    it("owner can create an admin user", async () => {
      const tokens = await getAuthTokens({
        email: owner.email,
        password: "StrongPass1!",
        companyName: owner.companyName,
      });
      const newAdmin = {
        name: "New Admin",
        email: "newadmin@example.com",
        password: "StrongPass1!",
        role: "admin",
        companyName: owner.companyName,
      };
      const res = await request(app)
        .post("/api/users/create")
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", tenant.domain)
        .send(newAdmin);
      const dbUser = await User.findOne({ email: newAdmin.email });
      expect(dbUser).toBeDefined();

      expect(res.statusCode).toBe(201);
      expect(res.body.user.email).toBe("newadmin@example.com");
    });
    it("owner can create an employee user", async () => {
      const tokens = await getAuthTokens({
        email: owner.email,
        password: "StrongPass1!",
        companyName: owner.companyName,
      });
      const newemployee = {
        name: "New employee",
        email: "newemployee@example.com",
        password: "StrongPass1!",
        role: "employee",
        companyName: owner.companyName,
      };
      const res = await request(app)
        .post("/api/users/create")
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", tenant.domain)
        .send(newemployee);
      const dbUser = await User.findOne({ email: newemployee.email });
      expect(dbUser).toBeDefined();

      expect(res.statusCode).toBe(201);
      expect(res.body.user.email).toBe("newemployee@example.com");
    });

    it("admin cannot create another admin", async () => {
      const tokens = await getAuthTokens({
        email: admin.email,
        password: "StrongPass1!",
        companyName: "TestCompany",
      });
      const res = await request(app)
        .post("/api/users/create")
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", tenant.domain)
        .send({
          name: "Forbidden Admin",
          email: "forbidden@example.com",
          password: "StrongPass1!",
          role: "admin",
        });

      expect(res.statusCode).toBe(403);
    });
    it("admin can create an employee user", async () => {
      const tokens = await getAuthTokens({
        email: admin.email,
        password: "StrongPass1!",
        companyName: admin.companyName,
      });
      const newemployee = {
        name: "New employee",
        email: "newemployee@example.com",
        password: "StrongPass1!",
        role: "employee",
        companyName: admin.companyName,
      };
      const res = await request(app)
        .post("/api/users/create")
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", tenant.domain)
        .send(newemployee);
      const dbUser = await User.findOne({ email: newemployee.email });
      expect(dbUser).toBeDefined();

      expect(res.statusCode).toBe(201);
      expect(res.body.user.email).toBe("newemployee@example.com");
    });

    it("employee cannot create users", async () => {
      const tokens = await getAuthTokens({
        email: employee.email,
        password: "StrongPass1!",
        companyName: "TestCompany",
      });
      const res = await request(app)
        .post("/api/users/create")
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", tenant.domain)
        .send({
          name: "Forbidden user",
          email: "forbidden@example.com",
          password: "StrongPass1!",
          role: "employee",
        });

      expect(res.statusCode).toBe(403);
    });
    it("separate tenants user  cannot access", async () => {
      const separatetenant = await Tenant.create({
        name: "separateTestCompany",
        domain: "separatetestDomain",
        email: "separate@example.com",
      });
      const tokens = await getAuthTokens({
        email: employee.email,
        password: "StrongPass1!",
        companyName: tenant.name,
      });

      const newemployee = {
        name: "New employee",
        email: "newemployee@example.com",
        password: "StrongPass1!",
        role: "employee",
        companyName: admin.companyName,
      };
      const res = await request(app)
        .post("/api/users/create")
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", separatetenant.domain)
        .send(newemployee);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toMatch(/Cross-tenant access/i);
    });
  });

  describe("DELETE /delete/:id", () => {
    it("owner can delete an admin", async () => {
      const tokens = await getAuthTokens({
        email: owner.email,
        password: "StrongPass1!",
        companyName: owner.companyName,
      });

      const res = await request(app)
        .delete(`/api/users/delete/${admin._id}`)
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", tenant.domain);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toMatch(/deleted successfully/i);
    });

    it("cannot delete owner", async () => {
      const tokens = await getAuthTokens({
        email: admin.email,
        password: "StrongPass1!",
        companyName: admin.companyName,
      });
      const res = await request(app)
        .delete(`/api/users/delete/${owner._id}`)
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", tenant.domain);
      expect(res.statusCode).toBe(403);
      expect(res.body.message).toMatch(/cannot delete owner/i);
    });
    it("admin can delete an employee", async () => {
      const tokens = await getAuthTokens({
        email: admin.email,
        password: "StrongPass1!",
        companyName: admin.companyName,
      });

      const res = await request(app)
        .delete(`/api/users/delete/${employee._id}`)
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", tenant.domain);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toMatch(/deleted successfully/i);
    });
    it("cannot delete", async () => {
      const tokens = await getAuthTokens({
        email: employee.email,
        password: "StrongPass1!",
        companyName: employee.companyName,
      });
      const res = await request(app)
        .delete(`/api/users/delete/${employee._id}`)
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", tenant.domain);
      expect(res.statusCode).toBe(403);
      expect(res.body.message).toMatch(/access denied/i);
    });
    it("separate tenants user  cannot access", async () => {
      const separatetenant = await Tenant.create({
        name: "separateTestCompany",
        domain: "separatetestDomain",
        email: "separate@example.com",
      });
      const tokens = await getAuthTokens({
        email: employee.email,
        password: "StrongPass1!",
        companyName: tenant.name,
      });

      const res = await request(app)
        .delete(`/api/users/delete/${employee._id}`)
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", separatetenant.domain);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toMatch(/Cross-tenant access/i);
    });
  });

  describe("Soft Delete", () => {
    it("owner can soft-delete an admin", async () => {
      const tokens = await getAuthTokens({
        email: owner.email,
        password: "StrongPass1!",
        companyName: owner.companyName,
      });

      const res = await request(app)
        .put(`/api/users/soft-delete/${admin._id}`)
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", tenant.domain);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toMatch("User Admin User soft deleted");

      // check by raw mongo query
      const dbUserRaw = await User.collection.findOne({ _id: admin._id });

      expect(dbUserRaw).not.toBeNull();
      expect(dbUserRaw.isDeleted).toBe(true);
    });

    it("cannot soft-delete owner", async () => {
      const tokens = await getAuthTokens({
        email: admin.email,
        password: "StrongPass1!",
        companyName: admin.companyName,
      });

      const res = await request(app)
        .put(`/api/users/soft-delete/${owner._id}`)
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", tenant.domain);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toMatch("Admins can only delete employees");
    });

    it("admin can soft-delete an employee", async () => {
      const tokens = await getAuthTokens({
        email: admin.email,
        password: "StrongPass1!",
        companyName: admin.companyName,
      });

      const res = await request(app)
        .put(`/api/users/soft-delete/${employee._id}`)
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", tenant.domain);

      expect(res.statusCode).toBe(200);
      // const dbUser = await User.findById(employee._id).setOptions({
      //   _skipSoftDelete: ["User"],
      // });
      // expect(dbUser.isDeleted).toBe(true);
      // check by raw mongo query
      const dbUserRaw = await User.collection.findOne({ _id: employee._id });

      expect(dbUserRaw).not.toBeNull();
      expect(dbUserRaw.isDeleted).toBe(true);
    });

    it("employee cannot soft-delete anyone", async () => {
      const tokens = await getAuthTokens({
        email: employee.email,
        password: "StrongPass1!",
        companyName: employee.companyName,
      });

      const res = await request(app)
        .put(`/api/users/soft-delete/${admin._id}`)
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", tenant.domain);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toMatch(/access denied/i);
    });
    it("separate tenants user  cannot access", async () => {
      const separatetenant = await Tenant.create({
        name: "separateTestCompany",
        domain: "separatetestDomain",
        email: "separate@example.com",
      });
      const tokens = await getAuthTokens({
        email: employee.email,
        password: "StrongPass1!",
        companyName: tenant.name,
      });

      const res = await request(app)
        .put(`/api/users/soft-delete/${employee._id}`)
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", separatetenant.domain);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toMatch(/Cross-tenant access/i);
    });
  });
  describe("Restore", () => {
    beforeEach(async () => {
      // Clear all users
      await User.deleteMany({});
      await Tenant.deleteMany({});
      await Roles.deleteMany({});
      // jest.clearAllMocks();

      // Create tenant
      tenant = await Tenant.create({
        name: "TestCompany",
        domain: "testDomain",
        email: "owner@example.com",
      });

      await createDefaultRoles(tenant._id);
      // Create owner/admin/employee fresh
      owner = await User.create({
        name: "Owner User",
        email: "owner@example.com",
        password: "StrongPass1!",
        role: "owner",
        companyName: tenant.name,
        tenantId: tenant._id,
        isDeleted: false,
      });

      admin = await User.create({
        name: "Admin User",
        email: "admin@example.com",
        password: "StrongPass1!",
        role: "admin",
        companyName: tenant.name,
        tenantId: tenant._id,
        isDeleted: true, // raw creation soft-deleted
      });

      employee = await User.create({
        name: "Employee User",
        email: "employee@example.com",
        password: "StrongPass1!",
        role: "employee",
        companyName: tenant.name,
        tenantId: tenant._id,
        isDeleted: true, // raw creation soft-deleted
      });

      // Verify in DB directly (optional, for debugging)
      // const allUsers = await User.find().setOptions({
      //   _skipSoftDelete: ["User"],
      // });
      // console.log(
      //   allUsers.map((u) => ({ name: u.name, isDeleted: u.isDeleted }))
      // );
    });
    it("owner can restore an admin", async () => {
      const tokens = await getAuthTokens({
        email: owner.email,
        password: "StrongPass1!",
        companyName: owner.companyName,
      });
      const res = await request(app)
        .put(`/api/users/restore/${admin._id}`)
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", tenant.domain);
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toMatch(/restored/i);

      const dbUser = await User.findById(admin._id).setOptions({
        _skipSoftDelete: ["User"],
      });
      expect(dbUser.isDeleted).toBe(false);
    });

    it("admin can restore an employee", async () => {
      // Make sure admin is active
      await User.findByIdAndUpdate(admin._id, { isDeleted: false }).setOptions({
        _skipSoftDelete: ["User"],
      });
      const tokens = await getAuthTokens({
        email: admin.email,
        password: "StrongPass1!",
        companyName: admin.companyName,
      });

      const res = await request(app)
        .put(`/api/users/restore/${employee._id}`)
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", tenant.domain);

      expect(res.statusCode).toBe(200);
      const dbUser = await User.findById(employee._id);
      expect(dbUser.isDeleted).toBe(false);
    });

    it("employee cannot restore anyone", async () => {
      // Make sure employee is active
      await User.findByIdAndUpdate(employee._id, {
        isDeleted: false,
      }).setOptions({
        _skipSoftDelete: ["User"],
      });
      const tokens = await getAuthTokens({
        email: employee.email,
        password: "StrongPass1!",
        companyName: employee.companyName,
      });

      const res = await request(app)
        .put(`/api/users/restore/${admin._id}`)
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", tenant.domain);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toMatch(/access denied/i);
    });

    it("cannot restore an active user", async () => {
      employee = await User.create({
        name: "Employee User",
        email: "employee@example1.com",
        password: "StrongPass1!",
        role: "employee",
        companyName: tenant.name,
        tenantId: tenant._id,
        isDeleted: false, // raw creation soft-deleted/not-deleted
      });
      const tokens = await getAuthTokens({
        email: owner.email,
        password: "StrongPass1!",
        companyName: owner.companyName,
      });

      const res = await request(app)
        .put(`/api/users/restore/${employee._id}`)
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", tenant.domain);

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toMatch(/not deleted/i);
    });
    it("separate tenants user  cannot access", async () => {
      const separatetenant = await Tenant.create({
        name: "separateTestCompany",
        domain: "separatetestDomain",
        email: "separate@example.com",
      });
      const tokens = await getAuthTokens({
        email: owner.email,
        password: "StrongPass1!",
        companyName: tenant.name,
      });
      const res = await request(app)
        .put(`/api/users/restore/${employee._id}`)
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", separatetenant.domain);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toMatch(/Cross-tenant access/i);
    });
  });
});
