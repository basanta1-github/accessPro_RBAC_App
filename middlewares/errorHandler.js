const errorhandler = (err, req, res, next) => {
  console.error("Error middleware triggered: ", err);
  const status = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(status).json({
    success: false,
    message: err.message || "Server error",
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};
module.exports = errorhandler;
