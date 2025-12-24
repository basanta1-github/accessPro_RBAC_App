const express = require("express");
const router = express.Router();

const protect = require("../middlewares/authentication.js");
const authorize = require("../middlewares/authorize.js");
const {
  auditLoggerMiddleware,
} = require("../middlewares/auditLogMiddleware.js");
const restrictByUserLimit = require("../middlewares/restrictByUserLimit.js");
const {
  createUser,
  getUsers,
  deleteUser,
  softDeleteUser,
  restoreUser,
} = require("../controllers/userActionControllers.js");
const tenantSubDomainMiddleware = require("../middlewares/tenantSubDomain.js");
const attachTenant = require("../utils/attachTenant.js");
const activityLogger = require("../middlewares/activityLogger.js");

router.get(
  "/getUsers",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  activityLogger("get users"),
  getUsers
);
router.post(
  "/create",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  restrictByUserLimit,
  authorize(["user:create:employee", "user:create:admin"]),
  activityLogger("user created"),
  auditLoggerMiddleware("User", "created"),
  createUser
);

router.delete(
  "/delete/:id",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  authorize(["user:delete:employee", "user:delete:admin"]),
  activityLogger("user deleted"),
  auditLoggerMiddleware("User", "deleted"),
  deleteUser
);

router.put(
  "/soft-delete/:id",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  authorize(["user:deactivated"]),
  activityLogger("user deactivated"),
  auditLoggerMiddleware("User", "soft-delete"),
  softDeleteUser
);
router.put(
  "/restore/:id",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  authorize(["user:restored"]),
  activityLogger("user restored"),
  auditLoggerMiddleware("User", "restore"),
  restoreUser
);

module.exports = router;
