module.exports = function softDeletePlugin(schema, options = {}) {
  const skipPaths = options.skipPaths || [];
  // here in the skip path we can insert the filename which we want to skip and is passed in the schema
  // like userSchema.plugin(softDeletePlugin, { skipPaths: ['someController.js'] });
  function addIsDeletedFilter(next) {
    const modelName = this.model.modelName;
    const skipFor = this.options._skipSoftDelete || [];

    // if current path.controller is in the skip list, do nothing
    if (skipFor.includes(modelName)) return next();

    // apply filter only if isDeleted field exists
    if (schema.paths.isDeleted) {
      if (!this.getFilter().hasOwnProperty("isDeleted")) {
        this.setQuery({ ...this.getFilter(), isDeleted: { $ne: true } });
      }
    }
    next();
  }
  // apply to relavant query middleware
  schema.pre("find", addIsDeletedFilter);
  schema.pre("findOne", addIsDeletedFilter);
  schema.pre("findOneAndUpdate", addIsDeletedFilter);
  schema.pre("count", addIsDeletedFilter);
  schema.pre("countDocuments", addIsDeletedFilter);
  schema.pre("findById", addIsDeletedFilter);
};
