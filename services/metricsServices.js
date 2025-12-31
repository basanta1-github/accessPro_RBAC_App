const ActivityMetric = require("../models/activityMetric");

const getActiveUsers = async (tenantId, hours = 24) => {
  return ActivityMetric.distinct("userId", {
    tenantId,
    createdAt: { $gte: new Date(Date.now() - hours * 60 * 60 * 1000) },
  });
};
const getRequestsPerDay = async (tenantId, days = 7) => {
  return ActivityMetric.aggregate([
    {
      $match: {
        tenantId,
        createdAt: {
          $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
        },
      },
    },
    {
      $group: {
        _id: {
          day: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
        },
        requests: { $sum: 1 },
      },
    },
    { $sort: { "_id.day": 1 } },
  ]);
};

module.exports = {
  getActiveUsers,
  getRequestsPerDay,
};
