require("dotenv").config();
module.exports = {
  isTest: process.env.NODE_ENV === "test",
};
