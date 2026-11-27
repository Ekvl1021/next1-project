const router = require('express').Router();
const { authenticateToken } = require('../middlewares/auth');
const { authorizeRoles } = require('../middlewares/authorize');
const { Assessment, Submission } = require('../models/Assessment');
const Course = require('../models/Course');
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
const text = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
function validAttachment(file) {
  return file == null || (text(file.name, 180) && typeof file.data === 'string' && file.data.length > 0 && file.data.length <= 6990508 && /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(file.data) && Buffer.from(file.data, 'base64').length <= 5 * 1024 * 1024);
}
const cleanFile = file => file ? { name: file.name.trim().replace(/[\\/\r\n]/g, '_'), data: file.data } : null;
const meta = row => ({ ...row, attachment: row.attachment ? { name: row.attachment.name } : null });
async function visibleCourses() {
  return Course.find({}).sort({ id: 1 }).lean();
}
router.use(authenticateToken, authorizeRoles('teacher', 'student'));
router.get('/', wrap(async (req, res) => {
  const courses = await visibleCourses(req.user);
  const rows = await Assessment.find({ courseId: { $in: courses.map(c => String(c.id)) } }).select('-attachment.data').sort({ dueAt: 1 }).lean();
  const submissions = await Submission.find({ assessmentId: { $in: rows.map(r => r._id) }, ...(req.user.role === 'student' ? { studentId: req.user.id } : {}) }).select('-attachment.data').lean();
  res.json({ courses: courses.map(c => ({ id: String(c.id), title: c.title, teacher: c.teacher, canSubmit: req.user.role === 'student' })), items: rows.map(row => ({ ...meta(row), id: String(row._id), submissions: submissions.filter(s => String(s.assessmentId) === String(row._id)).map(s => ({ ...meta(s), id: String(s._id) })) })) });
}));
router.post('/', authorizeRoles('teacher'), wrap(async (req, res) => {
  const { courseId, kind, title, description, dueAt, attachment } = req.body || {};
  if (!text(courseId, 20) || !/^\d+$/.test(courseId) || !['assignment', 'exam'].includes(kind) || !text(title, 160) || !text(description, 10000) || typeof dueAt !== 'string' || !Number.isFinite(Date.parse(dueAt)) || Date.parse(dueAt) <= Date.now() || !validAttachment(attachment)) return res.status(400).json({ message: 'Хичээл, гарчиг, тайлбар, ирээдүйн хугацаа болон 5 MB хүртэл файл оруулна уу.' });
  if (!await Course.exists({ id: Number(courseId) })) return res.status(403).json({ message: 'Хичээл олдсонгүй.' });
  const row = await Assessment.create({ courseId, kind, title: title.trim(), description: description.trim(), dueAt, attachment: cleanFile(attachment), createdBy: req.user.username });
  res.status(201).json({ id: String(row._id) });
}));
router.param('id', (req, res, next, id) => /^[a-f\d]{24}$/i.test(id) ? next() : res.status(400).json({ message: 'Буруу ID.' }));
async function accessible(req, res, approvedOnly = false) {
  const row = await Assessment.findById(req.params.id).lean();
  if (!row) { res.status(404).json({ message: 'Даалгавар / шалгалт олдсонгүй.' }); return null; }
  const courses = await visibleCourses(req.user, approvedOnly);
  if (!courses.some(c => String(c.id) === row.courseId)) { res.status(403).json({ message: 'Энэ хичээлд хандах эрхгүй.' }); return null; }
  return row;
}
router.put('/:id/submission', authorizeRoles('student'), wrap(async (req, res) => {
  const row = await accessible(req, res, true); if (!row) return;
  if (new Date(row.dueAt).getTime() <= Date.now()) return res.status(400).json({ message: 'Илгээх хугацаа дууссан байна.' });
  const { answer = '', attachment } = req.body || {};
  if (typeof answer !== 'string' || answer.length > 10000 || (!answer.trim() && !attachment) || !validAttachment(attachment)) return res.status(400).json({ message: 'Хариу бичих эсвэл 5 MB хүртэл файл хавсаргана уу.' });
  await Submission.findOneAndUpdate({ assessmentId: row._id, studentId: req.user.id }, { $set: { studentCode: req.user.username, answer: answer.trim(), attachment: cleanFile(attachment) } }, { upsert: true, runValidators: true });
  res.json({ message: 'Хариуг илгээлээ.' });
}));
router.get('/:id/file', wrap(async (req, res) => {
  const row = await accessible(req, res); if (!row) return;
  let file = row.attachment;
  if (req.query.submission) {
    if (!/^[a-f\d]{24}$/i.test(String(req.query.submission))) return res.status(400).json({ message: 'Буруу ID.' });
    const submission = await Submission.findOne({ _id: req.query.submission, assessmentId: row._id, ...(req.user.role === 'student' ? { studentId: req.user.id } : {}) }).lean();
    file = submission?.attachment;
  }
  if (!file) return res.status(404).json({ message: 'Файл олдсонгүй.' });
  res.json(file);
}));
module.exports = router;
