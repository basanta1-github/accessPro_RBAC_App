const asyncHandler = (functionAsyncHandler) => {
  return (req, res, next) => {
    Promise.resolve(functionAsyncHandler(req, res, next)).catch(next);
  };
};
module.exports = asyncHandler;
