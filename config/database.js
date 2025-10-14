const mongoose = require("mongoose");

const connectDB = async (url, afterConnect) => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);

    const info = {
      host: conn.connection.host,
      dbName: conn.connection.name,
      cluster: url.match(/@([\w\d.-]+)\//)?.[1] || "unknown",
    };

    if (afterConnect && typeof afterConnect === "function") {
      await afterConnect(info);
    }
    return info;
  } catch (error) {
    console.error("MongoDB connection error: ", error.message);
  }
};

module.exports = connectDB;
