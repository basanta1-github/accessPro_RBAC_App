const AuditLog = require("../models/auditLog");

const logAudit = async ({
  req,
  action,
  resource,
  metadata = {},
  tenantId,
  userId,
}) => {
  // if no tenant / user on req, skip silently safely
  //   if (!req?.user?.userId || !req?.user?.tenantId) return null;

  const resolvedTenantId = req?.user?.tenantId || tenantId;
  const resolvedUserId = req?.user?.userId || userId;

  if (!resolvedTenantId || !resolvedUserId) {
    console.warn("Skipping audit log: missing tenantId or userId");
    return null;
  }
  try {
    const entry = await AuditLog.create({
      tenantId: resolvedTenantId,
      userId: resolvedUserId,
      action,
      resource,
      metadata,
      timestamp: new Date(),
    });
    return entry;
  } catch (error) {
    // dont throw - logging should not break main flow
    console.error("Audit logging failed", error);
    return null;
  }
};
/**
 * Middleware factory to automatically log route actions.
 * Usage: router.post("/", protect, tenantIsolation, authorize([...]),
 *  auditLoggerMiddleware("User","create"), createUser)
 *
 * The middleware will:
 * - run before controller (captures request data)
 * - use req.user and req.tenantId
 * - for create/update/delete captures a small metadata bundle by default
 */

const auditLoggerMiddleware = (resource = "unknown", action = "action") => {
  return async (req, res, next) => {
    try {
      const tenantId = req?.user?.tenantId;
      const userId = req?.user?.userId;
      // collect lightweight metadata but avoid logging sensitive info like raw passwords
      const metadata = {
        method: req.method,
        path: req.originalUrl,
        params: req.params || {},
        ip: req.ip,
        email: req.body?.email,
        method: req.method,
        path: req.originalUrl,
        // include non-sensative body fields (exclude password, tokens)
        body: (() => {
          if (!req.body) return {};
          const clone = { ...req.body };
          if (clone.password) clone.password = "[REDACTED]";
          if (clone.token) clone.token = "[REDACTED]";
          return clone;
        })(),
        query: req.query || {},
      };

      // attach a small marker for the controller to use later (optional)
      req._audit = { resource, action, metadata, preLogged: true };

      // Create the log entry (non-blocking for controller behavior)
      // await logAudit({ req, action, resource, metadata });
      // Instead of awaiting, call but don't block — safer for performance

      logAudit({ req, action, resource, metadata, tenantId, userId }).catch(
        (err) => {
          console.error("Audit log failed in middleware", err);
        }
      );
      next();
    } catch (error) {
      // even if audit fails, do not block request
      console.log("Audit middleware error", error);
      next();
    }
  };
};

module.exports = { logAudit, auditLoggerMiddleware };
