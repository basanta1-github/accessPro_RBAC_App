const jwt = require("jsonwebtoken");

const generateInviteToken = (invite) => {
  return jwt.sign(
    {
      email: invite.email,
      tenantId: invite.tenantId,
      tenantName: invite.tenantName,
      role: invite.role,
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: "7d" }
  );
};

module.exports = generateInviteToken;
