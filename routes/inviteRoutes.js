const express = require("express");
const router = express.Router();

const protect = require("../middlewares/authentication.js");
const authorize = require("../middlewares/authorize.js");
const restrictByUserLimit = require("../middlewares/restrictByUserLimit.js");
const {
  inviteUser,
  acceptInvite,
  getUsers,
  updateUser,
  deactiveUser,
} = require("../controllers/userInviteController.js");
const tenantSubDomainMiddleware = require("../middlewares/tenantSubDomain.js");
const attachTenant = require("../middlewares/attachTenant.js");
const { cacheMiddleware } = require("../middlewares/cache.js");
const withActivityLog = require("../middlewares/controllerLogger.js");

router.post(
  "/invite",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  restrictByUserLimit,
  authorize(["user:create"]),
  withActivityLog(inviteUser, "INVITE_USER")
);

router.post(
  "/accept-invite",
  withActivityLog(acceptInvite, "ACCEPT_INVITE", {
    allowUserTenantFallback: true,
  })
);

router.get(
  "/getUsers",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  authorize(["user:view"]),
  cacheMiddleware((req) => `users:tenantId:${req.tenantId}`, 200),
  withActivityLog(getUsers, "GET_USERS")
);

router.put(
  "/:id",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  authorize(["user:update"]),
  withActivityLog(updateUser, "UPDATE_USER")
);

router.put(
  "/:id/deactive",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  authorize(["user:deactivated"]),
  withActivityLog(deactiveUser, "DEACTIVE_USER")
);

module.exports = router;
