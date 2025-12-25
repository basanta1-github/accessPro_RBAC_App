const app = require("../app");

const connectDB = require("../config/database");

const start = async () => {
  await connectDB(process.env.MONGO_URI);
  app.listen(process.env.port, () => {
    console.log("server running");
  });
};
start();
