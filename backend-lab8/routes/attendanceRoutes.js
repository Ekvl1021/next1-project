const router = require('express').Router();
const { authenticateToken } = require('../middlewares/auth');
const Attendance = require('../models/Attendance');
const Course = require('../models/Course');
const Student = require('../models/Student');
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
const statuses = ['present', 'absent', 'late', 'excused'];
const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function teacherCourse(req, courseId) {
  if (!/^[1-9]\d*$/.test(courseId)) return null;
  return Course.findOne({
    id: Number(courseId),
    teacher: { $regex: `^${escapeRegex(req.user.username)}$`, $options: 'i' },
  }).lean();
}

router.use(authenticateToken);

router.get('/', wrap(async (req, res) => {
  const { courseId, date } = req.query;
  if (date !== undefined && !validDate(date)) {
    return res.status(400).json({ message: 'date must use YYYY-MM-DD format' });
  }
  if (courseId !== undefined && (typeof courseId !== 'string' || !/^[1-9]\d*$/.test(courseId))) {
    return res.status(400).json({ message: 'courseId must be a positive numeric ID' });
  }

  const filter = {};
  if (req.user.role === 'student') {
    const student = await Student.findOne({ code: req.user.username }).select('code').lean();
    if (!student) return res.status(404).json({ message: 'Student profile not found' });
    filter.studentCode = student.code;
  } else if (req.user.role === 'teacher') {
    const assigned = await Course.find({
      teacher: { $regex: `^${escapeRegex(req.user.username)}$`, $options: 'i' },
    }).select('id').lean();
    const assignedIds = assigned.map(course => String(course.id));
    if (courseId && !assignedIds.includes(courseId)) return res.status(403).json({ message: 'You may only view attendance for your courses' });
    filter.courseId = courseId ? courseId : { $in: assignedIds };
  } else if (courseId) {
    filter.courseId = courseId;
  }
  if (date) filter.date = date;
  const records = await Attendance.find(filter).sort({ date: -1, courseId: 1, studentCode: 1 }).lean();
  const courseIds = [...new Set(records.map(record => Number(record.courseId)))];
  const studentCodes = [...new Set(records.map(record => record.studentCode))];
  const [courses, students] = await Promise.all([
    Course.find({ id: { $in: courseIds } }).select('id title').lean(),
    Student.find({ code: { $in: studentCodes } }).select('code firstName lastName').lean(),
  ]);
  const courseTitles = new Map(courses.map(course => [String(course.id), course.title]));
  const studentNames = new Map(students.map(student => [student.code, `${student.lastName} ${student.firstName}`.trim()]));
  res.json({ data: records.map(record => ({
    ...record,
    courseTitle: courseTitles.get(record.courseId) || record.courseId,
    studentName: studentNames.get(record.studentCode) || record.studentCode,
  })) });
}));

router.put('/', wrap(async (req, res) => {
  const { courseId, date, entries } = req.body || {};
  if (typeof courseId !== 'string' || !/^[1-9]\d*$/.test(courseId) ||
      !validDate(date) || !Array.isArray(entries) || entries.length < 1 || entries.length > 100) {
    return res.status(400).json({ message: 'courseId, date, and 1–100 attendance entries are required' });
  }
  if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Зөвхөн хичээлийн багш ирц бүртгэнэ.' });

  const course = req.user.role === 'admin'
    ? await Course.findOne({ id: Number(courseId) }).select('id').lean()
    : await teacherCourse(req, courseId);
  if (!course) return res.status(403).json({ message: 'Course not found or not assigned to this teacher' });

  const codes = new Set();
  for (const entry of entries) {
    if (!entry || typeof entry.studentCode !== 'string' || entry.studentCode.trim().length === 0 ||
        (entry.status !== null && !statuses.includes(entry.status)) || codes.has(entry.studentCode)) {
      return res.status(400).json({ message: 'Each student must have a unique code and valid attendance status' });
    }
    codes.add(entry.studentCode);
  }
  const existingStudents = await Student.find({ code: { $in: [...codes] } }).select('code').lean();
  if (existingStudents.length !== codes.size) {
    return res.status(400).json({ message: 'One or more student codes do not exist' });
  }
  const selections = await require('../models/CourseSelection').find({courseId,status:'approved'}).lean();
  const enrolledUsers = await require('../models/User').find({id:{$in:selections.map(s=>Number(s.studentId))},role:'student'}).select('username').lean();
  const enrolledCodes = new Set(enrolledUsers.map(u=>u.username));
  if([...codes].some(code=>!enrolledCodes.has(code))) return res.status(400).json({message:'Зөвхөн баталгаажсан сонголттой оюутны ирц бүртгэнэ.'});
  await Attendance.bulkWrite(entries.map(entry => entry.status === null ? ({
    deleteOne: { filter: { courseId, studentCode: entry.studentCode, date } },
  }) : ({
    updateOne: {
      filter: { courseId, studentCode: entry.studentCode, date },
      update: { $set: { status: entry.status, markedBy: req.user.username } },
      upsert: true,
    },
  })));
  const records = await Attendance.find({ courseId, date, studentCode: { $in: [...codes] } }).sort({ studentCode: 1 }).lean();
  res.json({ data: records });
}));

module.exports = router;
