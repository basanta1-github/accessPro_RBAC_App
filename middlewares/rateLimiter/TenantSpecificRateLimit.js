const rateLimit = require("express-rate-limit");

const getRateLimit = (plan) => {
  switch (plan) {
    case "Free":
      return 100;
    case "Pro":
      return 1000;
    case "Enterprise":
      return 5000;
    default:
      return 100;
  }
};

const tenantRateLimiter = (req, res, next) => {
  const plan = req.user?.tenant?.subscription?.plan || "Free";
  const limit = getRateLimit(plan);

  return rateLimit({
    windowMs: 60 * 60 * 100,
    max: limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: `Rate limit exceeded for ${plan} plan.`,
  })(req, res, next);
};

module.exports = tenantRateLimiter;
