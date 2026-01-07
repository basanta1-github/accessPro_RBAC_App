jest.mock("../../middlewares/cache", () => ({
  cacheMiddleware: jest.fn(() => (req, res, next) => next()),
  invalidateCache: jest.fn(() => Promise.resolve(true)),
}));
const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../../app");
const { invalidateCache, cacheMiddleware } = require("../../middlewares/cache");
const Project = require("../../models/Project");
const User = require("../../models/User");
const Tenant = require("../../models/Tenant");

const getAuthTokens = require("../helpers/getAuthTokens");
const createdefaultRoles = require("../../utils/createDefaultroles");

describe("Project Routes", () => {
  let owner, admin, employee, tenant, project;

  beforeEach(async () => {
    await Tenant.deleteMany({});
    await User.deleteMany({});
    await Project.deleteMany({});
    jest.clearAllMocks();

    tenant = await Tenant.create({
      name: "TestCompany",
      domain: "testDomain",
      email: "owner@example.com",
    });
    // create roles
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
      companyName: tenant.domain,
    });

    employee = await User.create({
      name: "Employee",
      email: "emp@test.com",
      password: "StrongPass1!",
      role: "employee",
      tenantId: tenant._id,
      companyName: tenant.domain,
    });
  });

  describe("CREATE PROJECT", () => {
    it("owner can create project", async () => {
      const tokens = await getAuthTokens({
        email: owner.email,
        password: "StrongPass1!",
        companyName: tenant.name,
      });

      const res = await request(app)
        .post("/projects/create")
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", tenant.domain)
        .send({
          name: "Project Alpha",
          description: "this is project",
          assignedTo: [employee._id],
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.project.name).toBe("Project Alpha");
    });
    it("admin can create project", async () => {
      const tokens = await getAuthTokens({
        email: admin.email,
        password: "StrongPass1!",
        companyName: tenant.name,
      });

      const res = await request(app)
        .post("/projects/create")
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", tenant.domain)
        .send({
          name: "Project Alpha",
          description: "this is project",
          assignedTo: [employee._id],
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.project.name).toBe("Project Alpha");
    });

    it("employee cannot create project", async () => {
      const tokens = await getAuthTokens({
        email: employee.email,
        password: "StrongPass1!",
        companyName: tenant.name,
      });

      const res = await request(app)
        .post("/projects/create")
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", tenant.domain)
        .send({
          name: "Project Alpha",
          description: "this is project",
          assignedTo: [employee._id],
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

      const res = await request(app)
        .post("/projects/create")
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", separatetenant.domain)
        .send({
          name: "Project Alpha",
          description: "this is project",
          assignedTo: [employee._id],
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toMatch(/Cross-tenant access/i);
    });
  });

  describe("GET PROJECTS", () => {
    let projectAssigned, unassignedProject;
    beforeEach(async () => {
      await Project.deleteMany({});

      projectAssigned = await Project.create({
        name: "Assigned Project",
        tenantId: tenant._id,
        createdBy: owner._id,
        assignedTo: [employee._id],
      });

      unassignedProject = await Project.create({
        name: "Unassigned Project",
        tenantId: tenant._id,
        createdBy: owner._id,
        assignedTo: [],
      });
    });

    it(" owner can view all projects", async () => {
      const tokens = await getAuthTokens({
        email: owner.email,
        password: "StrongPass1!",
        companyName: tenant.name,
      });
      const res = await request(app)
        .get("/projects/getProjects")
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", tenant.domain);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.projects)).toBe(true);
    });
    it(" admin can view all projects", async () => {
      const tokens = await getAuthTokens({
        email: admin.email,
        password: "StrongPass1!",
        companyName: tenant.name,
      });
      const res = await request(app)
        .get("/projects/getProjects")
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", tenant.domain);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.projects)).toBe(true);
    });
    it(" employee can view only assigned projects", async () => {
      const tokens = await getAuthTokens({
        email: employee.email,
        password: "StrongPass1!",
        companyName: tenant.name,
      });
      const res = await request(app)
        .get("/projects/getProjects")
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", tenant.domain);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.projects)).toBe(true);
      // expect(res.body.projects[0].name).toBe("Assigned Project");
      // check that all returned projects are assigned to this employee
      res.body.projects.forEach((p) => {
        expect(p.assignedTo.map((id) => id.toString())).toContain(
          employee._id.toString()
        );
      });
    });
    it(" unassigned employee gets 404", async () => {
      const otherEmployee = await User.create({
        name: "Other Emp",
        email: "other@test.com",
        password: "StrongPass1!",
        role: "employee",
        tenantId: tenant._id,
        companyName: tenant.domain,
      });
      const tokens = await getAuthTokens({
        email: otherEmployee.email,
        password: "StrongPass1!",
        companyName: tenant.name,
      });
      const res = await request(app)
        .get("/projects/getProjects")
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", tenant.domain);

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toMatch(/no projects found/i);
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
        .get("/projects/getProjects")
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", separatetenant.domain);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toMatch(/Cross-tenant access/i);
    });
  });
  describe("UPDATE PROJECT", () => {
    beforeEach(async () => {
      await Project.deleteMany({});
      project = await Project.create({
        name: "Assigned Project",
        description: "this is unupdated project",
        tenantId: tenant._id,
        createdBy: admin._id,
        assignedTo: [employee._id],
      });
    });
    it("assigned employee can update project", async () => {
      const tokens = await getAuthTokens({
        email: employee.email,
        password: "StrongPass1!",
        companyName: tenant.name,
      });
      const res = await request(app)
        .put(`/projects/update/${project._id}`)
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", tenant.domain)
        .send({ description: "Updated desc" });
      expect(res.statusCode).toBe(200);
      expect(res.body.project.description).toBe("Updated desc");
    });
    it("unassigned employee cannot update project", async () => {
      const otherEmployee = await User.create({
        name: "Other Emp",
        email: "other@test.com",
        password: "StrongPass1!",
        role: "employee",
        tenantId: tenant._id,
        companyName: tenant.domain,
      });
      const tokens = await getAuthTokens({
        email: otherEmployee.email,
        password: "StrongPass1!",
        companyName: tenant.name,
      });
      const res = await request(app)
        .put(`/projects/update/${project._id}`)
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", tenant.domain)
        .send({ description: "Hack" });
      expect(res.statusCode).toBe(403);
    });
    it("other admin cannot update a project created by a different admin", async () => {
      // Create another admin
      const otherAdmin = await User.create({
        name: "Admin B",
        email: "adminB@test.com",
        password: "StrongPass1!",
        role: "admin",
        tenantId: tenant._id,
        companyName: tenant.domain,
      });

      // Login as this other admin
      const tokens = await getAuthTokens({
        email: otherAdmin.email,
        password: "StrongPass1!",
        companyName: tenant.name,
      });

      // Attempt to update a project created by the first admin/owner
      const res = await request(app)
        .put(`/projects/update/${project._id}`)
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", tenant.domain)
        .send({ description: "Hacked by Admin B" });

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toMatch(
        /not allowed to update project created by another admin/i
      );
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
        .put(`/projects/update/${project._id}`)
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", separatetenant.domain)
        .send({ description: "Updated desc" });

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toMatch(/Cross-tenant access/i);
    });
  });

  describe("HARD DELETE", () => {
    it("admin and owners can hard delete project", async () => {
      const project = await Project.create({
        name: "Delete Me",
        tenantId: tenant._id,
        createdBy: owner._id,
      });

      const tokens = await getAuthTokens({
        email: admin.email || owner.email,
        password: "StrongPass1!",
        companyName: tenant.name,
      });

      const res = await request(app)
        .delete(`/projects/delete/${project._id}`)
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", tenant.domain);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toMatch(/success/i);
    });
    it("employee cannot hard delete project", async () => {
      const project = await Project.create({
        name: "Delete Me",
        tenantId: tenant._id,
        createdBy: owner._id,
      });

      const tokens = await getAuthTokens({
        email: employee.email,
        password: "StrongPass1!",
        companyName: tenant.name,
      });

      const res = await request(app)
        .delete(`/projects/delete/${project._id}`)
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", tenant.domain);

      expect(res.statusCode).toBe(403);
    });
    it("separate tenants user  cannot access", async () => {
      const project = await Project.create({
        name: "Delete Me",
        tenantId: tenant._id,
        createdBy: owner._id,
      });
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
        .delete(`/projects/delete/${project._id}`)
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", separatetenant.domain);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toMatch(/Cross-tenant access/i);
    });
  });

  describe("SOFT DELETE", () => {
    let project;

    beforeEach(async () => {
      project = await Project.create({
        name: "Soft Delete Me",
        tenantId: tenant._id,
        createdBy: owner._id,
      });
    });

    it("admin or owner can soft delete project", async () => {
      const tokens = await getAuthTokens({
        email: owner.email || admin.email,
        password: "StrongPass1!",
        companyName: tenant.name,
      });

      const res = await request(app)
        .put(`/projects/softDelete/${project._id}`)
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", tenant.domain);

      expect(res.statusCode).toBe(200);

      const updated = await Project.findById(project._id).setOptions({
        _skipSoftDelete: ["Project"],
      });

      expect(updated.isDeleted).toBe(true);
    });
    it(" employee cannot  soft delete project", async () => {
      const tokens = await getAuthTokens({
        email: employee.email,
        password: "StrongPass1!",
        companyName: tenant.name,
      });

      const res = await request(app)
        .put(`/projects/softDelete/${project._id}`)
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", tenant.domain);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toMatch(/denied/i);
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
        .put(`/projects/softDelete/${project._id}`)
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", separatetenant.domain);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toMatch(/Cross-tenant access/i);
    });
  });
  describe("Restore Project", () => {
    let project;

    beforeEach(async () => {
      // create a soft-deleted project
      project = await Project.create({
        name: "Restore Me",
        tenantId: tenant._id,
        createdBy: admin._id,
        isDeleted: true,
      });
    });
    it("admin can restore project", async () => {
      project.isDeleted = true;
      await project.save();

      const tokens = await getAuthTokens({
        email: admin.email,
        password: "StrongPass1!",
        companyName: tenant.name,
      });
      const res = await request(app)
        .put(`/projects/restore/${project._id}`)
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", tenant.domain);

      expect(res.statusCode).toBe(200);

      const restored = await Project.findById(project._id);
      expect(restored.isDeleted).toBe(false);
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
        .put(`/projects/restore/${project._id}`)
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .set("x-tenant", separatetenant.domain);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toMatch(/Cross-tenant access/i);
    });
  });
});
