const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");

const loginRateLimiter =
  process.env.NODE_ENV === "test"
    ? (req, res, next) => next() // no-op for tests
    : rateLimit({
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 5, // limit each IP to 5 requests per windowMs
        keyGenerator: (req) => {
          const ip = ipKeyGenerator(req);
          const tenant = req.body.companyName || "unknown";
          return `${ip}:{tenant}`;
        },
        handler: (req, res) => {
          res.status(429).json({
            message: "too many login attemts please try again later",
          });
        },
      });

module.exports = loginRateLimiter;
