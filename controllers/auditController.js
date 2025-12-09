const AuditLog = require("../models/auditLog");
const asyncHandler = require("../middlewares/asyncHandler");
const { Parser: Json2csvParser } = require("json2csv");

/**
 * GET /api/audit
 * Query params:
 *  - page (default 1)
 *  - limit (default 25)
 *  - userId
 *  - action
 *  - resource
 *  - from (ISO date)
 *  - to (ISO date)
 */

const getAuditLogs = asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const page = Math.max(1, parseInt(req.query.page || "1", 10));
  const limit = Math.max(
    1,
    Math.min(100, parseInt(req.query.limit || "25", 10))
  );
  const skip = (page - 1) * limit;

  // build filter - tenant - scoped
  const filter = { tenantId };

  if (req.query.userId) filter, (userId = req.query.userId);
  if (req.query.action) filter.action = req.query.action;
  if (req.query.resource) filter.resourse = req.query.resource;

  // date range
  if (req.query.from || req.query.to) {
    filter.timestamp = {};
    if (req.query.from) filter.timestamp.$gte = new Date(req.query.from);
    if (req.query.to) filter.timestamp.$lte = new Date(req.query.to);
  }
  const total = await AuditLog.countDocuments(filter);
  const logs = await AuditLog.find(filter)
    .sort({ timestamp: -1 })
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
  const tenantId = req.user.tenantId;

  const filter = { tenantId };

  if (req.query.userId) filter.userId = req.query.userId;
  if (req.query.action) filter.action = req.query.actiom;
  if (req.query.resource) filter.resource = req.query.resource;
  if (req.query.from || req.query.to) {
    filter.timestamp = {};
    if (req.query.from) filter.timestamp.$gte = new Date(req.query.from);
    if (req.query.to) filter.timestamp.$lte = new Date(req.query.to);
  }
  // fetch all matching (be cautious in prod; consider streaming / limits)
  const logs = await AuditLog.find(filter).sort({ timestamp: -1 }).lean;

  // Prepare rows for CSV: flatten metadata to JSON-string to avoid nested issues

  const rows = logs.map((r) => ({
    tenantId: r.tenantId?.toString?.() || "",
    userId: r.userId?.toString?.() || "",
    action: r.action,
    resource: r.resource,
    timestamp: r.timestamp ? new Date(r.timestamp).toISOString() : "",
    metadata: JSON.stringify(r.metadata || {}),
  }));
  const fields = req.query.fields
    ? req.query.fields.split(",").map((f) => f.trim())
    : ["tenantId", "userId", "action", "resource", "timestamp", "metadata"];

  const opts = { fields };
  const parser = new Json2csvParser(opts);
  const csv = parser.parse(rows);

  res.header("Content-Type", "text/csv");
  res.attachment(`audit-logs-${new Date().toISOString().slice(0, 19)}.csv`);
  res.send(csv);
});

module.exports = { getAuditLogs, exportAuditLogsCSV };
