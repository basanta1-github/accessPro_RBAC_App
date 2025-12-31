const express = require("express");
const router = express.Router();
const protect = require("../middlewares/authentication.js");

const {
  stripeSubscription,
  stripeSuccess,
  stripeCancelSubscription,
  stripeCheckSubscription,
} = require("..//controllers/stripeControllers.js");
const tenantSubDomainMiddleware = require("../middlewares/tenantSubDomain.js");
const attachTenant = require("..//middlewares/attachTenant.js");
const withActivityLog = require("../middlewares/controllerLogger.js");

router.post(
  "/subscribe",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  stripeSubscription
  // withActivityLog(stripeSubscription, "SUBSCRIPTION")
);
router.get("/stripe-success", stripeSuccess);
router.post(
  "/cancel-subscription",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  stripeCancelSubscription
);

router.get(
  "/check-subscription",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  withActivityLog(stripeCheckSubscription, "SUBSCRIPTION_CHECKED")
);

module.exports = router;
