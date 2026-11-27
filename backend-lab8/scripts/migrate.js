require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('node:fs/promises');
const path = require('node:path');
const connectDB = require('../config/db');
const Student = require('../models/Student');
const Counter = require('../models/Counter');
const { loadSources } = require('./source-data');
const User = require('../models/User');
async function migrate() {
  const { sources, transformations } = await loadSources();
  transformations.push({
    collection: 'courses',
    id: 1795156404929,
    change: 'exact duplicate removed from source; student selections remapped to id 1795156403671',
  });
  const teacherAccounts = await User.find({ role: 'teacher' }).sort({ id: 1 }).select('id username role').lean();
  if (teacherAccounts.length) sources.teachers = teacherAccounts.map(({ id, username, role }) => ({ id, username, role }));

  const duplicateCourseIds = new Map([[1795156404929, 1795156403671]]);
  const courseKeys = new Map();
  sources.courses = sources.courses.filter((course) => {
    const key = JSON.stringify([course.title.trim(), course.teacher.trim(), course.schedule.trim(), course.room.trim()]);
    const existing = courseKeys.get(key);
    if (!existing) {
      courseKeys.set(key, course.id);
      return true;
    }
    duplicateCourseIds.set(course.id, existing);
    transformations.push({ collection: 'courses', id: course.id, change: `exact duplicate of id ${existing}; removed` });
    return false;
  });
  // Validate every resource before changing any collection.
  const models = { students: Student, courses: require('../models/Course'),
    teachers: require('../models/Teacher'), departments: require('../models/Department'),
    rooms: require('../models/Room') };
  for (const [name, rows] of Object.entries(sources)) {
    for (const row of rows) await new models[name](row).validate();
  }
  if (duplicateCourseIds.size) {
    const accounts = await User.find({ role: 'student' }).select('_id courseIds');
    for (const account of accounts) {
      const previousCourseIds = account.courseIds || [];
      const courseIds = [...new Set(previousCourseIds.map((id) =>
        String(duplicateCourseIds.get(Number(id)) ?? id)
      ))];
      if (courseIds.some((id, index) => id !== previousCourseIds[index]) ||
          courseIds.length !== previousCourseIds.length) {
        account.courseIds = courseIds;
        await account.save();
      }
    }
  }
  for (const model of Object.values(models)) await model.init();
  const results = [];
  for (const [name, rows] of Object.entries(sources)) {
    const collection = mongoose.connection.db.collection(name);
    await collection.createIndex({ id: 1 }, { unique: true });
    const before = await collection.countDocuments();
    if (rows.length) await collection.bulkWrite(rows.map(row => ({ updateOne: {
      filter: { id: row.id }, update: { $setOnInsert: row }, upsert: true,
    } })));
    results.push({ collection: name, source: rows.length, before, after: await collection.countDocuments() });
  }
  const last = await Student.findOne().sort({ id: -1 }).lean();
  await Counter.updateOne({ _id: 'students' }, { $max: { value: last?.id || 0 } }, { upsert: true });
  for (const [name, Model] of Object.entries({
    courses: require('../models/Course'),
    departments: require('../models/Department'),
    rooms: require('../models/Room'),
  })) {
    const lastResource = await Model.findOne().sort({ id: -1 }).select('id').lean();
    await Counter.updateOne({ _id: name }, { $max: { value: lastResource?.id || 0 } }, { upsert: true });
  }
  const report = { generatedAt: new Date().toISOString(), results, transformations,
    notes: ['Existing IDs are preserved; migration never overwrites existing documents.', 'teachers source falls back to teacher accounts without password hashes.'] };
  await fs.mkdir(path.join(__dirname, '../reports'), { recursive: true });
  await fs.writeFile(path.join(__dirname, '../reports/migration-run.json'), JSON.stringify(report, null, 2));
  console.table(results);
  return report;
}
if (require.main === module) connectDB().then(migrate).catch(error => { console.error(error); process.exitCode = 1; }).finally(() => mongoose.disconnect());
module.exports = { migrate };
