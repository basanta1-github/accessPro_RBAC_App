const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const softDeletePlugin = require("../plugins/softDelete");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: "true",
    },
    email: { type: String, required: true, unique: true, index: true },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["owner", "admin", "employee"],
      default: "user",
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: "true",
    },
    // companyName: {
    //   type: String,
    // },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    twoFactor: {
      enabled: { type: Boolean, default: false },
      secret: { type: String },
    },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false }, // soft delete flag
  },
  { timestamps: true, strict: false }
);
userSchema.plugin(softDeletePlugin);
// hashed passwords
// this runs before user is saved
userSchema.pre("save", async function (next) {
  // only hash the password if its new or has been modified
  if (!this.isModified("password")) return next();
  //hash the pssword with bcrypt
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});
// plugin to automatically handle missing isDeleted in queries
userSchema.plugin(softDeletePlugin);
// userSchema.statics.softDeleteById = async function (id) {
//   const user = await this.findById(id).setOptions({
//     _skipSoftDelete: [this.modelName],
//   });
//   if (!user) {
//     throw new Error("User not found");
//   }
//   if (user.isDeleted) throw new Error("User is already soft-deleted");

//   user.isDeleted = true;
//   await user.save();
//   return user;
// };

// // Track original value
// userSchema.pre("init", function (doc) {
//   this._originalIsDeleted = doc.isDeleted;
// });
// compare passwords
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);
module.exports = User;
