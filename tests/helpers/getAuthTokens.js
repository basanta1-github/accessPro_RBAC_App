// tests/helpers/getAuthTokens.js
const request = require("supertest");
const app = require("../../app");

async function getAuthTokens(userData) {
  // Login and return tokens
  const loginRes = await request(app).post("/login").send({
    email: userData.email,
    password: userData.password,
    companyName: userData.companyName,
  });
  if (!loginRes.body.accessToken || !loginRes.body.refreshToken) {
    throw new Error("Login failed in getAuthTokens");
  }

  return {
    accessToken: loginRes.body.accessToken,
    refreshToken: loginRes.body.refreshToken,
  };
}

module.exports = getAuthTokens;
