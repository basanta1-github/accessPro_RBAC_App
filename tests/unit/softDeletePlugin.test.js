const mongoose = require("mongoose");
const softDeletePlugin = require("../../plugins/softDelete");

describe("Soft Delete Plugin", () => {
  let SampleModel;
  beforeAll(async () => {
    // Define a sample schema and apply the soft delete plugin
    const SampleSchema = new mongoose.Schema({
      name: { type: String, required: true },
      isDeleted: { type: Boolean, default: false },
    });
    SampleSchema.plugin(softDeletePlugin);
    // using unique model name to avoid overwrite issues
    SampleModel = mongoose.model("Sample", SampleSchema);
  });
  afterEach(async () => {
    await SampleModel.deleteMany({});
  });
  afterAll(async () => {
    // No need to drop database or close connection here,
    // setup.js already handles it.
    // If you want, you can delete the model to avoid overwrite warnings:
    delete mongoose.connection.models["Sample"];
  });
  test("should soft delete a document", async () => {
    const doc = await SampleModel.create({ name: "Test" });
    // simulate soft delete
    await SampleModel.findByIdAndUpdate(doc._id, { isDeleted: true });
    const result = await SampleModel.find();
    expect(result.length).toBe(0); // soft deleted doc is filtered out
  });
  test("restoresets isdeleted to fasle", async () => {
    // create a document that is already soft-deleted
    const doc = await SampleModel.create({
      name: "ToRestore",
      isDeleted: true,
    });
    // restore the document
    await SampleModel.findOneAndUpdate(
      { _id: doc._id, isDeleted: true },
      { $set: { isDeleted: false } },
      { new: true }
    );

    const result = await SampleModel.findById(doc._id);
    expect(result).not.toBeNull();
    expect(result.isDeleted).toBe(false); // document is restored
  });
  test("find doesnot return soft-deleted documents", async () => {
    // create two docs
    const activeDoc = await SampleModel.create({ name: "Active" });
    const deletedDoc = await SampleModel.create({
      name: "Deleted",
      isDeleted: true,
    });
    const results = await SampleModel.find();
    const resultDeleted = await SampleModel.find({ isDeleted: true });
    expect(results.length).toBe(1);
    expect(resultDeleted.length).toBe(1);
    expect(results[0]._id.toString()).toBe(activeDoc._id.toString());
    expect(resultDeleted[0]._id.toString()).toBe(deletedDoc._id.toString());
  });
});
