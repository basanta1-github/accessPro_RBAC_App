const redis = require("redis");

const redisclient = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: process.env.REDIS_PORT || 6379,
  },
  password: process.env.REDIS_PASSWORD || null,
});
redisclient.on("error", (err) => {
  console.error("Redis Client Error", err);
});

redisclient
  .connect()
  .then(() => {
    console.log("Connected to Redis");
  })
  .catch((err) => {
    console.error("Could not connect to Redis", err);
  });
module.exports = redisclient;
