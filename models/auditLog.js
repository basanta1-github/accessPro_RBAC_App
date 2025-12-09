const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: { type: String, required: true }, // eg create update delete view
    resource: { type: String, required: true }, // eg user tenant project
    metadata: { type: Object, default: {} }, // flexible playload: what changed, ids, diff etc
    timestamp: { type: Date, default: Date.now() },
  },
  { timeStamps: false }
);

const AuditLog = mongoose.model("AuditLog", auditLogSchema);
module.exports = AuditLog;
