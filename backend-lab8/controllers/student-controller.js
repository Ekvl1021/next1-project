const Student = require("../models/Student");
const Counter = require("../models/Counter");
const User = require("../models/User");
const Course = require("../models/Course");
const CourseSelection = require("../models/CourseSelection");
const missing = (res) => res.status(404).json({ success: false, message: "Оюутан олдсонгүй" });
async function getAllStudents(req, res) {
  const filter = {};
  if (req.query.search !== undefined) {
    if (typeof req.query.search !== "string") return res.status(400).json({ success: false, message: "search must be a string" });
    const escaped = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = ["firstName", "lastName", "code"].map((field) => ({ [field]: { $regex: escaped, $options: "i" } }));
  }
  const pageValue = req.query.page ?? "1";
  const limitValue = req.query.limit ?? "5";
  if (![pageValue, limitValue].every((value) => typeof value === "string" && /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value))) || Number(limitValue) > 100 || !Number.isSafeInteger((Number(pageValue) - 1) * Number(limitValue))) {
    return res.status(400).json({ success: false, message: "page must be a positive integer; limit must be 1–100" });
  }
  const page = Number(pageValue), limit = Number(limitValue);
  const [students, total] = await Promise.all([
    Student.find(filter).sort({ id: 1 }).skip((page - 1) * limit).limit(limit).lean(), Student.countDocuments(filter),
  ]);
  const users = await User.find({ role: "student", username: { $in: students.map(student => student.code) } })
    .select("id username courseIds").lean();
  const selections = await CourseSelection.find({ studentId: { $in: users.map(user => String(user.id)) } }).lean();
  const courseIds = [...new Set(selections.map(selection => selection.courseId))];
  const courses = await Course.find({ id: { $in: courseIds.map(Number) } }).select("id title").lean();
  const titlesById = new Map(courses.map(course => [String(course.id), course.title]));
  const userById = new Map(users.map(user => [String(user.id), user]));
  const selectionsByCode = new Map(users.map(user => [user.username, []]));
  for (const selection of selections) {
    const user = userById.get(selection.studentId);
    if (user && titlesById.has(selection.courseId)) {
      selectionsByCode.get(user.username).push({
        id: selection.courseId,
        title: titlesById.get(selection.courseId),
        status: selection.status,
      });
    }
  }
  const data = students.map(student => ({
    ...student,
    selectedCourses: selectionsByCode.get(student.code) || [],
  }));
  res.json({ success: true, data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}
async function getStudentById(req, res) {
  const student = await Student.findOne({ id: req.studentId });
  if (!student) return missing(res);
  res.json({ success: true, data: student });
}
async function createStudent(req, res) {
  // Synchronize with externally imported IDs, then increment atomically.
  const last = await Student.findOne().sort({ id: -1 }).select("id").lean();
  await Counter.updateOne({ _id: "students" }, { $max: { value: last?.id || 0 } }, { upsert: true });
  const counter = await Counter.findOneAndUpdate({ _id: "students" }, { $inc: { value: 1 } }, { returnDocument: "after" });
  const student = await Student.create({ ...req.studentInput, id: counter.value });
  res.status(201).json({ success: true, data: student });
}
async function updateStudent(req, res) {
  const student = await Student.findOneAndUpdate({ id: req.studentId }, { $set: req.studentInput }, { returnDocument: "after", runValidators: true });
  if (!student) return missing(res);
  res.json({ success: true, data: student });
}
async function deleteStudent(req, res) {
  const student = await Student.findOneAndDelete({ id: req.studentId });
  if (!student) return missing(res);
  res.json({ success: true, message: "Оюутан устгагдлаа" });
}
module.exports = { getAllStudents, getStudentById, createStudent, updateStudent, deleteStudent };
