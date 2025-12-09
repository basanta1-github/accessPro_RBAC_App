const express = require("express");
const router = express.Router();

const protect = require("../middlewares/authentication.js");
const authorize = require("../middlewares/authorize.js");
const tenantIsolation = require("../middlewares/tenantIsolation.js");
const {
  getAuditLogs,
  exportAuditLogsCSV,
} = require("../controllers/auditController.js");
const {
  auditLoggerMiddleware,
} = require("../middlewares/auditLogMiddleware.js");

const restrictByPlan = require("../middlewares/planRestriction");

router.get(
  "/",
  protect,
  tenantIsolation,
  authorize(["audit:view"]),
  auditLoggerMiddleware("User", "audit-logged"),
  getAuditLogs
);
router.get(
  "/export",
  protect,
  tenantIsolation,
  authorize(["audit:view"]),
  restrictByPlan(["Pro", "Enterprise"]),
  auditLoggerMiddleware("User", "csv-exported"),
  exportAuditLogsCSV
);

module.exports = router;
