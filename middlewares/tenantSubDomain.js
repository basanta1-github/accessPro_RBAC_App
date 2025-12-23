const Tenant = require("../models/Tenant");

// middleware to attach tenant based on the subdomain or x-tenant header

const tenantSubDomainMiddleware = async (req, res, next) => {
  try {
    const tenantDomain = req.headers["x-tenant"] || req.subdomains?.[0];

    if (!tenantDomain) {
      return res.status(400).json({ message: "Tenant not provided" });
    }
    const tenant = await Tenant.findOne({ domain: tenantDomain });

    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }
    req.tenant = tenant;
    next();
  } catch (error) {
    console.error("Tenant detection failed:", error);
    return res.status(500).json({ message: "Tenant detection failed" });
  }
};

module.exports = tenantSubDomainMiddleware;
