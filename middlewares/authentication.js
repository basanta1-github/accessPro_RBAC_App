const jwt = require("jsonwebtoken");
const BlackListedTokens = require("../models/blackListedToken");

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer")) {
    return res.status(401).json({ message: "No token provided" });
  }
  const token = authHeader.split(" ")[1];
  // check blacklist
  const blacklisted = await BlackListedTokens.findOne({ token });
  if (blacklisted) {
    return res.status(401).json({ message: "Token expired / logged out" });
  }

  jwt.verify(token, process.env.JWT_ACCESS_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: "Invalid token.." });
    req.user = decoded;
    req.tenant = decoded;
    next();
  });
};

module.exports = protect;
