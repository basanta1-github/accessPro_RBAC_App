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
router.post(
  "/subscribe",
  protect,
  tenantIsolation,
  tenantMiddleware,
  stripeSubscription
);
router.get("/stripe-success", stripeSuccess);
router.post("/cancel-subscription", protect, stripeCancelSubscription);

router.get(
  "/check-subscription",
  protect,
  tenantIsolation,
  tenantMiddleware,
  stripeCheckSubscription
);

module.exports = router;
