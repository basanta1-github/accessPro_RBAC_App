// const nodemailer = require("nodemailer");

// import after mock do not  import before mock it will cause issue cause the function will be undefined
// const { _sendMailMock: sendMailMock } = nodemailer;
describe("email utilities", () => {
  //   nodemailer.createTransport.mockReturnValue({ sendMail: sendMailMock });
  let sendInviteEmail, sendPasswordResetEmail, sendMailMock;
  beforeEach(() => {
    jest.resetModules();

    jest.doMock("nodemailer", () => {
      sendMailMock = jest.fn();
      return {
        createTransport: jest.fn(() => ({
          sendMail: sendMailMock,
        })),
      };
    });

    // import  after mock
    sendInviteEmail = require("../../utils/sendEmail");
    sendPasswordResetEmail = require("../../utils/sendPasswordResetEmail");
  });
  test("sendInviteEmail sends email with corect subject ans recipient", async () => {
    const email = "user@example.com";
    const token = "invitetoken123";
    const tenantName = "TestTenant";

    await sendInviteEmail(email, token, tenantName);
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const mailOptions = sendMailMock.mock.calls[0][0];
    expect(mailOptions.to).toBe(email);
    expect(mailOptions.subject).toMatch(/invited/i);
    expect(mailOptions.html).toContain(token);
    expect(mailOptions.html).toContain(tenantName);
  });
  test("sendPasswordResetEmail sends correct email", async () => {
    const user = { name: "Test User", email: "user@example.com" };
    const resetLink = "http://reset.link/token123";

    await sendPasswordResetEmail(user, resetLink);

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const mailOptions = sendMailMock.mock.calls[0][0];
    expect(mailOptions.to).toBe(user.email);
    expect(mailOptions.html).toContain(resetLink);
    expect(mailOptions.subject).toMatch("You are invited!");
  });
});
