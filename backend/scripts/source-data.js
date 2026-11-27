const fs = require('node:fs/promises');
const path = require('node:path');
const dataDir = path.join(__dirname, '../data');
async function loadSources() {
  const sources = {};
  for (const name of ['students', 'courses', 'departments', 'rooms']) {
    sources[name] = JSON.parse(await fs.readFile(path.join(dataDir, `${name}.json`), 'utf8'));
    if (!Array.isArray(sources[name])) throw new Error(`${name}.json must contain an array`);
  }
  try { sources.teachers = JSON.parse(await fs.readFile(path.join(dataDir, 'teachers.json'), 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const users = JSON.parse(await fs.readFile(path.join(dataDir, 'users.json'), 'utf8'));
    sources.teachers = users.filter(user => user.role === 'teacher').map(({ id, username, role }) => ({ id, username, role }));
  }
  const transformations = [];
  for (const [name, rows] of Object.entries(sources)) {
    for (const row of rows) {
      const original = row.id;
      if (!/^\d+$/.test(String(original)) || !Number.isSafeInteger(Number(original)) || Number(original) < 1) {
        throw new Error(`${name}: invalid positive integer id ${original}; fix the source explicitly`);
      }
      row.id = Number(original);
      if (typeof original !== 'number') transformations.push({ collection: name, id: row.id, change: 'string id → Number' });
      if (name === 'students') {
        // The lab 7 dataset used a single name. Preserve it in firstName; never guess a surname.
        if (!row.firstName && row.name) {
          row.firstName = row.name; row.lastName ||= '—'; row.code ||= `LEGACY${row.id}`;
          transformations.push({ collection: name, id: row.id, change: 'legacy name → firstName; missing lastName → —; missing code → LEGACY{id}' });
          delete row.name;
        }
        if (typeof row.email === 'string') row.email = row.email.trim().toLowerCase();
      }
    }
    for (const field of name === 'students' ? ['id', 'code', 'email'] : ['id']) {
      const seen = new Set();
      for (const row of rows) {
        if (seen.has(row[field])) throw new Error(`${name}: duplicate ${field}: ${row[field]}`);
        seen.add(row[field]);
      }
    }
  }
  return { sources, transformations };
}
module.exports = { loadSources };
