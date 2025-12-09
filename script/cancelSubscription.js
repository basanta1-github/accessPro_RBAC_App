const axios = require("axios");
require("dotenv").config();

const SUBSCRIPTION_ID = process.argv[2]; // get subscription id from command line argument
if (!SUBSCRIPTION_ID) {
  console.error("Usage: node cancelSubscription.js <subscriptionId>");
  process.exit(1);
}

(async () => {
  try {
    const res = await axios.post(
      `${
        process.env.API_URL || "http://localhost:5000"
      }/api/billing/cancel-subscription`,
      { subscriptionId: SUBSCRIPTION_ID },
      {
        headers: {
          Authorization: `Bearer ${process.env.ADMIN_API_TOKEN}`,
        },
      }
    );
    console.log(res.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
  }
})();

// run: node cancelSubscription.js sub_1SYLtF4zNQZBZFHusFK9Ei5c
// Make sure to set ADMIN_API_TOKEN in your .env file for authentication
