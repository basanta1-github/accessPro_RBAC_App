const attachTenant = (req, res, next) => {
  if (!req.user || !req.user.tenantId)
    return res.status(401).json({ message: "Unauthorized" });

  if (req.user.tenantId.toString() !== req.tenant._id.toString()) {
    return res.status(403).json({ message: "Cross-tenant access" });
  }

  req.tenantId = req.tenant._id;
  req.user.tenant = req.tenant;
  next();
};

module.exports = attachTenant;
