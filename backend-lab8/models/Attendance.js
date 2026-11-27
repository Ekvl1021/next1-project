const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  courseId: { type: String, required: true },
  studentCode: { type: String, required: true },
  date: { type: String, required: true },
  status: { type: String, enum: ['present', 'absent', 'late', 'excused'], required: true },
  markedBy: { type: String, required: true },
}, { timestamps: true, versionKey: false });

attendanceSchema.index({ courseId: 1, studentCode: 1, date: 1 }, { unique: true });
attendanceSchema.index({ studentCode: 1, date: -1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
