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
  createUser,
  getUsers,
  deleteUser,
  softDeleteUser,
  restoreUser,
} = require("../controllers/userActionControllers.js");

router.get(
  "/getUsers",
  protect,
  tenantIsolation,
  auditLoggerMiddleware("User", "viewed"),
  getUsers
);
router.post(
  "/create",
  protect,
  tenantIsolation,
  restrictByUserLimit,
  authorize(["user:create:employee", "user:create:admin"]),
  auditLoggerMiddleware("User", "created"),
  createUser
);

router.delete(
  "/delete/:id",
  protect,
  tenantIsolation,
  authorize(["user:delete:employee", "user:delete:admin"]),
  auditLoggerMiddleware("User", "deleted"),
  deleteUser,
  (req, res) => {
    res.json({ message: `User ${req.params.id} deleted!` });
  }
);

router.put(
  "/delete/:id",
  protect,
  tenantIsolation,
  authorize(["user:deactivated"]),
  auditLoggerMiddleware("User", "soft-delete"),

  softDeleteUser
);
router.put(
  "/restore/:id",
  protect,
  tenantIsolation,
  authorize(["user:restored"]),
  auditLoggerMiddleware("User", "restore"),

  restoreUser
);

module.exports = router;
