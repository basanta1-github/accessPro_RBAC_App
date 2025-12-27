const express = require("express");
const router = express.Router();

const protect = require("../middlewares/authentication.js");
const authorize = require("../middlewares/authorize.js");
const {
  getAllTenants,
  getTenant,
  updateTenant,
  deactiveTenant,
} = require("../controllers/tenantController.js");
const tenantSubDomainMiddleware = require("../middlewares/tenantSubDomain.js");
const attachTenant = require("../middlewares/attachTenant.js");
const withActivityLog = require("../utils/controllerLogger.js");
const { cacheMiddleware } = require("../middlewares/cache");

router.get(
  "/",
  cacheMiddleware(() => "tenants:all", 300),
  withActivityLog(getAllTenants, "VIEW_ALL_TENANTS", {
    allowUserTenantFallback: true,
  })
);

router.get(
  "/:id",
  protect,
  cacheMiddleware((req) => `tenant:${req.params.id}`, 600),
  tenantSubDomainMiddleware,
  attachTenant,
  withActivityLog(getTenant, "VIEW_TENANT")
);
router.put(
  "/:id/update",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  authorize(["tenant:update"]),
  withActivityLog(updateTenant, "UPDATE_TENANT")
);
router.put(
  "/:id/deactive",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  authorize(["tenant:deactive"]),
  withActivityLog(deactiveTenant, "DEACTIVE_TENANT")
);

module.exports = router;
