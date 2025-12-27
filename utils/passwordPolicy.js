const passwordPolicy = (password) => {
  const minLength = 8;
  const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/;

  if (!password || password.length < minLength) {
    return "password must be at least 8 characters long";
  }
  if (!strongRegex.test(password)) {
    return "password must contain at least one uppercase letter, one lowercase letter, one number  and special characters, one number, and one special character";
  }
  return null;
};

module.exports = passwordPolicy;
