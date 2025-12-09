const mongoose = require("mongoose");

const tenantAuditLogSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    action: {
      type: String,
      enum: ["create", "update", "deactive"],
      required: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    changes: {
      type: Object,
    }, // tracks the updated fields
  },
  { timestamps: true }
);

const tenantAuditLog = mongoose.model("TenantAuditLog", tenantAuditLogSchema);
module.exports = tenantAuditLog;
