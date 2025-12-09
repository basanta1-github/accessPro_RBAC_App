const mongoose = require("mongoose");

const rolesSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  permissions: [{ type: String }],
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tenant",
    required: true,
  },
});

const Roles = mongoose.model("Roles", rolesSchema);
module.exports = Roles;
