const Project = require("../models/Project.js");
const asyncHandler = require("../middlewares/asyncHandler");
const User = require("../models/User.js");
const mongoose = require("mongoose");
const { invalidateCache } = require("../middlewares/cache.js");

// create project owner and admin only
const createProject = asyncHandler(async (req, res) => {
  const currentUser = req.user;

  const { name, description, assignedTo } = req.body;

  if (!["owner", "admin"].includes(currentUser.role)) {
    return res
      .status(403)
      .json({ message: "You are not allowed to create projects" });
  }

  if (!name)
    return res.status(400).json({ message: "project name is required" });

  // validate assigned to

  let validEmployeeIds = [];
  if (assignedTo && Array.isArray(assignedTo) && assignedTo.length > 0) {
    validEmployeeIds = await User.find({
      _id: { $in: assignedTo },
      tenantId: req.tenantId,
      role: "employee",
    }).select("_id");
    if (validEmployeeIds.length === 0) {
      return res
        .status(400)
        .json({ message: "no valid employees found to assign" });
    }
  }
  const newProject = await Project.create({
    name,
    description,
    assignedTo: validEmployeeIds.map((e) => e._id),
    tenantId: req.tenantId,
    createdBy: currentUser._id,
  });

  await invalidateCache(`projects:tenantId:${req.tenantId}`);
  res
    .status(201)
    .json({ message: "project reated successfully", project: newProject });
});

// view all pprojects owner admin employee
const getProjects = asyncHandler(async (req, res) => {
  const currentUser = req.user;
  let projects;

  if (currentUser.role === "employee") {
    projects = await Project.find({
      tenantId: req.tenantId,
      assignedTo: currentUser._id, // only assigned projects
    });
    if (projects.length === 0) {
      return res.status(404).json({ message: "No projects found" });
    }
  } else {
    projects = await Project.find({ tenantId: req.tenantId });
  }

  if (!projects || projects.length === 0) {
    return res
      .status(404)
      .json({ message: "no projects found for this company" });
  }
  res.json({
    message: "projects fetched successfully",
    total: projects.length,
    projects,
  });
});

// update project owner, admin and employee limited

const updateProject = asyncHandler(async (req, res) => {
  const currentUser = req.user;
  const project = await Project.findOne({
    _id: req.params.id,
    tenantId: req.tenant._id,
  });

  if (!project) return res.status(404).json({ message: "project not found" });

  // employee can only update their own assigned projects

  if (
    currentUser.role === "employee" &&
    !project.assignedTo.some(
      (id) => id.toString() === currentUser._id.toString()
    )
  ) {
    return res
      .status(403)
      .json({ messsage: "you are not assigned for this project" });
  }

  // Admin/Owner can only update if they are the creator
  if (
    ["admin"].includes(currentUser.role) &&
    project.createdBy.toString() !== currentUser._id.toString()
  ) {
    return res.status(403).json({
      message: "not allowed to update project created by another admin/owner",
    });
  }

  const updated = await Project.findByIdAndUpdate(
    { _id: req.params.id, tenantId: req.tenantId },
    req.body,
    {
      new: true,
    }
  );
  await invalidateCache(`projects:tenantId:${req.tenantId}`);
  res.json({ message: "Project updated successfully", project: updated });
});

// Soft delete project
const softDeleteProject = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const project = await Project.findOne({
    _id: id,
    tenantId: req.tenantId,
    isDeleted: false,
  }).setOptions({ _skipSoftDelete: ["Project"] }); // skip plugin for this query;
  if (!project)
    return res
      .status(404)
      .json({ message: "Project not found or already deleted" });

  project.isDeleted = true;
  await project.save();
  // Invalidate cache for this tenant
  await invalidateCache(`projects:tenantId:${req.tenantId}`);

  res.json({ message: `Project ${project.name} soft deleted` });
});

// Restore project
const restoreProject = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const project = await Project.findOne({
    _id: id,
    tenantId: req.tenantId,
    isDeleted: true,
  });
  if (!project)
    return res
      .status(404)
      .json({ message: "Project not found or not deleted" });

  project.isDeleted = false;
  await project.save();
  await invalidateCache(`projects:tenantId:${req.tenantId}`);
  res.json({ message: `Project ${project.name} restored` });
});

// delete project
const deleteProject = asyncHandler(async (req, res) => {
  const currentUser = req.user;
  const project = await Project.findOne({
    _id: req.params.id,
    tenantId: req.tenantId,
  });
  if (!project) return res.status(404).json({ message: "Project not found" });

  if (!["owner", "admin"].includes(currentUser.role)) {
    return res
      .status(403)
      .json({ message: " you are not allowed to delete project " });
  }

  await project.deleteOne();
  await invalidateCache(`projects:tenantId:${req.tenantId}`);
  res.json({ message: "project deleted successfully" });
});

module.exports = {
  createProject,
  getProjects,
  updateProject,
  deleteProject,
  restoreProject,
  softDeleteProject,
};
