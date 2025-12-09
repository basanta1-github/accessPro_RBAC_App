const restrictByPlan = (allowedPlans) => {
  return (req, res, next) => {
    const plan = req.user?.tenant?.subscription?.plan || "Free";
    if (!allowedPlans.includes(plan)) {
      return res
        .status(403)
        .json({ message: `Your plan (${plan}) does not allow this feature.` });
    }
    next();
  };
};

module.exports = restrictByPlan;
