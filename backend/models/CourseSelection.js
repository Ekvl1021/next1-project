const mongoose = require("mongoose");

const courseSelectionSchema = new mongoose.Schema({
  studentId: { type: String, required: true, index: true },
  courseId: { type: String, required: true, index: true },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", required: true },
  reviewedBy: { type: String, default: "" },
  reviewedAt: { type: Date, default: null },
}, { timestamps: true, versionKey: false });

courseSelectionSchema.index({ studentId: 1, courseId: 1 }, { unique: true });

module.exports = mongoose.model("CourseSelection", courseSelectionSchema);
