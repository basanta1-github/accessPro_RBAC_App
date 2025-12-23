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

router.post(
  "/invite",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  restrictByUserLimit,
  authorize(["user:create"]),
  auditLoggerMiddleware("User", "invited"),
  inviteUser
);

router.post("/accept-invite", acceptInvite);

router.get(
  "/getUsers",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  authorize(["user:view"]),
  auditLoggerMiddleware("User", "viewed"),
  getUsers
);

router.put(
  "/:id",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  authorize(["user:update"]),
  auditLoggerMiddleware("User", "updated"),
  updateUser
);

router.put(
  "/:id/deactive",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  authorize(["user:deactivated"]),
  auditLoggerMiddleware("User", "deactivated"),
  deactiveUser
);

module.exports = router;
