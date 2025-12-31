const express = require("express");
const router = express.Router();
const withActivityLog = require("../middlewares/controllerLogger");
const protect = require("../middlewares/authentication");
const {
  register,
  login,
  logout,
  refresh,
  directResetPassword,
} = require("../controllers/authController");
const loginRateLimiter = require("../middlewares/rateLimiter/loginRateLimiter");
const passwordResetLimiter = require("../middlewares/rateLimiter/passwordResetLimiter");

const verify2FALogin = require("../controllers/2FA/verify2FALogin");
const setup2FA = require("../controllers/2FA/2FA_controller");
const verify2FASetup = require("../controllers/2FA/verify2FASetup");

// Auth routes
router.post(
  "/register",
  withActivityLog(register, "REGISTER", { allowUserTenantFallback: true })
);
router.post(
  "/login",
  loginRateLimiter,
  withActivityLog(login, "LOGIN", { allowUserTenantFallback: true })
);
router.post(
  "/password-reset",
  passwordResetLimiter,
  withActivityLog(directResetPassword, "PASSWORD_RESET", {
    allowUserTenantFallback: true,
  })
);
router.post("/logout", protect, withActivityLog(logout, "LOGOUT"));
router.post("/refresh", refresh);

// optional 2FA routes for admin/owner
router.post("/2fa/setup", protect, withActivityLog(setup2FA, "SETUP_2FA"));
router.post(
  "/2fa/verify-setup",
  protect,
  withActivityLog(verify2FASetup, "VERIFY_2FA_SETUP")
);
router.post(
  "/2fa/verify-login",
  protect,
  loginRateLimiter,
  withActivityLog(verify2FALogin, "VERIFY_2FA_LOGIN", {
    allowUserTenantFallback: true,
  })
);

module.exports = router;
