const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 60 minute
  max: 5, // limit each IP to 5 requests per windowMs
  keyGenerator: (req) => {
    const ip = ipKeyGenerator(req);
    const tenant = req.body.companyName || "unknown";
    return `${ip}:{tenant}`;
  },
  handler: (req, res) => {
    res.status(429).json({
      message: "too many password reset attemts please try again later",
    });
  },
});

module.exports = passwordResetLimiter;
