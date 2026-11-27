const Course = require("../models/Course");
const Counter = require("../models/Counter");
const User = require("../models/User");
const CourseSelection = require("../models/CourseSelection");

const { sessionsFor, validateSessions, scheduleLabel, overlap } = require('../services/schedule');
const publicCourse = (document) => {
  const course = typeof document.toObject === 'function' ? document.toObject() : document;
  return { ...course, id: String(course.id), sessions: sessionsFor(course) };
};
async function checkSchedule(course, excludeId) {
  if (!course.sessions) course = { ...course, sessions: sessionsFor(course) };
  const invalid = validateSessions(course.sessions);
  if (invalid) return invalid;
  if (!excludeId) return null;
  const active = await CourseSelection.find({ status:'approved' }).select('courseId').lean();
  const others = await Course.find({ id: { $in:active.map(s=>Number(s.courseId)), $ne:excludeId } }).lean();
  for (const other of others) {
    if (course.sessions.some(a => sessionsFor(other).some(b => overlap(a,b) && (course.teacher === other.teacher || a.room.trim().toLowerCase() === (b.room || other.room).trim().toLowerCase())))) return `“${other.title}” хичээлийн багш эсвэл өрөөний цагтай давхцаж байна.`;
  }
  const approved = await CourseSelection.find({ courseId: String(excludeId), status: 'approved' }).lean();
  if (approved.length) {
    const selections = await CourseSelection.find({ studentId: { $in: approved.map(s=>s.studentId) }, courseId: { $ne: String(excludeId) }, status: 'approved' }).lean();
    const ids = new Set(selections.map(s=>Number(s.courseId)));
    if (others.some(c=>ids.has(c.id) && course.sessions.some(a=>sessionsFor(c).some(b=>overlap(a,b))))) return 'Бүртгэлтэй оюутны баталгаажсан өөр хичээлийн цагтай давхцаж байна.';
  }
  return null;
}
const parseCourseId = (id) => /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id)) ? Number(id) : null;

async function getCourses(req, res) {
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const filter = search ? {
    $or: ["title", "teacher", "schedule", "room"].map((field) => ({
      [field]: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" },
    })),
  } : {};
  if (req.user.role === "teacher") filter.teacher = req.user.username;
  const courses = await Course.find(filter).sort({ id: 1 }).lean();
  res.json(courses.map(publicCourse));
}

async function getCourseById(req, res) {
  const id = parseCourseId(req.params.id);
  if (!id) return res.status(400).json({ message: "ID must be a positive integer" });
  const course = await Course.findOne({ id }).lean();
  if (!course) return res.status(404).json({ message: "Course not found" });
  res.json(publicCourse(course));
}

async function createCourse(req, res) {
  const { title, teacher, schedule, room } = req.body;
  const collision = await checkSchedule(req.body);
  if (collision) return res.status(409).json({ message: collision });
  const last = await Course.findOne().sort({ id: -1 }).select("id").lean();
  await Counter.updateOne({ _id: "courses" }, { $max: { value: last?.id || 0 } }, { upsert: true });
  const counter = await Counter.findOneAndUpdate(
    { _id: "courses" }, { $inc: { value: 1 } }, { returnDocument: "after" }
  );
  try {
    const course = await Course.create({
      ...Object.fromEntries(["code","credits","year","semester","category","sessions"].filter(k=>req.body[k]!==undefined).map(k=>[k,req.body[k]])),
      id: counter.value,
      title: title.trim(),
      teacher: teacher.trim(),
      schedule: schedule.trim(),
      room: room.trim(),
    });
    res.status(201).json(publicCourse(course));
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "Course already exists" });
    throw error;
  }
}

async function updateCourse(req, res) {
  const id = parseCourseId(req.params.id);
  if (!id) return res.status(400).json({ message: "ID must be a positive integer" });
  const updates = {};
  for (const field of ["title", "teacher", "schedule", "room"]) {
    if (req.body[field] !== undefined) updates[field] = req.body[field].trim();
  }
  const existing = await Course.findOne({ id }).lean();
  if (!existing) return res.status(404).json({ message: "Course not found" });
  for (const field of ['code','credits','year','semester','category','sessions']) if(req.body[field] !== undefined) updates[field] = req.body[field];
  if (updates.sessions || updates.teacher !== undefined || updates.schedule !== undefined || updates.room !== undefined) {
    if (!updates.sessions && updates.schedule !== undefined && updates.schedule !== existing.schedule) {
      updates.sessions = sessionsFor({ ...existing, ...updates, sessions: [] });
    }
    const collision = await checkSchedule({ ...existing, ...updates }, id);
    if (collision) return res.status(409).json({ message: collision });
    if (updates.sessions) {
      updates.schedule = scheduleLabel(updates.sessions) || 'Хуваарь хүлээгдэж байна';
      updates.room = updates.sessions[0]?.room || existing.room;
    }
  }
  const updated = await Course.findOneAndUpdate({ id }, { $set: updates }, { new: true, runValidators: true });
  if (!updated) return res.status(404).json({ message: "Course not found" });
  res.json(publicCourse(updated));
}

async function deleteCourse(req, res) {
  const id = parseCourseId(req.params.id);
  if (!id) return res.status(400).json({ message: "ID must be a positive integer" });
  const course = await Course.findOneAndDelete({ id });
  if (!course) return res.status(404).json({ message: "Course not found" });
  await User.updateMany(
    { courseIds: req.params.id },
    { $pull: { courseIds: req.params.id } }
  );
  await CourseSelection.deleteMany({ courseId: req.params.id });
  res.status(204).end();
}

module.exports = { getCourses, getCourseById, createCourse, updateCourse, deleteCourse };
