const sendEmail = require("./sendEmail");

async function sendPasswordResetEmail(user, resetLink) {
  const subject = "Reset Your Password";
  const html = `
    <p>Hi ${user.name},</p>
    <p>You requested to reset your password. Click the link below to set a new password:</p>
    <a href="${resetLink}">Reset Password</a>
    <p>If you did not request this, please ignore this email.</p>
    <p>Thanks,<br/>AccessPro Team</p>
    `;
  await sendEmail(user.email, subject, html);
}
module.exports = sendPasswordResetEmail;
