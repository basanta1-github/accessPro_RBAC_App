// routes/metricsRoutes.js
const express = require("express");
const router = express.Router();

const protect = require("../middlewares/authentication");
const authorize = require("../middlewares/authorize");
const attachTenant = require("../middlewares/attachTenant");
const withActivityLog = require("../middlewares/controllerLogger");
const { cacheMiddleware } = require("../middlewares/cache");

const {
  getTenantMetrics,
} = require("../controllers/metricsControllers/tenantMetricsController");
const {
  getAdminMetrics,
} = require("../controllers/metricsControllers/adminMetricsControllers");
const { tenantKpiKey, adminKpiKey } = require("../utils/kpiChacheKeys");
const { exportAuditLogsCSV } = require("../controllers/auditController");

// Tenant metrics
router.get(
  "/tenant",
  protect,
  attachTenant,
  authorize(["audit:view"]),
  cacheMiddleware(tenantKpiKey, 10),
  withActivityLog(getTenantMetrics, "TENANT_METRICS")
);

// Admin metrics
router.get(
  "/admin",
  protect,
  authorize(["audit:view"]),
  cacheMiddleware(adminKpiKey, 10),
  withActivityLog(getAdminMetrics, "ADMIN_METRICS")
);

router.get(
  "/export",
  protect,
  attachTenant,
  authorize(["audit:view"]),
  withActivityLog(exportAuditLogsCSV, "METRICS_EXPORT")
);
module.exports = router;
