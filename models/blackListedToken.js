const mongoose = require("mongoose");

const blackListedTokenSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
});

const BlackListedTokens = mongoose.model(
  "BlackListedTokens",
  blackListedTokenSchema
);
module.exports = BlackListedTokens;
