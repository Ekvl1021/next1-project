const router = require('express').Router();
const { authenticateToken } = require('../middlewares/auth');
const { read, write } = require('../store');
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
const text = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 200;
const time = value => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
const date = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const empty = () => ({ schedule: [], tasks: [], grades: [] });
// Serialize read-modify-write operations so two users saving together cannot overwrite each other.
let writes = Promise.resolve();
router.use(authenticateToken);
router.get('/', wrap(async (req, res) => {
  const rows = await read('planners.json');
  const record = rows.find(row => row.userId === req.user.id);
  res.json(record ? { schedule: record.schedule, tasks: record.tasks, grades: record.grades } : empty());
}));
router.put('/', wrap(async (req, res) => {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      Object.keys(body).some(key => !['schedule', 'tasks', 'grades'].includes(key)) ||
      !['schedule', 'tasks', 'grades'].every(key => Array.isArray(body[key]) && body[key].length <= 200)) {
    return res.status(400).json({ message: 'Төлөвлөгөөний өгөгдлийн бүтэц буруу байна.' });
  }
  const errors = [];
  for (const [group, rows] of Object.entries(body)) {
    const ids = new Set();
    for (const row of rows) {
      if (!row || typeof row !== 'object' || Array.isArray(row) || !text(row.id) || !text(row.title) || ids.has(row.id)) {
        errors.push(`${group}: нэр болон давхардаагүй ID шаардлагатай`); continue;
      }
      ids.add(row.id);
      if (group === 'schedule' && (!Number.isInteger(row.day) || row.day < 0 || row.day > 6 || !time(row.start) || !time(row.end) || row.end <= row.start || typeof row.room !== 'string' || row.room.length > 100)) errors.push('Хуваарийн өдөр, эхлэх/дуусах цаг эсвэл өрөө буруу байна.');
      if (group === 'tasks' && (!date(row.due) || !['low', 'normal', 'high'].includes(row.priority) || typeof row.done !== 'boolean' || !['assignment', 'exam', 'personal'].includes(row.kind))) errors.push('Төлөвлөгөөний хугацаа, төрөл эсвэл төлөв буруу байна.');
      if (group === 'grades' && (!Number.isFinite(row.credits) || row.credits <= 0 || row.credits > 30 || !Number.isFinite(row.point) || row.point < 0 || row.point > 4 || !text(row.term))) errors.push('Кредит 0–30, үнэлгээ 0–4 хооронд байх ёстой.');
    }
  }
  if (errors.length) return res.status(400).json({ message: errors[0], errors });
  const clean = {
    schedule: body.schedule.map(({ id, title, day, start, end, room }) => ({ id, title: title.trim(), day, start, end, room: room.trim() })),
    tasks: body.tasks.map(({ id, title, due, priority, done, kind }) => ({ id, title: title.trim(), due, priority, done, kind })),
    grades: body.grades.map(({ id, title, credits, point, term }) => ({ id, title: title.trim(), credits, point, term: term.trim() })),
  };
  const operation = writes.then(async () => {
    const rows = await read('planners.json');
    const index = rows.findIndex(row => row.userId === req.user.id);
    const record = { userId: req.user.id, ...clean };
    if (index < 0) rows.push(record); else rows[index] = record;
    await write('planners.json', rows);
  });
  writes = operation.catch(() => {});
  await operation;
  res.json(clean);
}));
module.exports = router;
