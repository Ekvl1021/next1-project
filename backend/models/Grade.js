const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  studentCode: { type: String, required: true }, courseId: { type: String, required: true },
  term: { type: String, required: true }, score: { type: Number, min: 0, max: 100, required: true },
  markedBy: { type: String, required: true },
}, { timestamps: true, versionKey: false });
schema.index({ studentCode: 1, courseId: 1, term: 1 }, { unique: true });
module.exports = mongoose.model('Grade', schema);
