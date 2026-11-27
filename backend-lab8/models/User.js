const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  id: { type: Number, required: true, min: 1, validate: Number.isInteger },
  username: { type: String, required: true, trim: true, minlength: 1 },
  passwordHash: { type: String, required: true },
  role: { type: String, required: true, enum: ["admin", "teacher", "student"] },
  courseIds: { type: [String], default: [] },
}, { timestamps: true, strict: true });

userSchema.index({ id: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });

module.exports = mongoose.model("User", userSchema);
