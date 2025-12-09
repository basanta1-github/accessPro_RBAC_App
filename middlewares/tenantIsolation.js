const tenantIsolation = (req, res, next) => {
  if (!req.user || !req.user.tenantId)
    return res.status(401).json({ message: "Unauthorized" });
  req.tenantId = req.user.tenantId;
  next();
};

module.exports = tenantIsolation;
