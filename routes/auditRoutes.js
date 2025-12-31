const express = require("express");
const router = express.Router();

const protect = require("../middlewares/authentication.js");
const authorize = require("../middlewares/authorize.js");
const {
  getAuditLogs,
  exportAuditLogsCSV,
} = require("../controllers/auditController.js");

const restrictByPlan = require("../middlewares/planRestriction.js");
const tenantSubDomainMiddleware = require("../middlewares/tenantSubDomain.js");
const attachTenant = require("../middlewares/attachTenant.js");
const withActivityLog = require("../middlewares/controllerLogger.js");

router.get(
  "/",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  authorize(["audit:view"]),
  withActivityLog(getAuditLogs, "FETCHED_LOGS")
);
router.get(
  "/export",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  authorize(["audit:view"]),
  restrictByPlan(["Pro", "Enterprise"]),
  withActivityLog(exportAuditLogsCSV, "CSV_EXPORTED")
);

module.exports = router;
