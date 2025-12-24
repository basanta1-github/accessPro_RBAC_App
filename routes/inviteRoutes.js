const express = require("express");
const router = express.Router();

const protect = require("../middlewares/authentication.js");
const authorize = require("../middlewares/authorize.js");
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
const tenantSubDomainMiddleware = require("../middlewares/tenantSubDomain.js");
const attachTenant = require("../utils/attachTenant.js");
const activityLogger = require("../middlewares/activityLogger.js");

router.post(
  "/invite",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  restrictByUserLimit,
  authorize(["user:create"]),
  activityLogger("invite user"),
  auditLoggerMiddleware("User", "invited"),
  inviteUser
);

router.post("/accept-invite", activityLogger("accepted invite"), acceptInvite);

router.get(
  "/getUsers",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  authorize(["user:view"]),
  activityLogger("get users"),
  getUsers
);

router.put(
  "/:id",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  authorize(["user:update"]),
  activityLogger("update user"),
  auditLoggerMiddleware("User", "updated"),
  updateUser
);

router.put(
  "/:id/deactive",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  authorize(["user:deactivated"]),
  activityLogger("deactive users"),
  auditLoggerMiddleware("User", "deactivated"),
  deactiveUser
);

module.exports = router;
