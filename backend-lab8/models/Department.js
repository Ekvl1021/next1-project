const mongoose = require('mongoose');
const departmentSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true, min: 1, validate: Number.isSafeInteger },
  name: { type: String, required: true, trim: true },
}, { timestamps: true, versionKey: false });

departmentSchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
module.exports = mongoose.model('Department', departmentSchema);
