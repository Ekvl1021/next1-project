require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('node:fs/promises');
const { existsSync } = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const connectDB = require('../config/db');

async function backupRestore() {
  const db = mongoose.connection.db;
  const sourceName = db.databaseName;
  const suffix = `${Date.now()}_${randomUUID().slice(0, 8)}`;
  const targetName = `test_restore_${suffix}`;
  const backend = path.resolve(__dirname, '..');
  const root = path.resolve(backend, '../..');
  const backupDir = path.join(root, 'mongo-backups', `additional-${suffix}`);
  await fs.mkdir(backupDir, { recursive: true });
  const archive = path.join(backupDir, 'university.archive.gz');
  const sourceURI = new URL(process.env.MONGODB_URI);
  sourceURI.pathname = '/';
  const commands = [];
  function run(name, args) {
    const local = path.join(root, '.local-tools/bin', name);
    const result = spawnSync(existsSync(local) ? local : name, args, { encoding: 'utf8' });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`${name}: ${result.stderr || result.stdout}`);
    // Keep URI credentials out of saved command evidence.
    commands.push({ tool: name, args: args.map(arg => arg.startsWith('--uri=') ? '--uri=<configured MongoDB>' : arg), diagnostics: result.stderr });
  }
  assert.notEqual(sourceName, targetName);
  const target = mongoose.connection.getClient().db(targetName);
  assert.equal((await target.listCollections().toArray()).length, 0);
  run('mongodump', [`--uri=${process.env.MONGODB_URI}`, `--archive=${archive}`, '--gzip']);
  run('mongorestore', [`--uri=${sourceURI}`, `--archive=${archive}`, '--gzip', `--nsFrom=${sourceName}.*`, `--nsTo=${targetName}.*`]);
  const collections = [];
  for (const { name } of await db.listCollections({ type: 'collection' }).toArray()) {
    const original = await db.collection(name).find().sort({ _id: 1 }).toArray();
    const restored = await target.collection(name).find().sort({ _id: 1 }).toArray();
    collections.push({ collection: name, sourceCount: original.length, restoredCount: restored.length,
      countMatches: original.length === restored.length, documentsMatch: JSON.stringify(original) === JSON.stringify(restored) });
  }
  const report = { generatedAt: new Date().toISOString(), sourceDatabase: sourceName, restoredDatabase: targetName,
    archive, collections, passed: collections.every(row => row.countMatches && row.documentsMatch), commands,
    note: 'Source database was not modified. A fresh destination was used without --drop. Concurrent source writes can cause comparison differences.' };
  await fs.mkdir(path.join(backend, 'reports'), { recursive: true });
  await fs.writeFile(path.join(backend, 'reports/backup-restore-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.table(collections);
  console.log('Restored database:', targetName);
  assert.ok(report.passed, 'Restore differs from current source; inspect report and check for concurrent writes');
  return report;
}
if (require.main === module) connectDB().then(backupRestore).catch(error => { console.error(error); process.exitCode = 1; }).finally(() => mongoose.disconnect());
module.exports = { backupRestore };
