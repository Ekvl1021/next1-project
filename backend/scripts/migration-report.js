require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('node:fs/promises');
const path = require('node:path');
const connectDB = require('../config/db');
const { loadSources } = require('./source-data');
async function migrationReport() {
  const { sources, transformations } = await loadSources();
  const collections = [];
  for (const [name, rows] of Object.entries(sources)) {
    const collection = mongoose.connection.db.collection(name);
    const documents = await collection.find().toArray();
    const duplicates = {};
    for (const field of name === 'students' ? ['id', 'code', 'email'] : ['id']) {
      duplicates[field] = await collection.aggregate([
        { $group: { _id: `$${field}`, count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } },
      ]).toArray();
    }
    const differences = [];
    for (const row of rows) {
      const document = documents.find(item => item.id === row.id);
      if (!document) differences.push({ id: row.id, issue: 'Missing document' });
      else for (const [field, value] of Object.entries(row)) {
        if (JSON.stringify(document[field]) !== JSON.stringify(value)) differences.push({ id: row.id, field, source: value, database: document[field] });
      }
    }
    collections.push({ collection: name, jsonCount: rows.length, mongoCount: documents.length,
      countDifference: documents.length - rows.length, extraIds: documents.filter(doc => !rows.some(row => row.id === doc.id)).map(doc => doc.id),
      invalidIds: documents.filter(doc => !Number.isSafeInteger(doc.id) || doc.id < 1).map(doc => String(doc._id)),
      idTypes: await collection.aggregate([{ $group: { _id: { $type: '$id' }, count: { $sum: 1 } } }]).toArray(), duplicates, differences });
  }
  const report = { generatedAt: new Date().toISOString(), collections, transformations };
  await fs.mkdir(path.join(__dirname, '../reports'), { recursive: true });
  await fs.writeFile(path.join(__dirname, '../reports/migration-report.json'), JSON.stringify(report, null, 2));
  console.table(collections.map(({ collection, jsonCount, mongoCount, countDifference }) => ({ collection, jsonCount, mongoCount, countDifference })));
  return report;
}
if (require.main === module) connectDB().then(migrationReport).catch(error => { console.error(error); process.exitCode = 1; }).finally(() => mongoose.disconnect());
module.exports = { migrationReport };
