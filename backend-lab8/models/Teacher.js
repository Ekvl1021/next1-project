const mongoose = require('mongoose');
const teacherSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true, min: 1, validate: Number.isSafeInteger },
  username: { type: String, required: true, trim: true },
  displayName: { type: String, default: '' },
  photo: { type: String, default: '' },
  department: { type: String, default: 'Мэдээллийн технологийн тэнхим' },
  position: { type: String, default: 'Багш' },
  bio: { type: String, default: '' },
  office: { type: String, default: '' },
  role: { type: String, enum: ['teacher'], default: 'teacher' },
}, { timestamps: true, versionKey: false });

teacherSchema.index({ username: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
module.exports = mongoose.model('Teacher', teacherSchema);
