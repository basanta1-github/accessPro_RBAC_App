const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
let mongo;
beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();

  process.env.MONGO_URI = uri;
  process.env.JWT_ACCESS_SECRET = "test_access_secret";
  process.env.REFRESH_TOKEN_SECRET = "test_refresh_secret";
  process.env.JWT_ACCESS_EXPIRES = "15m";
  process.env.REFRESH_EXPIRES = "7d";

  await mongoose.connect(uri);
});

afterEach(async () => {
  const collections = await mongoose.connection.db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
});
afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
  if (mongo) {
    await mongo.stop();
  }
});
