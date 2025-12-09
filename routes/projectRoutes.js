const express = require("express");
const router = express.Router();

const protect = require("../middlewares/authentication.js");
const authorize = require("../middlewares/authorize.js");
const tenantIsolation = require("../middlewares/tenantIsolation.js");
const {
  auditLoggerMiddleware,
} = require("../middlewares/auditLogMiddleware.js");

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
  tenantIsolation,
  authorize(["project:create"]),
  auditLoggerMiddleware("Project", "created"),
  createProject
);
// get all projects
router.get(
  "/getProjects",
  protect,
  tenantIsolation,
  authorize(["project:view"]),

  auditLoggerMiddleware("Project", "viewed"),
  getProjects,
  (req, res) => {
    console.log("hello project is viewed");
  }
);
//update
router.put(
  "/update/:id",
  protect,
  tenantIsolation,
  authorize(["project:update"]),
  auditLoggerMiddleware("Project", "updated"),
  updateProject
);
//delete
router.delete(
  "/delete/:id",
  protect,
  tenantIsolation,
  authorize(["project:delete"]),
  auditLoggerMiddleware("Project", "deleted"),
  deleteProject
);
router.put(
  "/softDelete/:id",
  protect,
  tenantIsolation,
  authorize(["project:deactivated"]),
  auditLoggerMiddleware("Project", "soft-delete"),
  softDeleteProject
);
router.put(
  "/restore/:id",
  protect,
  tenantIsolation,
  authorize(["project:restored"]),
  auditLoggerMiddleware("Project", "restored"),
  restoreProject
);

module.exports = router;
