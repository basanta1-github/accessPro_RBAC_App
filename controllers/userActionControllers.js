const User = require("../models/User");
const asyncHandler = require("../middlewares/asyncHandler");
const { cacheMiddleware, invalidateCache } = require("../middlewares/cache");
const mongoose = require("mongoose");

//creating the user for owner and admin

const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ tenantId: req.tenantId }).select("-password");
  if (!users || users.length === 0) {
    return res.status(404).json({ message: "no users found for this company" });
  }
  res.status(200).json({
    message: "Users fetched successfully",
    total: users.length,
    users,
  });
});
const createUser = asyncHandler(async (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).json({
        message:
          "please ensure you keep the required fields: name, email, password, role",
      });
    }
    const { name, email, password, role } = req.body;
    const currentUser = req.user;
    const requiredField = ["name", "email", "password", "role"];

    const missingfields = requiredField.filter((field) => !req.body[field]);

    if (missingfields.length > 0) {
      return res.status(400).json({
        message: `${missingfields.join(", ")} ${
          missingfields.length > 1 ? "are" : "is"
        } required`,
      });
    }

    // owner can create admin and employee whereas admin can create employee only
    if (currentUser.role === "owner" && role === "owner") {
      return res.status(403).json({
        message: "owner cannot create another owner",
        note: "there can only be one owner for the company",
        do: "if you want partner for your company you can create admins as your partner",
      });
    }
    if (currentUser.role === "admin" && role === "admin") {
      return res
        .status(403)
        .json({ message: "Admin cannot create another admin" });
    }
    if (currentUser.role === "admin" && role === "owner") {
      return res.status(403).json({ message: "Admin cannot create owners" });
    }
    if (currentUser.role === "employee") {
      return res.status(403).json({ message: "employee cannot create users" });
    }

    const newUser = await User.create({
      name,
      email,
      password,
      role,
      tenantId: req.tenantId,
    });

    await invalidateCache(`users:tenantId:${req.tenantId}`);
    res.status(201).json({
      message: "User created successfully",
      user: newUser,
    });
  } catch (err) {
    res.json({ message: err.errmsg });
  }
});

//Delete User

const deleteUser = asyncHandler(async (req, res) => {
  const currentUser = req.user;
  const targetUser = await User.findOne({
    _id: req.params.id,
    tenantId: req.tenantId,
  });

  if (!targetUser) {
    return res.status(404).json({ message: "User not found" });
  }

  // Only owner can delete admins
  if (targetUser.role == "owner") {
    return res.status(403).json({ message: "cannot delete owner" });
  }

  if (targetUser.role == "admin" && currentUser.role !== "owner") {
    return res.status(403).json({ message: "only owner can delete Admins" });
  }

  if (
    targetUser.role === "employee" &&
    !["owner", "admin"].includes(currentUser.role)
  ) {
    return res.status(403).json({ message: "not allowed to delete Employee" });
  }
  const targetUserRole = targetUser.role;
  const targetUserName = targetUser.name;
  await targetUser.deleteOne();

  await invalidateCache(`users:tenantId:${req.tenantId}`);
  res.json({
    message: `${targetUserRole}, ${targetUserName} deleted successfully`,
  });
});

//Soft delete user

const softDeleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.softDeleteById(id);
    // const user = await User.findOne({
    //   _id: new mongoose.Types.ObjectId(id),
    //   tenantId: req.tenantId,
    // }).setOptions({ _skipSoftDelete: ["User"] });

    // if (!user) return res.status(404).json({ message: "User not found" });

    // Prevent self-deletion
    if (user._id.equals(req.user._id)) {
      return res.status(400).json({ message: "You cannot delete yourself" });
    }

    // // Already deleted?
    // if (user.isDeleted) {
    //   return res.status(400).json({ message: "User is already soft-deleted" });
    // }
    // Role-based permission check
    const requesterRole = req.user.role; // assume roles: 'owner', 'admin', 'employee'
    const targetRole = user.role;

    if (requesterRole === "employee") {
      return res
        .status(403)
        .json({ message: "Employees cannot delete any user" });
    }

    if (requesterRole === "admin" && targetRole !== "employee") {
      return res
        .status(403)
        .json({ message: "Admins can only delete employees" });
    }

    // Owner can delete anyone except themselves
    // Admin can delete employees only

    user.isDeleted = true;
    await user.save();

    await invalidateCache(`users:tenantId:${req.tenantId}`);

    res.json({ message: `User ${user.name} soft deleted` });
  } catch (err) {
    // handle errors thrown from the static method
    if (
      err.message === "User not found" ||
      err.message === "User is already soft-deleted"
    ) {
      return res.status(404).json({ message: err.message });
    }
    // unexpected errors
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Restore user
const restoreUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  // fetch user
  const user = await User.findOne({
    _id: new mongoose.Types.ObjectId(id),
    tenantId: req.tenantId,
  }).setOptions({ _skipSoftDelete: ["User"] });

  if (!user)
    return res.status(404).json({ message: "User not found or not deleted" });

  if (!user.isDeleted) {
    return res.status(404).json({ message: "User is not deactivated" });
  } // Role-based permission check
  const requesterRole = req.user.role; // 'owner', 'admin', 'employee'
  const targetRole = user.role;

  if (requesterRole === "employee") {
    return res.status(403).json({ message: "Access denied" });
  }

  if (requesterRole === "admin" && targetRole !== "employee") {
    return res
      .status(403)
      .json({ message: "Admins can only restore employees" });
  }
  user.isDeleted = false;
  await user.save();

  await invalidateCache(`users:tenantId:${req.tenantId}`);

  res.json({ message: `User ${user.name} restored` });
});

module.exports = {
  getUsers,
  createUser,
  deleteUser,
  softDeleteUser,
  restoreUser,
};
