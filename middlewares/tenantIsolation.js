const tenantIsolation = (req, res, next) => {
  console.log("i am not used anymore");
  next();
};

module.exports = tenantIsolation;
