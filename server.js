require("dotenv").config();

const app = require("./app");

const connectDB = require("./config/database");

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
