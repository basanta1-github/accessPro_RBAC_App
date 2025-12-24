const rateLimit = require("express-rate-limit");

const globalRateLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 10000,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Global daily limit exceeded. try again tommorow",
});

module.exports = globalRateLimiter;
