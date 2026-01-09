// __tests__/passwordPolicy.test.js

const passwordPolicy = require("../../utils/passwordPolicy");

describe("passwordPolicy function", () => {
  test("returns error if password is empty", () => {
    expect(passwordPolicy("")).toBe(
      "password must be at least 8 characters long"
    );
    expect(passwordPolicy(null)).toBe(
      "password must be at least 8 characters long"
    );
    expect(passwordPolicy(undefined)).toBe(
      "password must be at least 8 characters long"
    );
  });

  test("returns error if password is less than 8 characters", () => {
    expect(passwordPolicy("Ab1!")).toBe(
      "password must be at least 8 characters long"
    );
    expect(passwordPolicy("aB3$9")).toBe(
      "password must be at least 8 characters long"
    );
  });

  test("returns error if password is missing uppercase letter", () => {
    expect(passwordPolicy("abcdef1!")).toBe(
      "password must contain at least one uppercase letter, one lowercase letter, one number  and special characters, one number, and one special character"
    );
  });

  test("returns error if password is missing lowercase letter", () => {
    expect(passwordPolicy("ABCDEF1!")).toBe(
      "password must contain at least one uppercase letter, one lowercase letter, one number  and special characters, one number, and one special character"
    );
  });

  test("returns error if password is missing a number", () => {
    expect(passwordPolicy("Abcdefg!")).toBe(
      "password must contain at least one uppercase letter, one lowercase letter, one number  and special characters, one number, and one special character"
    );
  });

  test("returns error if password is missing a special character", () => {
    expect(passwordPolicy("Abcdef12")).toBe(
      "password must contain at least one uppercase letter, one lowercase letter, one number  and special characters, one number, and one special character"
    );
  });

  test("returns null if password meets all requirements", () => {
    expect(passwordPolicy("Abcd123!")).toBeNull();
    expect(passwordPolicy("StrongP@ssw0rd")).toBeNull();
    expect(passwordPolicy("A1b2C3d4$")).toBeNull();
  });
});
