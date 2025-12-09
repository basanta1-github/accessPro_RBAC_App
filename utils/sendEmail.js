const nodemailer = require("nodemailer");
const sendInviteEmail = async (email, token, tenantName) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    // secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const inviteLink = `${process.env.FRONTEND_URL}/accept-invite?token=${token}`;
  const apiEndpoint = `${process.env.BACKEND_URL}/inviteRoute/accept-invite`;

  const mailOptions = {
    from: `"${tenantName}" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "You are invited!",
    html: `
   
      <p>Hello,</p>
      <p>You have been invited to join <strong>${tenantName}</strong>.</p>
      <p>To accept your invite, make a POST request to the following endpoint:</p>
      <p><strong>POST ${apiEndpoint}</strong></p>
      <p>Request body (JSON):</p>
      <pre>{
  "token": "${token}",
  "name": "Your Name",
  "password": "Your Password"
}</pre>
      <p>Example using curl:</p>
      <pre>
curl -X POST ${apiEndpoint} \\
-H "Content-Type: application/json" \\
-d '{"token": "${token}", "name": "Your Name", "password": "Your Password"}'
      </pre>
      <a href="${inviteLink}">Accept Invite</a>
      <p>This token  and link will expire in 7 days.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendInviteEmail;
