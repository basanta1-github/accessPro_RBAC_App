const express = require("express");
const router = express.Router();
const { auditLoggerMiddleware } = require("../middlewares/auditLogMiddleware");
const activityLogger = require("../middlewares/activityLogger");
const protect = require("../middlewares/authentication");
const {
  register,
  login,
  logout,
  refresh,
  directResetPassword,
} = require("../controllers/authController");

router.post("/register", activityLogger(" registered"), register);
router.post(
  "/login",
  activityLogger("logged in"),
  login,
  auditLoggerMiddleware("Logged-in", "User")
);
router.post(
  "/password-reset",
  activityLogger("password-reset"),
  directResetPassword,
  auditLoggerMiddleware("password-reseted", "User")
);
router.post(
  "/logout",
  protect,
  activityLogger("logged-out"),
  auditLoggerMiddleware("User", "logged-out"),
  logout
);
router.post("/refresh", refresh);

module.exports = router;
