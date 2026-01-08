const Tenant = require("../models/Tenant");
const User = require("../models/User");

const planUserLimits = {
  Free: 5,
  Pro: 10,
  Enterprise: Infinity,
};
const restrictByUserLimit = async (req, res, next) => {
  try {
    // If no user, skip (public routes like accept-invite)
    if (!req.user) {
      return next();
    }
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: "Tenant not found on user" });
    }

    const tenant = await Tenant.findById(tenantId);

    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }

    // assuming tenant has a feild maxUsers
    const plan = tenant.subscription?.plan || "Free";
    const maxUsers = planUserLimits[plan] || 5;

    const activeUsersCount = await User.countDocuments({
      tenantId,
      isDeleted: false,
      isActive: true,
    });
    if (activeUsersCount >= maxUsers) {
      return res.status(403).json({
        message: `User limit reached for this tenant (${plan} plan allows ${maxUsers} users). Contact owner for upgrade.`,
      });
    }
    next();
  } catch (error) {
    console.error("Error in restrictByUserLimit middleware:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = restrictByUserLimit;
