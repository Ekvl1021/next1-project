require('dotenv').config();
const fs = require('node:fs/promises');
const { existsSync } = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Department = require('../models/Department');
async function verifyDepartments() {
  const backend = path.resolve(__dirname, '..');
  const root = path.resolve(backend, '../..');
  const sourceFile = path.join(backend, 'data/departments.json');
  const exportFile = path.join(backend, 'exports/departments_export.json');
  const rows = JSON.parse(await fs.readFile(sourceFile, 'utf8'));
  assert.ok(Array.isArray(rows) && rows.length > 0, 'departments.json must contain a non-empty array');
  const ids = new Set();
  for (const row of rows) {
    assert.ok(Number.isSafeInteger(row.id) && row.id > 0, 'id must be a positive integer');
    assert.ok(!ids.has(row.id), 'Duplicate source id');
    ids.add(row.id);
    await new Department(row).validate();
  }
  await Department.init();
  const collection = mongoose.connection.db.collection('departments');
  const before = await collection.countDocuments();
  let newDocuments = 0;
  for (const row of rows) {
    const existing = await collection.findOne({ id: row.id });
    if (!existing) newDocuments++;
    else for (const [field, value] of Object.entries(row)) {
      assert.deepEqual(existing[field], value, `Existing department ${row.id}.${field} differs; refusing to overwrite`);
    }
  }
  await fs.mkdir(path.dirname(exportFile), { recursive: true });
  const commands = [];
  function run(name, args) {
    const local = path.join(root, '.local-tools/bin', name);
    const result = spawnSync(existsSync(local) ? local : name, args, { cwd: backend, encoding: 'utf8' });
    if (result.error) throw result.error;
    assert.equal(result.status, 0, result.stderr);
    commands.push({ tool: name, args: args.map(arg => arg.startsWith('--uri=') ? '--uri=<configured MongoDB>' : arg), diagnostics: result.stderr });
    console.log(name, result.stderr.trim());
  }
  run('mongoimport', [`--uri=${process.env.MONGODB_URI}`, '--collection=departments', `--file=${sourceFile}`, '--jsonArray', '--mode=merge', '--upsertFields=id', '--stopOnError']);
  run('mongoexport', [`--uri=${process.env.MONGODB_URI}`, '--collection=departments', `--out=${exportFile}`, '--jsonArray', '--pretty']);
  const exported = JSON.parse(await fs.readFile(exportFile, 'utf8'));
  const after = await collection.countDocuments();
  assert.equal(after, before + newDocuments);
  assert.equal(exported.length, after);
  for (const row of rows) {
    const match = exported.find(item => item.id === row.id);
    assert.ok(match, `Missing exported department ${row.id}`);
    for (const [field, value] of Object.entries(row)) assert.deepEqual(match[field], value);
    assert.ok(Number.isSafeInteger(match.id));
  }
  const report = { generatedAt: new Date().toISOString(), database: mongoose.connection.db.databaseName,
    collection: 'departments', sourceFile, exportFile, jsonCount: rows.length, mongoBefore: before,
    mongoAfter: after, exportedCount: exported.length, newDocuments, sourceRows: rows,
    passed: true, checks: ['JSON array', 'document counts', 'source field values', 'numeric id', 'Cyrillic preserved'], commands };
  await fs.mkdir(path.join(backend, 'reports'), { recursive: true });
  await fs.writeFile(path.join(backend, 'reports/departments-json-verification.json'), JSON.stringify(report, null, 2) + '\n');
  console.table([{ json: rows.length, mongoBefore: before, mongoAfter: after, exported: exported.length, passed: true }]);
}
connectDB().then(verifyDepartments).catch(error => { console.error(error); process.exitCode = 1; }).finally(() => mongoose.disconnect());
