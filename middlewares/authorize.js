const Roles = require("../models/Roles");
const User = require("../models/User");

const authorize = (requiredPermissions = []) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.tenantId)
        return res.status(401).json({ message: "unauthorized" });
      // fetch users profile
      const user = await User.findById(req.user._id);
      if (!user) return res.status(404).json({ message: "user not found" });

      const role = await Roles.findOne({
        name: user.role,
        tenantId: user.tenantId,
      });
      if (!role) return res.status(403).json({ message: "Role not found" });

      // console.log("🧑‍💻 Current user role:", user.role);
      // console.log("🔑 Role permissions:", role.permissions);
      // console.log("🔍 Required permissions:", requiredPermissions);

      //check permissions
      const hasPermission = requiredPermissions.some((perm) =>
        role.permissions.some((p) => p.startsWith(perm))
      );
      if (!hasPermission)
        return res.status(403).json({ message: "access denied" });

      next();
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
};

module.exports = authorize;
