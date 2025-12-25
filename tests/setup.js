const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
// const app = require("../app");
let mongo;
// app.set("trust proxy", true);
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
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongo.stop();
});
