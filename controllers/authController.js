const Tenant = require("../models/Tenant");
const User = require("../models/User");
const Roles = require("../models/Roles");
const bcrypt = require("bcrypt");
const passwordPolicy = require("../utils/passwordPolicy");
const crypto = require("crypto");
const sendPasswordResetEmail = require("../utils/htmltemplates/sendPasswordResetEmail");

const {
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/generateTokens");
const createdefaultRoles = require("../utils/createDefaultroles");
const jwt = require("jsonwebtoken");
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
      // fake user for logging
      req.user = {
        _id: null,
        tenantId: null,
        email: email || null,
        role: null,
      };
      req.tenant = null;
      return res.status(400).json({
        message: `${missingfields.join(", ")} ${
          missingfields.length > 1 ? "are" : "is"
        } required`,
      });
    }

    // Check if tenant with same name, domain, or email already exists
    const existingTenant = await Tenant.findOne({
      $or: [{ name: companyName }, { domain }, { email }],
    });

    if (existingTenant) {
      req.user = { _id: null, tenantId: existingTenant._id, email, role: null };
      req.tenant = existingTenant;
      return res.status(400).json({
        message:
          "Tenant with this company name, domain, or email already exists",
      });
    }

    // password policy check
    const passwordError = passwordPolicy(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    // creating tenant
    const tenant = await Tenant.create({ name: companyName, domain, email });

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
    const role = await Roles.findOne({
      name: user.role,
      tenantId: tenant._id,
    });
    const permissions = role ? role.permissions : [];

    req.user = user;
    req.tenant = tenant;

    res.status(201).json({
      message: "company registered and owner user created successfully",
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
    const name = companyName;

    const tenant = await Tenant.findOne({ name });
    if (!tenant) {
      return res.status(400).json({ message: "Invalid company name" });
    }
    const user = await User.findOne({ email, tenantId: tenant._id }).setOptions(
      {
        _skipSoftDelete: ["User"],
      }
    );
    if (!user)
      return res
        .status(400)
        .json({ message: "Invalid Credentials or company name" });

    if (user.isDeleted) {
      return res
        .status(403)
        .json({ message: "User is deleted and cannot login" });
    }
    // check if account is temporary locked due to multiple failed login attempts
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const remaining = Math.ceil((user.lockUntil - Date.now()) / 1000 / 60);
      return res.status(403).json({
        message: `Account is temporarily locked due to multiple failed login attempts. Try again in ${remaining} minutes.`,
      });
    }
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      // Fake "user" for logging purposes
      req.user = {
        _id: null, // unknown user ID
        tenantId: null, // unknown tenant
        role: null,
        email: req.body.email, // optional, for reference
      };
      req.tenant = null;

      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

      // lock account if failed attempts exceed 5
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = Date.now() + 15 * 60 * 1000; // lock for 15 minutes
      }
      await user.save();

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
    // reset failed login attempts on successful login
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.lastLogin = new Date();
    await user.save();

    /**
     * OPTIONAL 2FA
     * Only trigger if user explicitly enabled it
     */

    if (
      ["admin", "owner"].includes(user.role) &&
      user.twoFactor?.enabled === true
    ) {
      return res.status(200).json({
        message: "2FA verification required FOR admin /OWNER",
        action: "verify-2fa-login",
        userId: user._id,
      });
    }

    // no 2fa -> issue tokens

    // req.user = user;

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
      email: user.email,
    });
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
    // console.log(decoded);
    const expiresAt = new Date(decoded.exp * 1000);
    await BlackListedTokens.create({ token, expiresAt });
  }

  res.json({ message: "logged out successfully" });
};

const directResetPassword = async (req, res) => {
  try {
    const { email, companyName, newPassword } = req.body;

    if (!email || !companyName || !newPassword) {
      req.user = {
        _id: null,
        tenantId: null,
        email: email || null,
        role: null,
      };
      req.tenant = null;
      return res.status(400).json({
        message: "email, companyName, and new password are required",
      });
    }
    const user = await User.findOne({ email, companyName });
    if (!user) {
      req.user = { _id: null, tenantId: null, email, role: null };
      req.tenant = null;
      return res
        .status(404)
        .json({ message: "user not found with these details" });
    }
    if (await bcrypt.compare(newPassword, user.password)) {
      req.user = user;
      req.tenant = null;
      return res
        .status(404)
        .json({ message: "old password and new password cannot be same" });
    }
    const passwordError = passwordPolicy(newPassword);
    if (passwordError) {
      req.user = user;
      req.tenant = null;
      return res.status(400).json({ message: passwordError });
    }
    user.password = newPassword;
    await user.save();
    // ✅ Generate a dummy reset link for email
    const resetToken = crypto.randomBytes(20).toString("hex");
    const resetLink = `https://app.accesspro.com/reset-password/${resetToken}`;

    await sendPasswordResetEmail(user, resetLink);

    req.user = user;
    req.tenant = { _id: user.tenantId }; // optional for logging
    return res.json({
      message:
        "password reset successful. now you can login with your new password",
    });
  } catch (error) {
    req.user = {
      _id: null,
      tenantId: null,
      email: req.body.email || null,
      role: null,
    };
    req.tenant = null;
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { register, login, refresh, logout, directResetPassword };
