const mongoose = require("mongoose");
const softDeletePlugin = require("../plugins/softDelete");
const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: String,
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: "true",
    },
    isDeleted: { type: Boolean, default: false }, // soft delete flag
  },
  { timestamps: true }
);
projectSchema.plugin(softDeletePlugin);
module.exports = mongoose.model("Project", projectSchema);
