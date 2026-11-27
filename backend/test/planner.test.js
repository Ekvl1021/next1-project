const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
process.env.JWT_SECRET = 'planner-integration-test-secret-at-least-32';
let saved = [];
const store = require('../store');
store.read = async () => structuredClone(saved);
store.write = async (_name, value) => { saved = structuredClone(value); };
const app = express();
app.use(express.json());
app.use('/api/planner', require('../routes/plannerRoutes'));
app.use(require('../middlewares/errorHandler').errorHandler);
test('Planner validates records and isolates per-user persisted data', async t => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api/planner`;
  const token = id => jwt.sign({ sub: id, username: id, role: 'student' }, process.env.JWT_SECRET);
  const call = (id, method = 'GET', body) => fetch(base, { method, headers: { ...(id ? { Authorization: `Bearer ${token(id)}` } : {}), 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = {
    schedule: [{ id: 'class1', title: 'Веб систем', day: 0, start: '09:00', end: '10:30', room: 'A-205' }],
    tasks: [{ id: 'task1', title: 'Тайлан бичих', due: '2026-11-22', priority: 'high', kind: 'assignment', done: false }],
    grades: [{ id: 'grade1', title: 'Веб систем', credits: 3, point: 4, term: '2026 Намар' }],
  };
  assert.equal((await call(null)).status, 401);
  assert.deepEqual(await (await call('alice')).json(), { schedule: [], tasks: [], grades: [] });
  assert.equal((await call('alice', 'PUT', data)).status, 200);
  assert.deepEqual(await (await call('alice')).json(), data);
  assert.deepEqual(await (await call('bob')).json(), { schedule: [], tasks: [], grades: [] });
  for (const body of [
    { ...data, userId: 'bob' },
    { ...data, schedule: [{ ...data.schedule[0], end: '08:00' }] },
    { ...data, schedule: [{ ...data.schedule[0], day: 7 }] },
    { ...data, tasks: [{ ...data.tasks[0], due: '2026-02-30' }] },
    { ...data, tasks: [{ ...data.tasks[0], done: 'yes' }] },
    { ...data, grades: [{ ...data.grades[0], point: 4.1 }] },
    { ...data, grades: [{ ...data.grades[0], credits: 0 }] },
    { ...data, grades: [data.grades[0], data.grades[0]] },
  ]) assert.equal((await call('alice', 'PUT', body)).status, 400);
  assert.deepEqual(await (await call('alice')).json(), data);
  const update = { ...data, tasks: [{ ...data.tasks[0], done: true }] };
  assert.equal((await call('alice', 'PUT', update)).status, 200);
  assert.equal((await (await call('alice')).json()).tasks[0].done, true);
  const responses = await Promise.all(['bob', 'charlie', 'diana'].map(id => call(id, 'PUT', data)));
  assert.ok(responses.every(response => response.status === 200));
  assert.equal(saved.length, 4);
  assert.deepEqual(await (await call('bob')).json(), data);
  assert.equal((await call('alice', 'PUT', { schedule: [], tasks: [], grades: [] })).status, 200);
  assert.deepEqual(await (await call('bob')).json(), data);
});
