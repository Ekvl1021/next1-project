const User = require("../models/User");
const Teacher = require("../models/Teacher");
const Counter = require("../models/Counter");
const Course = require("../models/Course");
const bcrypt = require("bcryptjs");

const publicTeacher = (teacher, courses = []) => ({
  id: teacher.id, username: teacher.username, role: teacher.role,
  displayName: teacher.displayName || teacher.username, photo: teacher.photo || '',
  department: teacher.department || 'Мэдээллийн технологийн тэнхим',
  position: teacher.position || 'Багш', bio: teacher.bio || '', office: teacher.office || '',
  courses: courses.filter(course => course.teacher.toLowerCase() === teacher.username.toLowerCase()).map(course => ({ id: String(course.id), title: course.title, code: course.code, credits: course.credits })),
});
const validUsername = (username) => typeof username === "string" && username.trim().length > 0;

async function getTeachers(_req, res) {
  const teachers = await Teacher.find().sort({ id: 1 }).lean();
  const courses = await Course.find().lean();
  res.json(teachers.map(teacher => publicTeacher(teacher, courses)));
}

async function getTeacherById(req, res) {
  const teacher = await Teacher.findOne({ id: Number(req.params.id) }).lean();
  if (!teacher) return res.status(404).json({ message: "Teacher not found" });
  res.json(publicTeacher(teacher));
}

async function createTeacher(req, res) {
  const { username, password } = req.body || {};
  if (!validUsername(username) || typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ message: "Username and a password of at least 8 characters are required" });
  }
  const normalized = username.trim();
  if (await User.findOne({ username: normalized }).collation({ locale: "en", strength: 2 })) {
    return res.status(409).json({ message: "Username already exists" });
  }
  const last = await User.findOne().sort({ id: -1 }).select("id").lean();
  await Counter.updateOne({ _id: "users" }, { $max: { value: last?.id || 0 } }, { upsert: true });
  const counter = await Counter.findOneAndUpdate(
    { _id: "users" }, { $inc: { value: 1 } }, { returnDocument: "after" }
  );
  try {
    const teacher = await Teacher.create({ id: counter.value, username: normalized, role: "teacher" });
    try {
      await User.create({
        id: counter.value,
        username: normalized,
        role: "teacher",
        passwordHash: await bcrypt.hash(password, 12),
      });
    } catch (error) {
      await Teacher.deleteOne({ id: counter.value });
      throw error;
    }
    res.status(201).json(publicTeacher(teacher));
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "Username already exists" });
    throw error;
  }
}

async function updateTeacher(req, res) {
  const { username, password } = req.body || {};
  const partial = req.method === "PATCH";
  if (Object.keys(req.body || {}).some((key) => !["username", "password"].includes(key)) ||
      (!partial && !validUsername(username)) ||
      (partial && username === undefined && password === undefined) ||
      (username !== undefined && !validUsername(username)) ||
      (password !== undefined && (typeof password !== "string" || password.length < 8))) {
    return res.status(400).json({ message: "Provide a valid username and/or password (minimum 8 characters)" });
  }
  const teacher = await User.findOne({ id: Number(req.params.id), role: "teacher" });
  if (!teacher) return res.status(404).json({ message: "Teacher not found" });
  if (username !== undefined) teacher.username = username.trim();
  if (password !== undefined) teacher.passwordHash = await bcrypt.hash(password, 12);
  try {
    await teacher.save();
    await Teacher.updateOne(
      { id: teacher.id },
      { $set: { username: teacher.username, role: "teacher" } }
    );
    res.json(publicTeacher(teacher));
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "Username already exists" });
    throw error;
  }
}

async function deleteTeacher(req, res) {
  const teacher = await Teacher.findOne({ id: Number(req.params.id) }).lean();
  if (!teacher) return res.status(404).json({ message: "Teacher not found" });
  if (await Course.exists({ teacher: new RegExp(`^${teacher.username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") })) {
    return res.status(409).json({ message: "Cannot delete a teacher assigned to a course" });
  }
  await Promise.all([
    User.deleteOne({ id: teacher.id, role: "teacher" }),
    Teacher.deleteOne({ id: teacher.id }),
  ]);
  res.status(204).end();
}

module.exports = { getTeachers, getTeacherById, createTeacher, updateTeacher, deleteTeacher };
