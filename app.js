const express = require("express");
const app = express();
require("dotenv").config();

const morgan = require("morgan");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const adminRoutes = require("./routes/adminRoutes.js");
const authRoutes = require("./routes/authRoutes.js");
const userRoutes = require("./routes/userRoutes.js");
const projectRoutes = require("./routes/projectRoutes.js");
const inviteRoutes = require("./routes/inviteRoutes.js");
const tenantRoutes = require("./routes/tenantRoutes.js");
const auditRoutes = require("./routes/auditRoutes.js");
const billingRoutes = require("./routes/billingRoutes.js");
const webhookHandlerRoute = require("./script/webhookHandlerRoute.js");

// at the top with other imports
const testRoutes = require("./routes/testRoutes");

// Mount test routes only in test environment
if (process.env.NODE_ENV === "test") {
  app.use("/api", testRoutes);
}

const errorHandler = require("./middlewares/errorHandler");
// app rate limiter
const appRateLimiter = require("./middlewares/rateLimiter/appRateLimit.js");

app.use(
  "/billing/webhook",
  express.raw({ type: "application/json" }),
  webhookHandlerRoute
); // to handle stripe webhook raw body

// app and security middlewares
app.set("trust proxy", false); // adjust based on deployment
app.use(helmet());
app.use(cors("https://localhost:5000"));
app.use(morgan("dev"));
app.use(cookieParser());

// body parsers after webhook
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// rate limiter
app.use(appRateLimiter);

app.use("/api/admin", adminRoutes); // only use it when updating the permissions
app.use("/", authRoutes);
app.use("/api/users", userRoutes);
app.use("/projects", projectRoutes);
app.use("/inviteRoute", inviteRoutes);
app.use("/tenants", tenantRoutes);
app.use("/audit", auditRoutes);
app.use("/api/billing", billingRoutes);

// checking
app.get("/", (req, res) => {
  res.status(200).json({
    message:
      "welcome to the AccessPro app a fully functional rbac backend system",
  });
});

// error handler always at last

app.use(errorHandler);

module.exports = app;
