const express = require("express");
const app = express();

const morgan = require("morgan");
const helmet = require("helmet");
const cors = require("cors");
const connectDB = require("./config/database");
const errorHandler = require("./middlewares/errorHandler");
require("dotenv").config();

app.use(errorHandler);
app.use(helmet());
app.use(cors("https://localhost:5000"));

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
