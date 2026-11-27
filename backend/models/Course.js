const mongoose = require('mongoose');
const courseSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true, min: 1, validate: Number.isSafeInteger },
  code: { type: String, trim: true, default: '' },
  credits: { type: Number, default: 3, min: 0.5, max: 30 },
  year: { type: Number, default: 1, min: 1, max: 4 },
  semester: { type: Number, default: 1, min: 1, max: 8 },
  category: { type: String, default: 'Мэргэжлийн суурь' },
  sessions: [{ _id: false, day: { type: Number, min: 0, max: 6, required: true }, start: { type: String, required: true }, end: { type: String, required: true }, room: { type: String, default: '' }, kind: { type: String, default: 'Лекц' } }],
  title: { type: String, required: true, trim: true },
  teacher: { type: String, required: true, trim: true },
  schedule: { type: String, required: true, trim: true },
  room: { type: String, required: true, trim: true },
}, { timestamps: true, versionKey: false });

courseSchema.index(
  { title: 1, teacher: 1, schedule: 1, room: 1 },
  { unique: true, name: 'unique_course_section' }
);

module.exports = mongoose.model('Course', courseSchema);
