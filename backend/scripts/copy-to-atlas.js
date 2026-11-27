const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const dotenv = require('dotenv');
const { MongoClient, BSON } = require('mongoose').mongo;
const root = path.resolve(__dirname, '..');
const fingerprint = rows => crypto.createHash('sha256').update(BSON.EJSON.stringify(rows, { relaxed: false })).digest('hex');
async function main() {
  dotenv.config({ path: path.join(root, '.env') });
  const sourceUri = require('../config/db').getMongoUri();
  const atlas = dotenv.parse(await fs.readFile(path.join(root, '.env.atlas')));
  const targetUri = atlas.MONGODB_URI;
  if (!targetUri || targetUri.includes('ATLAS_PASSWORD') || !targetUri.startsWith('mongodb+srv://')) throw new Error('Configure the Atlas URI in .env.atlas first.');
  const source = new MongoClient(sourceUri, { serverSelectionTimeoutMS: 10000 });
  const target = new MongoClient(targetUri, { serverSelectionTimeoutMS: 10000 });
  try {
    await source.connect(); await target.connect();
    const from = source.db(), to = target.db();
    if (from.databaseName !== 'universityDb' || to.databaseName !== 'universityDb') throw new Error('Both connections must select universityDb.');
    const existing = await to.listCollections({}, { nameOnly: true }).toArray();
    for (const { name } of existing) {
      if (name.startsWith('system.')) continue;
      if (await to.collection(name).countDocuments()) throw new Error('Atlas already contains documents; refusing to overwrite.');
    }
    const snapshot = [];
    for (const { name } of await from.listCollections({}, { nameOnly: true }).toArray()) {
      if (name.startsWith('system.') || name.startsWith('assessment_test_')) continue;
      snapshot.push({ name, rows: await from.collection(name).find().sort({ _id: 1 }).toArray(), indexes: await from.collection(name).indexes() });
    }
    if (!snapshot.length) throw new Error('Source database has no collections.');
    const directory = path.join(root, 'exports');
    await fs.mkdir(directory, { recursive: true });
    const backup = path.join(directory, `before-atlas-${Date.now()}.ejson`);
    await fs.writeFile(backup, BSON.EJSON.stringify(snapshot), { mode: 0o600, flag: 'wx' });
    console.log('Local backup saved under backend/exports (Git ignored).');
    const known = new Set(existing.map(row => row.name));
    const report = [];
    for (const item of snapshot) {
      if (!known.has(item.name)) await to.createCollection(item.name);
      const collection = to.collection(item.name);
      if (item.rows.length) await collection.insertMany(item.rows);
      for (const index of item.indexes) {
        if (index.name === '_id_') continue;
        const { key, v, ns, ...options } = index;
        await collection.createIndex(key, options);
      }
      const copied = await collection.find().sort({ _id: 1 }).toArray();
      if (fingerprint(copied) !== fingerprint(item.rows)) throw new Error(`Data verification failed: ${item.name}`);
      report.push({ collection: item.name, count: copied.length, verified: true });
      console.log(`${item.name}: ${copied.length} copied and verified`);
    }
    await fs.mkdir(path.join(root, 'reports'), { recursive: true });
    await fs.writeFile(path.join(root, 'reports/atlas-copy.json'), JSON.stringify({ completedAt: new Date().toISOString(), sourceChanged: false, report }, null, 2) + '\n');
  } finally { await source.close(); await target.close(); }
}
main().catch(error => {
  // Avoid logging connection errors that could contain credentials.
  console.error('Atlas copy failed:', error.code === 18 ? 'authentication error' : error.name || 'Error');
  if (error.message?.startsWith('Atlas already') || error.message?.startsWith('Data verification')) console.error(error.message);
  process.exitCode = 1;
});
