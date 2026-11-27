const mongoose = require("mongoose");
const studentSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true, min: 1, validate: Number.isSafeInteger, immutable: true },
  code: { type: String, required: true, unique: true, trim: true },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  program: { type: String, trim: true, default: "" },
  courseId: { type: String, default: "" },
}, { timestamps: true, versionKey: false });
module.exports = mongoose.model("Student", studentSchema);
