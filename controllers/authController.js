const Tenant = require("../models/Tenant");
const User = require("../models/User");
const Roles = require("../models/Roles");
const { logAudit } = require("../middlewares/auditLogMiddleware");
const bcrypt = require("bcrypt");

const {
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/generateTokens");
const createdefaultRoles = require("../utils/createDefaultroles");
const jwt = require("jsonwebtoken");
const { decode } = require("punycode");
const BlackListedTokens = require("../models/blackListedToken");

const register = async (req, res) => {
  try {
    const { name, email, password, companyName, domain } = req.body;

    const requiredField = [
      "name",
      "email",
      "password",
      "companyName",
      "domain",
    ];

    const missingfields = requiredField.filter((field) => !req.body[field]);

    if (missingfields.length > 0) {
      return res.status(400).json({
        message: `${missingfields.join(", ")} ${
          missingfields.length > 1 ? "are" : "is"
        } required`,
      });
    }

    // creating tenant
    const tenant = await Tenant.create({ name: companyName, domain });

    await createdefaultRoles(tenant._id);

    //create Admin user
    const user = new User({
      name,
      email,
      password,
      role: "owner",
      tenantId: tenant._id,
      companyName: tenant.name,
    });
    await user.save();
    // fetch role dynamically
    const role = await Roles.findOne({ name: user.role, tenantId: tenant._id });
    const permissions = role ? role.permissions : [];

    const accessToken = generateAccessToken(user, permissions);
    const refreshToken = generateRefreshToken(user);
    res.status(201).json({
      message: "company and owner registered",
      accessToken,
      refreshToken,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password, companyName } = req.body;

    if (!email || !password || !companyName) {
      return res
        .status(400)
        .json({ message: "please provide password email and comany name" });
    }
    const user = await User.findOne({ email, companyName });
    if (!user)
      return res
        .status(400)
        .json({ message: "Invalid Credentials or company name" });

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      const resetLink = `${process.env.BACKEND_DEV_URL}/password-reset`;

      return res.status(400).json({
        message:
          "Invalid email or password. If you want to reset your password, use the link below.",
        resetPasswordEndpoint: resetLink,
        howToUse:
          "Send a POST request with 'email' 'your new password' and 'companyName' to this endpoint.",
        bodyFormat: {
          email: "your email",
          conpanyName: "your company",
          newPassword: "your new password",
        },
      });
    }

    user.lastLogin = new Date();
    await user.save();

    req.user = user;

    const role = await Roles.findOne({
      name: user.role,
      tenantId: user.tenantId,
    });
    let permissions;
    if (role) {
      permissions = role.permissions;
    } else {
      permissions = [];
    }

    const accessToken = generateAccessToken(user, permissions);
    const refreshToken = generateRefreshToken(user);

    res.json({
      message: "Login successful",
      accessToken,
      refreshToken,
      email,
    });
    try {
      await logAudit({
        userId: user._id,
        tenantId: user.tenantId,
        req,
        action: "logged-in",
        resource: "User",
        metadata: {
          email: user.email,
          ip: req.ip,
          userAgent: req.headers["user-agent"],
        },
      });
    } catch (err) {
      console.log(err, "error fetching the login data");
    }
  } catch (error) {
    console.log(error);
  }
};

const refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(401).json({ message: "No refresh Token provided" });
  }
  jwt.verify(
    refreshToken,
    process.env.REFRESH_TOKEN_SECRET,
    async (err, decodeUser) => {
      if (err)
        return res.status(403).json({ message: "invalid refresh token" });

      //fetch the user
      const user = await User.findById(decodeUser.userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      // fetch the role dynamically
      const role = await Roles.findOne({
        name: user.role,
        tenantId: user.tenantId,
      });

      let permissions;
      if (role) {
        permissions = role.permissions;
      } else {
        permissions = [];
      }

      const accessToken = generateAccessToken(user, permissions);
      res.json({ accessToken, permissions });
    }
  );
};
const logout = async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (token) {
    // store token in blacklist
    const decoded = jwt.decode(token);
    const expiresAt = new Date(decoded.exp * 1000);
    await BlackListedTokens.create({ token, expiresAt });
  }

  res.json({ message: "logged out successfully" });
};

const directResetPassword = async (req, res) => {
  try {
    const { email, companyName, newPassword } = req.body;

    if (!email || !companyName || !newPassword) {
      return res.status(400).json({
        message: "email, companyName, and new password are required",
      });
    }
    const user = await User.findOne({ email, companyName });
    if (!user) {
      return res
        .status(404)
        .json({ message: "user not found with these details" });
    }
    if (await bcrypt.compare(newPassword, user.password)) {
      return res
        .status(404)
        .json({ message: "old password and new password cannot be same" });
    }
    user.password = newPassword;
    await user.save();
    return res.json({
      message:
        "password reset successful. now you can login with your new password",
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { register, login, refresh, logout, directResetPassword };
