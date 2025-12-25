module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  verbose: true,
  coveragePathIgnorePatterns: ["/node_modules/", "/config/", "/scripts/"],
};
