const mongoose = require('mongoose');
const attachment = new mongoose.Schema({ name: String, data: String }, { _id: false });
const schema = new mongoose.Schema({
  courseId: { type: String, required: true, index: true },
  kind: { type: String, enum: ['assignment', 'exam'], required: true },
  title: { type: String, required: true }, description: { type: String, required: true },
  dueAt: { type: Date, required: true }, createdBy: { type: String, required: true },
  attachment: { type: attachment, default: null },
}, { timestamps: true, versionKey: false });
const submission = new mongoose.Schema({
  assessmentId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  studentId: { type: String, required: true }, studentCode: String,
  answer: { type: String, default: '' }, attachment: { type: attachment, default: null },
}, { timestamps: true, versionKey: false });
submission.index({ assessmentId: 1, studentId: 1 }, { unique: true });
module.exports = { Assessment: mongoose.model('Assessment', schema), Submission: mongoose.model('AssessmentSubmission', submission) };
