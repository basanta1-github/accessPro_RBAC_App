const Roles = require("../models/Roles");

const createdefaultRoles = async (tenantId) => {
  const roles = [
    {
      name: "owner",
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
        "user:create:admin",
        "user:delete:admin",
        "user:create:employee",
        "user:delete:employee",
        "project:create",
        "project:view",
        "project:update",
        "project:delete",
        "project:deactivated",
        "project:restored",
      ],
      tenantId,
    },
    {
      name: "admin",
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
      tenantId,
    },
    {
      name: "employee",
      permissions: ["project:view", "project:update"],
      tenantId,
    },
  ];

  for (const role of roles) {
    // check if role exists for this tenant
    const existingRole = await Roles.findOne({ name: role.name, tenantId });

    if (existingRole) {
      // merge existing permissions with the new permissions and remove the duplocates
      existingRole.permissions = Array.from(new Set([...role.permissions]));
      await existingRole.save();
      console.log(`Updated permissions for role: ${role.name}`);
    } else {
      // create roles if not exists
      await Roles.create({
        ...role,
        tenantId,
        permissions: Array.from(new Set(role.permissions)),
      });
      console.log(`Created Role: ${role.name}`);
    }
  }
};

module.exports = createdefaultRoles;
