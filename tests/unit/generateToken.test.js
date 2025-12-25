const jwt = require("jsonwebtoken");

const {
  generateAccessToken,
  generateRefreshToken,
} = require("../../utils/generateTokens");
const generateInviteToken = require("../../utils/generateInviteToken");

describe("JWT Utilities", () => {
  const user = {
    _id: "user123",
    tenantId: "tenant123",
    role: "admin",
    companyName: "TestCo",
  };
  const permissions = ["user:view", "project:create"];
  const invite = {
    email: "test@email.com",
    tenantId: "tenant123",
    tenantName: "TestCoso",
    role: "employee",
  };

  test("generateAccessToken returns valid JWT with correctplayload", () => {
    const token = generateAccessToken(user, permissions);
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    expect(decoded.userId).toBe(user._id);
    expect(decoded.tenantId).toBe(user.tenantId);
    expect(decoded.role).toBe(user.role);
    expect(decoded.permissions).toEqual(permissions);
  });

  test("generateRefreshToken returns the valid JWT with correct playload", () => {
    const token = generateRefreshToken(user);
    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    expect(decoded.userId).toBe(user._id);
    expect(decoded.tenantId).toBe(user.tenantId);
  });

  test("generateInviteToken includes email, tenantId, tenantName, role", () => {
    const token = generateInviteToken(invite);
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    expect(decoded.email).toBe(invite.email);
    expect(decoded.tenantId).toBe(invite.tenantId);
    expect(decoded.tenantName).toBe(invite.tenantName);
    expect(decoded.role).toBe(invite.role);
  });
});
