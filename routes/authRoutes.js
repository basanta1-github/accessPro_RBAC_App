const express = require("express");
const router = express.Router();
const { auditLoggerMiddleware } = require("../middlewares/auditLogMiddleware");

const protect = require("../middlewares/authentication");
const {
  register,
  login,
  logout,
  refresh,
  directResetPassword,
} = require("../controllers/authController");
router.post("/register", register);
router.post("/login", login, auditLoggerMiddleware("Logged-in", "User"));
router.post(
  "/password-reset",
  directResetPassword,
  auditLoggerMiddleware("password-reseted", "User")
);
router.post(
  "/logout",
  protect,
  auditLoggerMiddleware("User", "logged-out"),
  logout
);
router.post("/refresh", refresh);

module.exports = router;
