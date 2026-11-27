require('dotenv').config();
const fs = require('node:fs/promises');
const path = require('node:path');
const mongoose = require('mongoose');
const { write } = require('../store');
async function main() {
  await require('../config/db')();
  const resources = { students: 'Student', teachers: 'Teacher', rooms: 'Room', departments: 'Department', courses: 'Course' };
  const snapshots = {};
  for (const [name, model] of Object.entries(resources)) {
    snapshots[name] = await require(`../models/${model}`).find({}).select('-_id -__v').sort({ id: 1 }).lean();
  }
  const backupDir = await fs.mkdtemp(path.join(require('node:os').tmpdir(), 'edura-data-backup-'));
  for (const [name, rows] of Object.entries(snapshots)) {
    const filename = `${name}.json`;
    await fs.copyFile(path.join(__dirname, '../data', filename), path.join(backupDir, filename)).catch(error => { if (error.code !== 'ENOENT') throw error; });
    await write(filename, rows);
    const saved = JSON.parse(await fs.readFile(path.join(__dirname, '../data', filename), 'utf8'));
    if (saved.length !== rows.length) throw new Error(`${filename}: export count mismatch`);
    console.log(`${filename}: ${saved.length}`);
  }
  console.log(`Previous JSON backup: ${backupDir}`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
