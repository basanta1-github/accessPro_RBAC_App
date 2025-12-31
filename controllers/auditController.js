const ActivityMetric = require("../models/activityMetric");
const asyncHandler = require("../middlewares/asyncHandler");
const { Parser: Json2csvParser } = require("json2csv");

const getAuditLogs = asyncHandler(async (req, res) => {
  const tenantId = req.tenant._id;
  const page = Math.max(1, parseInt(req.query.page || "1", 10));
  const limit = Math.max(
    1,
    Math.min(100, parseInt(req.query.limit || "25", 10))
  );
  const skip = (page - 1) * limit;

  // build filter - tenant - scoped
  const filter = { tenantId };

  if (req.query.userId) filter.userId = req.query.userId;
  if (req.query.action) filter.action = req.query.action;
  if (req.query.resource) filter.resource = req.query.resource;

  // date range
  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
    if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
  }
  const total = await ActivityMetric.countDocuments(filter);
  const logs = await ActivityMetric.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  res.json({ total, page, limit, pages: Math.ceil(total / limit), logs });
});

/**
 * GET /api/audit/export
 * Exports logs to CSV using same filters as getAuditLogs.
 * Query param: fields (optional comma separated list to include), default includes standard fields.
 */

const exportAuditLogsCSV = asyncHandler(async (req, res) => {
  const tenantId = req.tenant._id;

  const filter = { tenantId };

  if (req.query.userId) filter.userId = req.query.userId;
  if (req.query.action) filter.action = req.query.action;
  if (req.query.resource) filter.resource = req.query.resource;
  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
    if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
  }
  // fetch all matching (be cautious in prod; consider streaming / limits)
  const logs = await ActivityMetric.find(filter).sort({ createdAt: -1 }).lean();

  // Prepare rows for CSV: flatten metadata to JSON-string to avoid nested issues

  const rows = logs.map((l) => ({
    tenantId: l.tenantId?.toString(),
    userId: l.userId?.toString(),
    role: l.role,
    action: l.action,
    resource: l.resource,
    method: l.method,
    path: l.path,
    statusCode: l.statusCode,
    success: l.success,
    ip: l.ip,
    createdAt: l.createdAt?.toISOString(),
    metadata: JSON.stringify(l.metadata || {}),
  }));
  const parser = new Json2csvParser({
    fields: Object.keys(rows[0] || {}),
  });
  const csv = parser.parse(rows);

  res.header("Content-Type", "text/csv");
  res.attachment(`audit-logs-${new Date().toISOString().slice(0, 19)}.csv`);
  res.send(csv);
});

module.exports = { getAuditLogs, exportAuditLogsCSV };
