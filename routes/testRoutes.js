// routes/testRoutes.js
const express = require("express");
const router = express.Router();
const attachTenant = require("../middlewares/attachTenant");
const protect = require("../middlewares/authentication");

// Test route: returns 200 if tenant matches
router.get("/tenant-check", protect, attachTenant, (req, res) => {
  res
    .status(200)
    .json({ message: "Tenant access allowed", tenant: req.tenant.domain });
});

// You can add more test routes here as needed
module.exports = router;
