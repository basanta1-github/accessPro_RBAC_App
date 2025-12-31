// controllers/adminMetricsController.js
const asyncHandler = require("../../middlewares/asyncHandler");
const ActivityMetric = require("../../models/activityMetric");

const getAdminMetrics = asyncHandler(async (req, res) => {
  const totalRequests = await ActivityMetric.countDocuments();
  const totalUsers = await ActivityMetric.distinct("userId");
  const totalTenants = await ActivityMetric.distinct("tenantId");

  res.json({
    systemKPIs: {
      totalRequests,
      totalUsers: totalUsers.length,
      totalTenants: totalTenants.length,
    },
  });
});

module.exports = { getAdminMetrics };
