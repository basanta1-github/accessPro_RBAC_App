const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const User = require("../../models/User");

const setup2FA = async (req, res) => {
  const user = await User.findById(req.user._id);

  // Only admins/owners allowed
  if (!["admin", "owner"].includes(user.role)) {
    return res.status(403).json({ message: "2FA only for admin/owner" });
  }

  //generate TOTP secret
  const secret = speakeasy.generateSecret({
    name: `AccessPro (${user.email})`, // shows in microsoft suthenticator app
  });

  user.twoFactor.secret = secret.base32;
  user.twoFactor.enabled = false; // not enabled until verified
  await user.save();

  const qrcode = await QRCode.toDataURL(secret.otpauth_url);

  res.json({
    qrcode,
    message:
      "Scan the QR code with your authenticator app and verify to enable 2FA",
    manualKey: secret.base32, //fallback
  });
};

module.exports = setup2FA;
