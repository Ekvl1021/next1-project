require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('node:fs/promises');
const fssync = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const connectDB = require('../config/db');
const { migrate } = require('./migrate');
const { migrationReport } = require('./migration-report');
const { cleanStudentIds } = require('./clean-student-ids');
const backend = path.resolve(__dirname, '..');
const root = path.resolve(backend, '../..');
const runLog = [];
function run(name, args) {
  const local = path.join(root, '.local-tools/bin', name);
  const result = spawnSync(fssync.existsSync(local) ? local : name, args, { cwd: backend, encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${name}: ${result.stderr || result.stdout}`);
  runLog.push({ tool: name, args, output: result.stdout, diagnostics: result.stderr });
  console.log(`${name}: OK`);
}
async function verifyLab() {
  const db = mongoose.connection.db;
  const uri = process.env.MONGODB_URI;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const output = path.join(backend, 'exports');
  const backupRoot = path.join(root, 'mongo-backups', timestamp);
  await fs.mkdir(output, { recursive: true });
  await fs.mkdir(backupRoot, { recursive: true });
  const migration = await migrate();
  const beforeImport = await migrationReport();
  assert.ok(beforeImport.collections.every(item => !item.differences.length && !item.invalidIds.length && Object.values(item.duplicates).every(rows => !rows.length)));
  // Do not overwrite a real student whose ID collides with an exercise fixture.
  const jsonRows = JSON.parse(await fs.readFile(path.join(backend, 'data/import_students.json'), 'utf8'));
  const csvRows = (await fs.readFile(path.join(backend, 'data/students.csv'), 'utf8')).trim().split('\n').slice(1).map(line => {
    const [id, code, firstName, lastName, email] = line.split(','); return { id: Number(id), code, firstName, lastName, email };
  });
  for (const row of [...jsonRows, ...csvRows]) {
    const existing = await db.collection('students').findOne({ id: row.id });
    if (existing && Object.keys(row).some(key => existing[key] !== row[key])) throw new Error(`Fixture ID ${row.id} belongs to another student; refusing to overwrite`);
  }
  const counts = { beforeJSON: await db.collection('students').countDocuments() };
  run('mongoimport', [`--uri=${uri}`, '--collection=students', '--file=data/import_students.json', '--jsonArray', '--mode=upsert', '--upsertFields=id']);
  counts.afterJSON = await db.collection('students').countDocuments();
  run('mongoimport', [`--uri=${uri}`, '--collection=students', '--type=csv', '--headerline', '--file=data/students.csv', '--mode=upsert', '--upsertFields=id']);
  const cleanup = await cleanStudentIds();
  counts.afterCSV = await db.collection('students').countDocuments();
  run('mongoexport', [`--uri=${uri}`, '--collection=students', `--out=${path.join(output, 'backup_students.json')}`, '--jsonArray', '--pretty']);
  run('mongoexport', [`--uri=${uri}`, '--collection=students', '--fields=id,code,firstName,lastName,email', `--out=${path.join(output, 'students_public.json')}`, '--jsonArray', '--pretty']);
  run('mongoexport', [`--uri=${uri}`, '--collection=students', '--type=csv', '--fields=id,code,firstName,lastName,email', `--out=${path.join(output, 'students_export.csv')}`]);
  const exported = JSON.parse(await fs.readFile(path.join(output, 'backup_students.json'), 'utf8'));
  assert.equal(exported.length, counts.afterCSV);
  assert.ok(exported.every(row => Number.isSafeInteger(row.id) && row.id > 0));
  assert.ok(exported.some(row => row.firstName === 'Номин'));
  const csv = await fs.readFile(path.join(output, 'students_export.csv'), 'utf8');
  assert.match(csv, /^id,code,firstName,lastName,email/);
  assert.match(csv, /Номин/);
  run('mongodump', [`--uri=${uri}`, `--out=${backupRoot}`]);
  const archive = path.join(backupRoot, 'university.archive.gz');
  run('mongodump', [`--uri=${uri}`, `--archive=${archive}`, '--gzip']);
  const sourceName = db.databaseName;
  const client = mongoose.connection.getClient();
  const names = (await client.db('admin').admin().listDatabases()).databases.map(item => item.name);
  const restoreName = (names.includes('test_restore') || names.includes('test_restore_archive')) ? `test_restore_${Date.now()}` : 'test_restore';
  const archiveName = `${restoreName}_archive`;
  const serverURI = new URL(uri);
  serverURI.pathname = '/';
  run('mongorestore', [`--uri=${serverURI.toString()}`, `--nsFrom=${sourceName}.*`, `--nsTo=${restoreName}.*`, backupRoot]);
  run('mongorestore', [`--uri=${serverURI.toString()}`, `--archive=${archive}`, '--gzip', `--nsFrom=${sourceName}.*`, `--nsTo=${archiveName}.*`]);
  const restore = [];
  for (const { name } of await db.listCollections().toArray()) {
    const source = await db.collection(name).find().sort({ _id: 1 }).toArray();
    const directory = await client.db(restoreName).collection(name).find().sort({ _id: 1 }).toArray();
    const compressed = await client.db(archiveName).collection(name).find().sort({ _id: 1 }).toArray();
    assert.equal(JSON.stringify(source), JSON.stringify(directory), `${name}: directory restore differs`);
    assert.equal(JSON.stringify(source), JSON.stringify(compressed), `${name}: archive restore differs`);
    restore.push({ collection: name, source: source.length, restored: directory.length, archiveRestored: compressed.length, exactMatch: true });
  }
  const finalMigration = await migrationReport();
  const report = { generatedAt: new Date().toISOString(), database: sourceName, migration, beforeImport, counts, cleanup,
    exportValidation: { jsonArray: true, numericIds: true, csvHeader: true, cyrillicPreserved: true },
    backupRoot, restoreDatabase: restoreName, archiveRestoreDatabase: archiveName, restore, migrationAfterImports: finalMigration, commands: runLog,
    manualChecks: ['MongoDB Compass Import/Export and screenshots require GUI verification.'] };
  await fs.mkdir(path.join(backend, 'reports'), { recursive: true });
  await fs.writeFile(path.join(backend, 'reports/lab8-verification.json'), JSON.stringify(report, null, 2));
  console.table(restore);
  console.log('Evidence: reports/lab8-verification.json');
}
connectDB().then(verifyLab).catch(error => { console.error(error); process.exitCode = 1; }).finally(() => mongoose.disconnect());
