const redisClient = require("../config/redisClient");
/**
 * Cache GET responses
 * keyGenerator is a function to generate a Redis key based on request
 */

const cacheMiddleware = (keyGenerator, expirationInSeconds = 60) => {
  return async (req, res, next) => {
    if (process.env.NODE_ENV === "test") {
      return next();
    }

    try {
      const key = keyGenerator(req);
      const cachedData = await redisClient.get(key);
      if (cachedData) {
        console.log(`Cache hit for key: ${key}`);
        console.log("Cached Data:", cachedData);
        console.log(JSON.parse(cachedData));
        return res.status(200).json(JSON.parse(cachedData));
      }

      // Override res.json to cache the response data
      const originalJson = res.json.bind(res);
      res.json = async (data) => {
        await redisClient.setEx(key, expirationInSeconds, JSON.stringify(data));
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error("Cache middleware error:", error);
      next(); // proceed without caching on error
    }
  };
};
/**
 * Invalidate cache for a given key or pattern
 */

const invalidateCache = async (keyPattern) => {
  // ✅ No cache in tests
  if (process.env.NODE_ENV === "test") return;
  try {
    if (keyPattern.includes("*")) {
      // pattern matching
      const keys = await redisClient.keys(keyPattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
        console.log(`Invalidated cache for pattern: ${keyPattern}`);
      }
    } else {
      await redisClient.del(keyPattern);

      console.log(`Invalidated cache for key: ${keyPattern}`);
    }
  } catch (error) {
    console.error("Cache invalidation error:", error);
  }
};
module.exports = {
  cacheMiddleware,
  invalidateCache,
};
