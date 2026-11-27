require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
async function cleanStudentIds() {
  const collection = mongoose.connection.db.collection('students');
  const documents = await collection.find().toArray();
  const seen = new Set();
  const changes = [];
  // Preflight every ID and collision before applying any conversion.
  for (const document of documents) {
    const id = Number(document.id);
    if (!/^\d+$/.test(String(document.id)) || !Number.isSafeInteger(id) || id <= 0 || seen.has(id)) {
      throw new Error(`Invalid or colliding id ${document.id}; no conversion applied`);
    }
    seen.add(id);
    if (typeof document.id !== 'number') changes.push({ updateOne: { filter: { _id: document._id }, update: { $set: { id } } } });
  }
  if (changes.length) await collection.bulkWrite(changes);
  return { converted: changes.length, total: documents.length };
}
if (require.main === module) connectDB().then(cleanStudentIds).then(console.log).catch(error => { console.error(error); process.exitCode = 1; }).finally(() => mongoose.disconnect());
module.exports = { cleanStudentIds };
