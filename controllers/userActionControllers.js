const User = require("../models/User");
const asyncHandler = require("../middlewares/asyncHandler");

//creating the user for owner and admin

const getUsers = asyncHandler(async (req, res) => {
  const currentUser = req.user;
  const users = await User.find({ tenantId: currentUser.tenantId }).select(
    "-password"
  );
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
  if (!req.body) {
    res.status(400).json({
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
    tenantId: currentUser.tenantId,
    companyName: currentUser.companyName,
  });
  console.log(currentUser);
  res.status(201).json({
    message: "User created successfully",
    user: newUser,
  });
});

//Delete User

const deleteUser = asyncHandler(async (req, res) => {
  const currentUser = req.user;
  const targetUser = await User.findById(req.params.id);

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
  res.json({
    message: `${targetUserRole}, ${targetUserName} deleted successfully`,
  });
});

//Soft delete user

const softDeleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findOne({
    _id: id,
    tenantId: req.user.tenantId,
  }).setOptions({ _skipSoftDelete: ["User"] });
  console.log(req.user.tenantId);

  if (!user)
    return res
      .status(404)
      .json({ message: "User not found or already deleted" });

  user.isDeleted = true;
  await user.save();

  res.json({ message: `User ${user.name} soft deleted` });
});

// Restore user
const restoreUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findOne({
    _id: id,
    tenantId: req.user.tenantId,
    isDeleted: true,
  });
  if (!user)
    return res.status(404).json({ message: "User not found or not deleted" });

  user.isDeleted = false;
  await user.save();

  res.json({ message: `User ${user.name} restored` });
});

module.exports = {
  getUsers,
  createUser,
  deleteUser,
  softDeleteUser,
  restoreUser,
};
