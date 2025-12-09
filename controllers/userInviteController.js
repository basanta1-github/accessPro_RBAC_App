const User = require("../models/User");
const Tenant = require("../models/Tenant");
const newLocal = `../models/Invite`;
const Invite = require(newLocal);
const generateInviteToken = require("../utils/generateInviteToken");
const sendInviteEmail = require("../utils/sendEmail");
const checkEmailExists = require("../utils/checkEmailExists");
const jwt = require("jsonwebtoken");
const asyncHandler = require("../middlewares/asyncHandler");
const restrictByUserLimit = require("../middlewares/restrictByUserLimit");

const inviteUser = asyncHandler(async (req, res) => {
  try {
    await restrictByUserLimit(req, res, async () => {
      const { email, role } = req.body;

      if (!email || !role)
        return res.status(400).json({ message: "Email and role required" });

      // check if email exists
      const isValidEmail = await checkEmailExists(email);
      if (!isValidEmail) {
        return res.status(400).json({ message: "Email doesnot exist" });
      }

      const tenant = await Tenant.findById(req.tenantId);
      if (!tenant) return res.status(404).json({ message: "Tenant not found" });

      const token = generateInviteToken({
        email,
        tenantId: req.tenantId,
        role,
      });
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const invite = await Invite.create({
        email,
        tenantId: req.tenantId,
        role,
        token,
        expiresAt,
      });

      await sendInviteEmail(email, token, tenant.name); // tenant name optional

      res.status(201).json({ message: "Invite sent", inviteId: invite._id });
    });
  } catch (error) {
    console.log("invitatiuon failed, exceeded the user limit");
    res.json({ message: "Invitation failed, exceeded the user limit" });
  }
});

const acceptInvite = asyncHandler(async (req, res) => {
  try {
    await restrictByUserLimit(req, res, async () => {
      const { token, name, password } = req.body;

      if (!token || !name || !password)
        return res.status(400).json({ message: "All fields required" });

      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const invite = await Invite.findOne({ token, status: "Pending" });
      if (!invite)
        return res.status(400).json({ message: "Invalid or expired invite" });
      if (invite.status === "Accepted") {
        return res.status(400).json({ message: "Invite already accepted" });
      }
      const userExists = await User.findOne({ email: decoded.email });
      if (userExists)
        return res.status(400).json({ message: "User already exists" });
      const tenant = await Tenant.findById(decoded.tenantId);
      if (!tenant) return res.status(404).json({ message: "Tenant not found" });

      const user = await User.create({
        name,
        email: decoded.email,
        password,
        role: decoded.role,
        tenantId: decoded.tenantId,
        companyName: tenant.name,
      });

      invite.status = "Accepted";
      await invite.save();

      res.status(201).json({ message: "Account created successfully", user });
    });
  } catch (error) {
    console.log("account creation failed, exceeded the user limit");
    res.json({ message: "Account creation failed, exceeded the user limit" });
  }
});

// Get all users in tenant
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ tenantId: req.tenantId });
  res.json(users);
});

// Update user role or deactivate
const updateUser = asyncHandler(async (req, res) => {
  const { role, isActive } = req.body;
  const { id } = req.params;

  const user = await User.findOne({ _id: id, tenantId: req.tenantId });
  if (!user) return res.status(404).json({ message: "User not found" });

  if (role && role.toLowerCase() === "owner") {
    return res.status(403).json({ message: "you cannot assign owner role..." });
  }

  if (role) user.role = role;
  if (typeof isActive === "boolean") user.isActive = isActive;

  await user.save();
  res.json({ message: "User updated", user });
});
// deactive
const deactiveUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findOne({ _id: id, tenantId: req.tenantId });
  if (!user) return res.status(404).json({ message: "User not found" });

  user.isActive = false;
  await user.save();
  res.json({ message: "User deactivated" });
});

module.exports = {
  inviteUser,
  acceptInvite,
  getUsers,
  updateUser,
  deactiveUser,
};
