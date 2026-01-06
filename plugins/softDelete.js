module.exports = function softDeletePlugin(schema, options = {}) {
  const skipPaths = options.skipPaths || [];
  // here in the skip path we can insert the filename which we want to skip and is passed in the schema
  // like userSchema.plugin(softDeletePlugin, { skipPaths: ['someController.js'] });
  function addIsDeletedFilter(next) {
    // Check if query has skip flag
    const skipSoftDelete = this.options?._skipSoftDelete || [];

    if (skipSoftDelete.includes(this.model.modelName)) {
      return next(); // bypass soft-delete filter
    }

    // apply filter only if isDeleted field exists
    if (this.model.schema.paths.isDeleted) {
      const filter = this.getFilter();
      if (!filter.hasOwnProperty("isDeleted")) {
        this.setQuery({ ...filter, isDeleted: { $ne: true } });
      } else if (filter.isDeleted === true) {
        // Already soft-deleted? Throw an error for safety
        return next(new Error("Document is already soft-deleted"));
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
