const ActivityMetric = require("../models/activityMetric");

const activityLogger = {
  /**
   * Log an activity in one line from any controller
   * @param {Object} params
   * req: Express request object
   * user: logged-in user object
   * action: optional custom action string, defaults to `${method} ${path}`
   * extra: optional extra metadata
   */
  track: async ({
    req,
    res,
    user,
    action,
    resource,
    extra = {},
    allowUserTenantFallback = false,
  }) => {
    // if (process.env.NODE_ENV === "test") return Promise.resolve(); // skip all logging in tests
    try {
      const tenantId = req.tenant?._id;
      const userId = user?._id;

      // console.log(tenantId, userId);
      // Conditional skip
      if (!tenantId || !userId) {
        if (!allowUserTenantFallback) {
          return console.log("ActivityLogger skipped: no tenantId or userid");
        }
        // else allow logging even if tenantId/userId is null
      }

      const doc = {
        tenantId,
        userId,
        role: user?.role || null,
        action: action || `${req.method} ${req.originalUrl}`,
        method: req.method,
        path: req.originalUrl,
        statusCode: res?.statusCode || 200,
        resource: resource || null,
        resourceType: req.params?.id ? req.baseUrl : null,
        resourceId: req.params?.id || null,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
        origin: req.headers.origin,
        referer: req.headers.referer,
        subdomain: req.subdomains?.[0],
        success: res?.statusCode < 400,
        isAdminAction: req.originalUrl.startsWith("/api/admin"),
        isBillingAction: req.originalUrl.startsWith("/api/billing"),
        isAuthAction: req.originalUrl.startsWith("/"),
        metadata: {
          ...extra,
          params: req.params || {},
          query: req.query || {},
          body: (() => {
            if (!req.body) return {};
            const clone = { ...req.body };
            if (clone.password) clone.password = "[REDACTED]";
            if (clone.token) clone.token = "[REDACTED]";
            return clone;
          })(),
        },
      };

      // async fire-and-forget
      await ActivityMetric.create(doc).catch((err) => {
        console.error("ActivityLogger failed:", err);
      });

      // optional console log
      console.log("Activity logged:", doc.action);
    } catch (err) {
      console.error("ActivityLogger error:", err);
    }
  },
};

module.exports = activityLogger;
// }
