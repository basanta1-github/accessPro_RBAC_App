const ActivityMetric = require("../models/activityMetric");

const activityLogger = (customAction) => async (req, res, next) => {
  try {
    if (!req.tenant?._id) {
      console.log(
        "activity logger skipped because req.tenant._id is undefined"
      );
      return next();
    }

    const doc = {
      tenantId: req.tenant._id,
      userId: req.user?._id,
      role: req.user?.role,

      action: `${req.method} ${req.baseUrl || req.path}`,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,

      resourceType: req.params?.id ? req.baseUrl : null,
      resourceId: req.params?.id || null,

      ip: req.ip,
      userAgent: req.headers["user-agent"],
      origin: req.headers.origin,
      referer: req.headers.referer,
      subdomain: req.subdomains?.[0],

      success: res.statusCode < 400,

      isAdminAction: req.originalUrl.startsWith("/api/admin"),
      isBillingAction: req.originalUrl.startsWith("/api/billing"),
      isAuthAction: req.originalUrl.startsWith("/"),
    };

    // async fire and forget do not wait
    ActivityMetric.create(doc).catch((err) => {
      console.error("ActivityLogger failed:", err);
    });

    // console.log("activity logger triggered", doc.action);
    next();
  } catch (error) {
    console.error("ActivityLogger error:", error);
    next();
  }
};
module.exports = activityLogger;
