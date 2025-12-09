const express = require("express");
const router = express.Router();

const protect = require("../middlewares/authentication.js");
const authorize = require("../middlewares/authorize.js");
const tenantIsolation = require("../middlewares/tenantIsolation.js");
const {
  auditLoggerMiddleware,
} = require("../middlewares/auditLogMiddleware.js");
const {
  getAllTenants,
  getTenant,
  updateTenant,
  deactiveTenant,
} = require("../controllers/tenantController.js");

router.get("/", getAllTenants);

router.get(
  "/:id",
  protect,
  tenantIsolation,
  authorize(["tenant:view"]),
  auditLoggerMiddleware("Tenant", "viewed"),
  getTenant
);
router.put(
  "/:id/update",
  protect,
  tenantIsolation,
  authorize(["tenant:update"]),
  auditLoggerMiddleware("Tenant", "updated"),
  updateTenant
);
router.put(
  "/:id/deactive",
  protect,
  tenantIsolation,
  authorize(["tenant:deactive"]),
  auditLoggerMiddleware("Tenant", "deactivated"),
  deactiveTenant
);

module.exports = router;
