const request = require("supertest");
const app = require("../app");

describe("test setup sanity check", () => {
  it("get/ should return welcome  message", async () => {
    const res = await request(app).get("/");

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBeDefined();
  });
});
