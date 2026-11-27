const mongoose = require('mongoose');

const plannerSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, index: true },
  schedule: [{
    id: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    day: { type: Number, required: true, min: 0, max: 6 },
    start: { type: String, required: true },
    end: { type: String, required: true },
    room: { type: String, default: '' },
  }],
  tasks: [{
    id: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    due: { type: String, required: true },
    priority: { type: String, enum: ['low', 'normal', 'high'], required: true },
    done: { type: Boolean, required: true },
    kind: { type: String, enum: ['assignment', 'exam', 'personal'], required: true },
  }],
  grades: [{
    id: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    credits: { type: Number, required: true, min: 0.1, max: 30 },
    score: { type: Number, required: true, min: 0, max: 100 },
    letter: { type: String, required: true },
    point: { type: Number, required: true, min: 0, max: 4 },
    term: { type: String, required: true, trim: true },
  }],
}, { timestamps: true, versionKey: false });

module.exports = mongoose.model('Planner', plannerSchema);
