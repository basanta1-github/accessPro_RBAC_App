const express = require("express");
const router = express.Router();

const protect = require("../middlewares/authentication.js");
const authorize = require("../middlewares/authorize.js");
const tenantIsolation = require("../middlewares/tenantIsolation.js");
const {
  auditLoggerMiddleware,
} = require("../middlewares/auditLogMiddleware.js");
const restrictByUserLimit = require("../middlewares/restrictByUserLimit.js");
const {
  inviteUser,
  acceptInvite,
  getUsers,
  updateUser,
  deactiveUser,
} = require("../controllers/userInviteController.js");

router.post(
  "/invite",
  protect,
  tenantIsolation,
  restrictByUserLimit,
  authorize(["user:create"]),
  auditLoggerMiddleware("User", "invited"),
  inviteUser
);

router.post("/accept-invite", acceptInvite);

router.get(
  "/getUsers",
  protect,
  tenantIsolation,
  authorize(["user:view"]),
  auditLoggerMiddleware("User", "viewed"),
  getUsers
);

router.put(
  "/:id",
  protect,
  tenantIsolation,
  authorize(["user:update"]),
  auditLoggerMiddleware("User", "updated"),
  updateUser
);

router.put(
  "/:id/deactive",
  protect,
  tenantIsolation,
  authorize(["user:deactivated"]),
  auditLoggerMiddleware("User", "deactivated"),
  deactiveUser
);

module.exports = router;
