const router = require('express').Router();
const { authenticateToken } = require('../middlewares/auth');
const Planner = require('../models/Planner');
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

const text = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 200;
const time = value => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
const date = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const empty = () => ({ schedule: [], tasks: [], grades: [] });
const gradeForScore = score => {
  if (score >= 95) return { letter: 'A+', point: 4 };
  if (score >= 90) return { letter: 'A', point: 3.7 };
  if (score >= 85) return { letter: 'B+', point: 3.3 };
  if (score >= 80) return { letter: 'B', point: 3 };
  if (score >= 75) return { letter: 'C+', point: 2.7 };
  if (score >= 70) return { letter: 'C', point: 2.3 };
  if (score >= 65) return { letter: 'D+', point: 2 };
  if (score >= 60) return { letter: 'D', point: 1.7 };
  return { letter: 'F', point: 0 };
};

router.use(authenticateToken);

router.get('/', wrap(async (req, res) => {
  const record = await Planner.findOne({ userId: req.user.id }).lean();
  res.json(record ? { schedule: record.schedule, tasks: record.tasks, grades: record.grades } : empty());
}));

router.put('/', wrap(savePlanner));
router.patch('/', wrap(savePlanner));
async function savePlanner(req, res) {
  const body = req.body;
  const groups = ['schedule', 'tasks', 'grades'];
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      Object.keys(body).some(key => !groups.includes(key)) ||
      !Object.keys(body).length || !Object.keys(body).every(key => Array.isArray(body[key]) && body[key].length <= 200)) {
    return res.status(400).json({ message: 'Төлөвлөгөөний өгөгдлийн бүтэц буруу байна.' });
  }

  const errors = [];
  for (const [group, rows] of Object.entries(body)) {
    const ids = new Set();
    for (const row of rows) {
      if (!row || typeof row !== 'object' || Array.isArray(row) || !text(row.id) ||
          !text(row.title) || ids.has(row.id)) {
        errors.push(`${group}: нэр болон давхардаагүй ID шаардлагатай`);
        continue;
      }
      ids.add(row.id);
      if (group === 'schedule' &&
          (!Number.isInteger(row.day) || row.day < 0 || row.day > 6 ||
           !time(row.start) || !time(row.end) || row.end <= row.start ||
           typeof row.room !== 'string' || row.room.length > 100)) {
        errors.push('Хуваарийн өдөр, эхлэх/дуусах цаг эсвэл өрөө буруу байна.');
      }
      if (group === 'tasks' &&
          (!date(row.due) || !['low', 'normal', 'high'].includes(row.priority) ||
           typeof row.done !== 'boolean' || !['assignment', 'exam', 'personal'].includes(row.kind))) {
        errors.push('Төлөвлөгөөний хугацаа, төрөл эсвэл төлөв буруу байна.');
      }
      if (group === 'grades' &&
          (!Number.isFinite(row.credits) || row.credits <= 0 || row.credits > 30 ||
           !Number.isFinite(row.score) || row.score < 0 || row.score > 100 || !text(row.term))) {
        errors.push('Кредит 0.1–30, оноо 0–100 хооронд байх ёстой.');
      }
    }
  }
  if (errors.length) return res.status(400).json({ message: errors[0], errors });

  const clean = {
    schedule: (body.schedule || []).map(({ id, title, day, start, end, room }) =>
      ({ id, title: title.trim(), day, start, end, room: room.trim() })),
    tasks: (body.tasks || []).map(({ id, title, due, priority, done, kind }) =>
      ({ id, title: title.trim(), due, priority, done, kind })),
    grades: (body.grades || []).map(({ id, title, credits, score, term }) =>
      ({ id, title: title.trim(), credits, score, ...gradeForScore(score), term: term.trim() })),
  };
  const updates = Object.fromEntries(Object.keys(body).map(key=>[key,clean[key]]));
  if(req.user.role === 'student' && updates.schedule?.length) return res.status(403).json({message:'Хичээлийн хуваарийг администратор тохируулна.'});
  const saved = await Planner.findOneAndUpdate(
    { userId: req.user.id },
    { $set: { userId: req.user.id, ...updates } },
    { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true }
  );
  res.json({ schedule:saved.schedule, tasks:saved.tasks, grades:saved.grades });
}

module.exports = router;
