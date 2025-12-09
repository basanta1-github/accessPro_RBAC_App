const mongoose = require("mongoose");
const softDeletePlugin = require("../plugins/softDelete");
const { type } = require("os");
const stripe = require("../utils/stripe");

const tenantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    domain: {
      type: String,
      unique: true,
    },
    email: {
      type: String,
      required: true,
    }, // for invoices
    subscription: {
      plan: {
        type: String,
        enum: ["Free", "Pro", "Enterprise"],
        default: "Free",
      },
      status: {
        type: String,
        enum: ["active", "canceled", "trialing", "past_due"],
        default: "active",
      },
      stripeCustomerId: {
        type: String,
      },
      stripeSubscriptionId: {
        type: String,
      },
      stripePaymentIntentId: {
        type: String,
      },
      currentPeriodEnd: {
        type: Date,
      },
      defaultPaymentMethod: {
        type: String,
      },
      amountPaid: {
        type: Number,
        default: 0,
      },
    },

    createdAt: {
      type: Date,
    },
    updatedAt: {
      type: Date,
    },
    logo: { type: String, default: "" }, /// URL or path
  },
  { timestamps: true }
);

tenantSchema.plugin(softDeletePlugin);
const Tenant = mongoose.model("Tenant", tenantSchema);
module.exports = Tenant;
