const axios = require("axios");

const checkEmailExists = async (email) => {
  try {
    const response = await axios.get(
      `https://api.hunter.io/v2/email-verifier?email=${email}&api_key=${process.env.HUNTER_API_KEY}`
    );
    // deliverable means email exists
    return response.data.data.result === "deliverable";
  } catch (err) {
    console.error("Email check failed:", err.message);
    return false;
  }
};
module.exports = checkEmailExists;
