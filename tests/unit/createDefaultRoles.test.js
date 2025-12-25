const mongoose = require("mongoose");
const Roles = require("../../models/Roles");
const createDefaultRoles = require("../../utils/createDefaultroles");
const { describe, beforeEach } = require("node:test");

describe("default roles creator", () => {
  const tenantId = new mongoose.Types.ObjectId();
  beforeEach(async () => {
    // Clear Roles collection before each test
    await Roles.deleteMany({});
  });

  test("should create default roles if none exist for the tenant", async () => {
    await createDefaultRoles(tenantId);
    const roles = await Roles.find({ tenantId });
    expect(roles.length).toBe(3); // assuming 3 default roles
    expect(roles.map((r) => r.name)).toEqual(
      expect.arrayContaining(["owner", "admin", "employee"])
    );
  });
  test("updates ex role  permissions without duplication", async () => {
    // create an existing role
    await Roles.create({ name: "admin", tenantId, permissions: ["user:view"] });
    await createDefaultRoles(tenantId);
    const role = await Roles.findOne({ tenantId, name: "admin" });
    expect(role.permissions).toEqual(
      expect.arrayContaining(["user:view", "project:create"])
    );
  });
  test("should not add duplicate permissions on subsequent runs", async () => {
    await createDefaultRoles(tenantId); // First run
    const role = await Roles.findOne({ tenantId, name: "admin" });
    const initialPermissions = role.permissions;

    // Run the function again and check if permissions are still the same
    await createDefaultRoles(tenantId); // Second run
    const updatedRole = await Roles.findOne({ tenantId, name: "admin" });

    expect(updatedRole.permissions).toEqual(initialPermissions); // No new permissions added
  });
  test("should not modify roles if they already have all the permissions", async () => {
    // Create a role with all required permissions
    await Roles.create({
      name: "admin",
      tenantId,
      permissions: [
        "audit:view",
        "user:view",
        "user:update",
        "user:deactivated",
        "user:restored",
        "tenant:view",
        "tenant:update",
        "tenant:deactivated",
        "tenant:restored",
        "user:create:employee",
        "user:delete:employee",
        "project:create",
        "project:view",
        "project:update",
        "project:delete",
        "project:deactivated",
        "project:restored",
      ],
    });

    const initialRole = await Roles.findOne({ tenantId, name: "admin" });
    const initialPermissions = initialRole.permissions;

    // Run the function again and check if permissions have changed
    await createDefaultRoles(tenantId); // Shouldn't add anything new

    const updatedRole = await Roles.findOne({ tenantId, name: "admin" });
    expect(updatedRole.permissions).toEqual(initialPermissions); // No change in permissions
  });

  test("should merge permissions correctly when new permissions are added", async () => {
    // Create role with some permissions
    await Roles.create({
      name: "admin",
      tenantId,
      permissions: ["user:view", "project:create"],
    });

    // Run role creation logic
    await createDefaultRoles(tenantId);

    const updatedRole = await Roles.findOne({ tenantId, name: "admin" });
    expect(updatedRole.permissions).toEqual(
      expect.arrayContaining([
        "user:view",
        "project:create",
        "project:view",
        "project:update", // Expected merged permissions
      ])
    );
  });
});
