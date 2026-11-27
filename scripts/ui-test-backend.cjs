// Isolated UI test backend: all writes remain in memory.
const path = require('node:path');
const fs = require('node:fs');
const backend = path.resolve(__dirname, '../backend');
require(path.join(backend, 'node_modules/dotenv')).config({ path: path.join(backend, '.env') });
process.env.JWT_EXPIRES_IN = '1h';
process.env.CORS_ORIGINS = 'http://localhost:3001';
const store = require(path.join(backend, 'store'));
const rows = { 'planners.json': [] };
for (const name of ['users', 'courses', 'students', 'departments']) rows[name + '.json'] = JSON.parse(fs.readFileSync(path.join(backend, 'data', name + '.json'), 'utf8'));
store.read = async name => structuredClone(rows[name] || []);
store.write = async (name, value) => { rows[name] = structuredClone(value); };
require(path.join(backend, 'server')).listen(3100, '127.0.0.1', () => console.log('In-memory UI test backend on 3100'));
