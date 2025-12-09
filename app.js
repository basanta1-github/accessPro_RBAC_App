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
const billingRoutes = require("./controllers/billingRoutes.js");

const connectDB = require("./config/database");
const errorHandler = require("./middlewares/errorHandler");

app.use("/api/billing/webhook", express.raw({ type: "application/json" })); // to handle stripe webhook raw body

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(errorHandler);
app.use(helmet());
app.use(cors("https://localhost:5000"));
app.use(morgan("dev"));
app.use(cookieParser());

app.use("/api/admin", adminRoutes); // only use it when updating the permissions
app.use("/", authRoutes);
app.use("/api/users", userRoutes);
app.use("/projects", projectRoutes);
app.use("/inviteRoute", inviteRoutes);
app.use("/tenants", tenantRoutes);
app.use("/audit", auditRoutes);
app.use("/api/billing", billingRoutes);

app.get("/", (req, res) => {
  res.status(200).json({
    message:
      "welcome to the AccessPro app a fully functional rbac backend system",
  });
});

const afterDBMiddleware = async (info) => {
  console.log("Database info from  afterDBMiddleware", info);
};

const start = async () => {
  try {
    await connectDB(process.env.MONGO_URI, afterDBMiddleware);
    console.log("🟢 MongoDB Connected:");
    app.listen(process.env.PORT, () => {
      setTimeout(() => {
        console.log("🛑 Server listening on port: ", process.env.PORT);
      }, 500);
    });
  } catch (error) {
    console.log(error);
  }
};
start();
