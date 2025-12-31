const asyncHandler = require("../../middlewares/asyncHandler");
const ActivityMetric = require("../../models/activityMetric");
const {
  getActiveUsers,
  getRequestsPerDay,
} = require("../../services/metricsServices");

const getTenantMetrics = asyncHandler(async (req, res) => {
  const tenantId = req.tenant._id;

  const totalRequests = await ActivityMetric.countDocuments({ tenantId });
  const activeUsers = await getActiveUsers(tenantId);
  const requestsPerday = await getRequestsPerDay(tenantId);

  res.json({
    tenantId,
    kpis: { totalRequests, activeUsers: activeUsers.length },
    charts: { requestsPerday },
  });
});

module.exports = { getTenantMetrics };
