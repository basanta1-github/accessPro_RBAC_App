const Tenant = require("../models/Tenant");
const TenantAuditLog = require("../models/tenantAuditLog");
const asyncHandler = require("../middlewares/asyncHandler");

// getting the tenant details admin and owner

const getAllTenants = asyncHandler(async (req, res) => {
  const tenants = await Tenant.find().select("-__v");
  res.status(200).json({ tenants });
});

const getTenant = asyncHandler(async (req, res) => {
  const tenant = await Tenant.findById(req.params.id);
  if (!tenant) return res.status(404).json({ message: "Tenant not found" });

  if (tenant._id.toString() !== req.user.tenantId.toString()) {
    return res.status(403).json({ message: "Access denied" });
  }
  res.status(200).json({ tenant });
});

const updateTenant = asyncHandler(async (req, res) => {
  const { name, subscriptionPlan, logo, domain } = req.body;

  const tenant = await Tenant.findById(req.params.id);
  if (!tenant) return res.status(404).json({ message: "tenant not found" });

  if (tenant._id.toString() !== req.user.tenantId.toString()) {
    return res.status(403).json({ message: "Access denied" });
  }

  if (req.user.role !== "owner" && req.user.role !== "admin") {
    return res
      .status(403)
      .json({ message: "only owner or admin can update the tenant" });
  }
  const changes = {};
  if (name && name !== tenant.name) {
    changes.name = { from: tenant.name, to: name };
    tenant.name = name;
  }
  if (subscriptionPlan && subscriptionPlan !== tenant.subscriptionPlan) {
    changes.subscriptionPlan = {
      from: tenant.subscriptionPlan,
      to: subscriptionPlan,
    };
    tenant.subscriptionPlan = subscriptionPlan;
  }
  if (logo && logo !== tenant.logo) {
    changes.logo = { from: tenant.logo, to: logo };
    tenant.logo = logo;
  }
  if (domain && domain !== tenant.domain) {
    changes.domain = { from: tenant.domain, to: domain };
    tenant.domain = domain;
  }

  tenant.status = "active";

  await tenant.save();

  //create audit log

  await TenantAuditLog.create({
    tenantId: tenant._id,
    action: "update",
    performedBy: req.user.userId,
    changes,
  });
  res.status(200).json({ message: "tenant updated", tenant });
});

//deactive tenant

const deactiveTenant = asyncHandler(async (req, res) => {
  const tenant = await Tenant.findById(req.user.tenantId);
  if (!tenant) return res.status(404).json({ message: "tenant not found" });

  tenant.status = "inactive";
  await tenant.save();

  await TenantAuditLog.create({
    tenantId: tenant._id,
    action: "deactive",
    performedBy: req.user.userId,
  });
  res.status(200).json({ message: "Tenant Deactivated", tenant });
});

module.exports = { getAllTenants, getTenant, updateTenant, deactiveTenant };
