const mongoose = require("mongoose");

const activityMetricSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      index: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    role: String,
    action: { type: String, index: true },
    resource: String,
    metadata: { type: Object, default: {} }, // add this from audit log
    method: String,
    path: String,
    statusCode: Number,
    resourceType: String,
    resourceId: String,
    ip: String,
    userAgent: String,
    origin: String,
    referer: String,
    subdomain: String,
    durationMs: Number,
    success: Boolean,
    errorCode: String,
    isAdminAction: Boolean,
    isBillingAction: Boolean,
    isAuthAction: Boolean,
  },
  { timestamps: true }
);

module.exports = mongoose.model("ActivityMetric", activityMetricSchema);
