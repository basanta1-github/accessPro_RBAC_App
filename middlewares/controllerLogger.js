// utils/controllerLogger.js
const activityLogger = require("../controllers/activityLogger");

const withActivityLog = (
  controller,
  resource = "User",
  activityOptions = {}
) => {
  return async (req, res) => {
    const originalJson = res.json.bind(res);
    const originalStatus = res.status.bind(res);

    let statusCode = 200;
    let responseBody = {};

    // Intercept res.status and res.json
    res.status = (code) => {
      statusCode = code;
      return res;
    };

    res.json = (body) => {
      responseBody = body;

      // Determine action type based on status
      const action =
        statusCode >= 400 ? `${resource}_FAILED` : `${resource}_SUCCESS`;

      // Determine reason automatically from response body
      const reason = body?.message || body?.error || null;

      // Fire-and-forget logging
      setImmediate(() => {
        activityLogger
          .track({
            req,
            res,
            user: req.user || null,
            action,
            resource,
            extra: { reason },
            allowUserTenantFallback:
              activityOptions.allowUserTenantFallback || false,
          })
          .catch((error) => {
            console.error("Activity Log Error:", error);
          });
      });

      return originalJson(body);
    };

    try {
      await controller(req, res);
    } catch (err) {
      statusCode = 500;
      responseBody = { message: err.message };
      activityLogger
        .track({
          req,
          res,
          user: req.user || null,
          action: `${resource}_FAILED`,
          resource,
          extra: { reason: err.message },
          allowUserTenantFallback:
            activityOptions.allowUserTenantFallback || false,
        })
        .catch((error) => {
          console.error("Activity Log Error:", error);
        });
      return originalStatus(500).json(responseBody);
    }
  };
};

module.exports = withActivityLog;
