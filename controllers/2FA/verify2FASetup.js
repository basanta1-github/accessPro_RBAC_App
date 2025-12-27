const speakeasy = require("speakeasy");
const User = require("../../models/User");

const verify2FASetup = async (req, res) => {
  const { token } = req.body;
  const user = await User.findById(req.user._id);

  const verified = speakeasy.totp.verify({
    secret: user.twoFactor.secret,
    encoding: "base32",
    token,
    window: 1, // allow 30 sec window before and after
  });
  if (!verified) {
    return res.status(400).json({ message: "Invalid OTP" });
  }
  user.twoFactor.enabled = true;
  await user.save();
  res.json({ message: "2FA enabled successfully", userId: user._id });
};

module.exports = verify2FASetup;
