const express = require("express");
const router = express.Router();
const protect = require("../middlewares/authentication.js");
const tenantIsolation = require("../middlewares/tenantIsolation.js");
const tenantMiddleware = require("../middlewares/tenantMiddleware.js");

const {
  stripeSubscription,
  stripeSuccess,
  stripeCancelSubscription,
  stripeCheckSubscription,
} = require("../controllers/stripeControllers.js");
const tenantSubDomainMiddleware = require("../middlewares/tenantSubDomain.js");
const attachTenant = require("../utils/attachTenant.js");

router.post(
  "/subscribe",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  stripeSubscription
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
  stripeCheckSubscription
);

module.exports = router;
