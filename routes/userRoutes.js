const express = require("express");
const router = express.Router();

const protect = require("../middlewares/authentication.js");
const authorize = require("../middlewares/authorize.js");

const restrictByUserLimit = require("../middlewares/restrictByUserLimit.js");
const {
  createUser,
  getUsers,
  deleteUser,
  softDeleteUser,
  restoreUser,
} = require("../controllers/userActionControllers.js");
const tenantSubDomainMiddleware = require("../middlewares/tenantSubDomain.js");
const attachTenant = require("../middlewares/attachTenant.js");
const withActivityLog = require("../middlewares/controllerLogger.js");
const { cacheMiddleware } = require("../middlewares/cache.js");

router.get(
  "/getUsers",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  cacheMiddleware((req) => `users:tenantId:${req.tenantId}`, 300),
  withActivityLog(getUsers, "VIEW_USERS")
);
router.post(
  "/create",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  restrictByUserLimit,
  authorize(["user:create:employee", "user:create:admin"]),
  withActivityLog(createUser, "CREATE_USER")
);

router.delete(
  "/delete/:id",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  authorize(["user:delete:employee", "user:delete:admin"]),
  withActivityLog(deleteUser, "DELETE_USER")
);

router.put(
  "/soft-delete/:id",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  authorize(["user:deactivated"]),
  withActivityLog(softDeleteUser, "DEACTIVE_USER")
);
router.put(
  "/restore/:id",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  authorize(["user:restored"]),

  withActivityLog(restoreUser, "RESTORE_USER")
);

module.exports = router;
