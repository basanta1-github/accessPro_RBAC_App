const express = require("express");
const router = express.Router();
const protect = require("../middlewares/authentication.js");

const {
  stripeSubscription,
  stripeSuccess,
  stripeCancelSubscription,
  stripeCheckSubscription,
} = require("../controllers/stripeControllers.js");
const tenantSubDomainMiddleware = require("../middlewares/tenantSubDomain.js");
const attachTenant = require("../utils/attachTenant.js");
const {
  auditLoggerMiddleware,
} = require("../middlewares/auditLogMiddleware.js");
const activityLogger = require("../middlewares/activityLogger.js");

router.post(
  "/subscribe",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  activityLogger("user subscribed"),
  auditLoggerMiddleware("Tenant", "subscribed"),
  stripeSubscription
);
router.get("/stripe-success", stripeSuccess);
router.post(
  "/cancel-subscription",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  activityLogger("user subscription cancelled"),
  auditLoggerMiddleware("Tenant", "subscription-cancelled"),
  stripeCancelSubscription
);

router.get(
  "/check-subscription",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  activityLogger("user subscription checked"),
  stripeCheckSubscription
);

module.exports = router;
