const mongoose = require("mongoose");
const softDeletePlugin = require("../plugins/softDelete");
const inviteSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "employee"],
      default: "employee",
    },
    token: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ["Pending", "Accepted", "Expired"],
      default: "Pending",
    },
  },
  { timestamps: true }
);
module.exports = mongoose.model("Invite", inviteSchema);
