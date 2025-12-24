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
const activityLogger = require("../middlewares/activityLogger.js");
router.get("/", activityLogger("view all tenants"), getAllTenants);

router.get(
  "/:id",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  authorize(["tenant:view"]),
  activityLogger("view tenant"),
  getTenant
);
router.put(
  "/:id/update",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  authorize(["tenant:update"]),
  activityLogger("update tenant"),
  auditLoggerMiddleware("Tenant", "updated"),
  updateTenant
);
router.put(
  "/:id/deactive",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  authorize(["tenant:deactive"]),
  activityLogger("deactive tenant"),
  auditLoggerMiddleware("Tenant", "deactivated"),
  deactiveTenant
);

module.exports = router;
