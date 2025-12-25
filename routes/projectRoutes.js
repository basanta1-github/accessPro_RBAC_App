const express = require("express");
const router = express.Router();

const protect = require("../middlewares/authentication.js");
const authorize = require("../middlewares/authorize.js");
const {
  auditLoggerMiddleware,
} = require("../middlewares/auditLogMiddleware.js");
const tenantSubDomainMiddleware = require("../middlewares/tenantSubDomain.js");
const attachTenant = require("../middlewares/attachTenant.js");
const {
  createProject,
  getProjects,
  updateProject,
  deleteProject,
  softDeleteProject,
  restoreProject,
} = require("../controllers/projectControllers.js");
const activityLogger = require("../middlewares/activityLogger.js");

// create new project
router.post(
  "/create",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  authorize(["project:create"]),
  activityLogger("create project"),
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
  activityLogger("get project"),
  getProjects
);
//update
router.put(
  "/update/:id",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  authorize(["project:update"]),
  activityLogger("update project"),
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
  activityLogger("delete project"),
  auditLoggerMiddleware("Project", "deleted"),
  deleteProject
);
router.put(
  "/softDelete/:id",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  authorize(["project:deactivated"]),
  activityLogger("deactive project"),
  auditLoggerMiddleware("Project", "soft-delete"),
  softDeleteProject
);
router.put(
  "/restore/:id",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  authorize(["project:restored"]),
  activityLogger("restore project"),
  auditLoggerMiddleware("Project", "restored"),
  restoreProject
);

module.exports = router;
