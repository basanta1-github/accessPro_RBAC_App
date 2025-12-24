const tenantRateLimiter = require("./TenantSpecificRateLimit");
const globalRateLimiter = require("./globalSpecificRateLimit");

const appRateLimiter = (req, res, next) => {
  globalRateLimiter(req, res, () => {
    tenantRateLimiter(req, res, next);
  });
};

module.exports = appRateLimiter;
