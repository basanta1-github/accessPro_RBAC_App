// routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const Tenant = require("../models/Tenant.js");
const protect = require("../middlewares/authentication.js");
const createDefaultRoles = require("../utils/createDefaultroles.js");
const withActivityLog = require("../middlewares/controllerLogger.js");

// Only for admins or owner
router.post(
  "/sync-roles",
  protect,
  // activityLogger("roles synced"),
  withActivityLog(async (req, res) => {
    if (req.user.role !== "owner") {
      res.status(403).json({
        message:
          "you are not authorized to use this route please ask your owner",
      });
    }
    try {
      const tenants = await Tenant.find({});
      for (const tenant of tenants) {
        await createDefaultRoles(tenant._id);
        console.log(`✅ Roles updated for tenant: ${tenant.name}`);
      }
      res.json({ message: "Roles synced successfully" });
    } catch (err) {
      console.error("Error syncing roles:", err);
      res.status(500).json({ message: "Error syncing roles" });
    }
  }, "ROLES_SYNCED")
);

module.exports = router;
