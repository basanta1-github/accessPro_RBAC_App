const User = require("../../models/User");
const speakeasy = require("speakeasy");
const Roles = require("../../models/Roles");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../../utils/generateTokens");

const verify2FALogin = async (req, res) => {
  const { userId, token } = req.body;

  const user = await User.findById(userId);
  if (!user || !user.twoFactor.enabled) {
    return res.status(400).json({ message: "invalid request" });
  }

  const verified = speakeasy.totp.verify({
    secret: user.twoFactor.secret,
    encoding: "base32",
    token,
    window: 1, // allow 30 sec window before and after
  });
  if (!verified) {
    return res.status(400).json({ message: "Invalid OTP" });
  }
  const role = await Roles.findOne({
    name: user.role,
    tenantId: user.tenantId,
  });

  // fetch role and permissions
  const permissions = role ? role.permissions : [];
  const accessToken = generateAccessToken(user, permissions);
  const refreshToken = generateRefreshToken(user);

  res.json({
    message: "2FA verification successful",
    accessToken,
    refreshToken,
    email: user.email,
  });
};

module.exports = verify2FALogin;
