const tenantKpiKey = (req) => {
  const tenantId = req.tenant._id.toString();
  const { from = "na", to = "na" } = req.query;

  return `kpi:tenant:${tenantId}:from:${from}:to:${to}`;
};

const adminKpiKey = () => "kpi:admin:system";

module.exports = { tenantKpiKey, adminKpiKey };
