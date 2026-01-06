const speakeasy = require("speakeasy");

const generateOTP = (secret) => {
  return speakeasy.totp({
    secret,
    encoding: "base32",
    step: 30,
    digits: 6,
  });
};
module.exports = generateOTP;
