const jwt = require("jsonwebtoken");
const BlackListedTokens = require("../models/blackListedToken");
const User = require("../models/User");
const Tenant = require("../models/Tenant");

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer")) {
      return res.status(401).json({ message: "No token provided" });
    }
    const token = authHeader.split(" ")[1];

    // check if token is blacklisted
    const blacklisted = await BlackListedTokens.findOne({ token });
    if (blacklisted)
      return res.status(401).json({ message: "Token expired / logged out" });

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    // console.log(decoded);

    // fetch user & tenant
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    const tenant = await Tenant.findById(decoded.tenantId);
    if (!tenant) return res.status(404).json({ message: "Tenant not found" });

    req.user = user; // Full Mongoose document
    req.tenant = tenant; // Full Mongoose document
    next();
  } catch (err) {
    console.error("Auth Error:", err);
    res.status(401).json({ message: "Not authorized", error: err.message });
  }
};

module.exports = protect;
