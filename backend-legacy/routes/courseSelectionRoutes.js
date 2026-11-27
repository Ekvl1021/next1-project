const router = require('express').Router();
const { authenticateToken } = require('../middlewares/auth');
const { authorizeRoles } = require('../middlewares/authorize');
const { read, write } = require('../store');
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
let queue = Promise.resolve();
router.use(authenticateToken, authorizeRoles('student'));
router.get('/', wrap(async (req, res) => {
  const rows = await read('course-selections.json');
  res.json({ courseIds: rows.find(row => row.userId === req.user.id)?.courseIds || [] });
}));
router.put('/', wrap(async (req, res) => {
  const ids = req.body?.courseIds;
  const courses = await read('courses.json');
  if (!Array.isArray(ids) || ids.length > courses.length || !ids.every(id => typeof id === 'string' && courses.some(course => String(course.id) === id))) return res.status(400).json({ message: 'Хичээлийн сонголт буруу байна.' });
  const courseIds = [...new Set(ids)];
  const operation = queue.then(async () => {
    const rows = await read('course-selections.json');
    const index = rows.findIndex(row => row.userId === req.user.id);
    const value = { userId: req.user.id, courseIds };
    if (index < 0) rows.push(value); else rows[index] = value;
    await write('course-selections.json', rows);
  });
  queue = operation.catch(() => {});
  await operation;
  res.json({ courseIds });
}));
module.exports = router;
