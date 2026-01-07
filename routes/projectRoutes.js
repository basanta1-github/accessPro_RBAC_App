const express = require("express");
const router = express.Router();

const protect = require("../middlewares/authentication.js");
const authorize = require("../middlewares/authorize.js");
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
const { cacheMiddleware } = require("../middlewares/cache.js");
const withActivityLog = require("../middlewares/controllerLogger.js");

// create new project
router.post(
  "/create",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  authorize(["project:create"]),
  withActivityLog(createProject, "CREATE_PROJECT")
);
// get all projects
router.get(
  "/getProjects",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  authorize(["project:view"]),
  cacheMiddleware((req) => `projects:tenantId:${req.tenantId}`, 60),
  withActivityLog(getProjects, "GET_ALL_PROJECTS")
);
//update
router.put(
  "/update/:id",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  authorize(["project:update"]),
  withActivityLog(updateProject, "UPDATE_PROJECT")
);
//delete
router.delete(
  "/delete/:id",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  authorize(["project:delete"]),
  withActivityLog(deleteProject, "DELETE_PROJECT")
);
router.put(
  "/softDelete/:id",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  authorize(["project:deactivated"]),
  withActivityLog(softDeleteProject, "DEACTIVE_PROJECT")
);
router.put(
  "/restore/:id",
  protect,
  tenantSubDomainMiddleware,
  attachTenant,
  authorize(["project:restored"]),
  withActivityLog(restoreProject, "RESTORE_PROJECT")
);

module.exports = router;
