const express = require("express");
const router = express.Router();

const protect = require("../middlewares/authentication.js");
const authorize = require("../middlewares/authorize.js");
const {
  auditLoggerMiddleware,
} = require("../middlewares/auditLogMiddleware.js");
const {
  getAllTenants,
  getTenant,
  updateTenant,
  deactiveTenant,
} = require("../controllers/tenantController.js");
const tenantSubDomainMiddleware = require("../middlewares/tenantSubDomain.js");
const attachTenant = require("../utils/attachTenant.js");
router.get("/", getAllTenants);

router.get(
  "/:id",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  authorize(["tenant:view"]),
  auditLoggerMiddleware("Tenant", "viewed"),
  getTenant
);
router.put(
  "/:id/update",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  authorize(["tenant:update"]),
  auditLoggerMiddleware("Tenant", "updated"),
  updateTenant
);
router.put(
  "/:id/deactive",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  authorize(["tenant:deactive"]),
  auditLoggerMiddleware("Tenant", "deactivated"),
  deactiveTenant
);

module.exports = router;
