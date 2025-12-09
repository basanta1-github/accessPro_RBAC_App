const Tenant = require("../models/Tenant");
const tenantMiddleware = async (req, res, next) => {
  const tenantId = req.user?.tenantId;
  if (!tenantId) return res.status(400).json({ message: "tenant Not found" });

  req.tenant = await Tenant.findById(tenantId);
  if (!req.tenant) return res.status(404).json({ message: "Tenant not found" });
  next();
};

module.exports = tenantMiddleware;
