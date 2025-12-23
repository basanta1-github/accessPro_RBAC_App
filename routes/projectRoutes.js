const express = require("express");
const router = express.Router();

const protect = require("../middlewares/authentication.js");
const authorize = require("../middlewares/authorize.js");
const {
  auditLoggerMiddleware,
} = require("../middlewares/auditLogMiddleware.js");
const tenantSubDomainMiddleware = require("../middlewares/tenantSubDomain.js");
const attachTenant = require("../utils/attachTenant.js");
const {
  createProject,
  getProjects,
  updateProject,
  deleteProject,
  softDeleteProject,
  restoreProject,
} = require("../controllers/projectControllers.js");

// create new project
router.post(
  "/create",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  authorize(["project:create"]),
  auditLoggerMiddleware("Project", "created"),
  createProject
);
// get all projects
router.get(
  "/getProjects",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  authorize(["project:view"]),
  auditLoggerMiddleware("Project", "viewed"),
  getProjects
);
//update
router.put(
  "/update/:id",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  authorize(["project:update"]),
  auditLoggerMiddleware("Project", "updated"),
  updateProject
);
//delete
router.delete(
  "/delete/:id",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  authorize(["project:delete"]),
  auditLoggerMiddleware("Project", "deleted"),
  deleteProject
);
router.put(
  "/softDelete/:id",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  authorize(["project:deactivated"]),
  auditLoggerMiddleware("Project", "soft-delete"),
  softDeleteProject
);
router.put(
  "/restore/:id",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  authorize(["project:restored"]),
  auditLoggerMiddleware("Project", "restored"),
  restoreProject
);

module.exports = router;
