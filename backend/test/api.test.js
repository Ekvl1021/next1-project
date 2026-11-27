const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
process.env.JWT_SECRET = 'lab-test-secret-with-at-least-32-characters';
process.env.CORS_ORIGINS = 'http://localhost:3001,https://frontend.example';
// Replace persistence before loading the app: tests never touch real JSON data.
const rows = { 'courses.json': [], 'students.json': [], 'departments.json': [],
  'users.json': [{ id: 1, username: 'admin', role: 'admin', passwordHash: bcrypt.hashSync('Admin123!', 4) }] };
const store = require('../store');
store.read = async (name) => structuredClone(rows[name]);
store.write = async (name, value) => { rows[name] = structuredClone(value); };
const app = require('../server');
const YAML = require('yamljs');
const path = require('node:path');

test('Lab 7 API integration', async (t) => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const tokens = Object.fromEntries(['admin', 'teacher', 'student'].map(role =>
    [role, jwt.sign({ sub: '1', username: role, role }, process.env.JWT_SECRET, { expiresIn: '5m' })]));
  async function request(url, method = 'GET', role, body, headers = {}) {
    return fetch(base + url, { method, headers: {
      ...(role ? { Authorization: `Bearer ${tokens[role] || role}` } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers,
    }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  }
  const course = { title: 'Web', teacher: 'teacher1', schedule: 'Monday', room: '301' };
  for (const url of ['/auth/login', '/api/auth/login']) {
    const response = await request(url, 'POST', null, { username: 'admin', password: 'Admin123!' });
    assert.equal(response.status, 200);
    assert.equal(jwt.verify((await response.json()).token, process.env.JWT_SECRET).role, 'admin');
  }
  assert.equal((await request('/api/courses')).status, 401);
  assert.equal((await request('/api/courses', 'GET', 'invalid')).status, 401);
  const expired = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: -1 });
  assert.equal((await request('/api/courses', 'GET', expired)).status, 401);
  assert.equal((await request('/api/courses', 'POST', 'student', course)).status, 403);
  assert.equal((await request('/api/courses/1', 'DELETE', 'student')).status, 403);
  for (const body of [{}, [], { ...course, room: ' ' }]) {
    const response = await request('/api/courses', 'POST', 'teacher', body);
    assert.equal(response.status, 400);
    assert.ok((await response.json()).errors.length);
  }
  const created = await request('/api/courses', 'POST', 'teacher', course);
  assert.equal(created.status, 201);
  const { id } = await created.json();
  assert.equal((await request(`/api/courses/${id}`, 'GET', 'student')).status, 200);
  assert.equal((await (await request('/api/courses?search=web', 'GET', 'student')).json()).length, 1);
  assert.equal((await (await request('/courses?search=absent', 'GET', 'student')).json()).length, 0);
  for (const body of [{}, { title: 42 }, { room: null }]) {
    assert.equal((await request(`/api/courses/${id}`, 'PUT', 'teacher', body)).status, 400);
  }
  const updated = await request(`/api/courses/${id}`, 'PUT', 'teacher', { title: 'Updated' });
  assert.equal(updated.status, 200);
  assert.equal((await updated.json()).title, 'Updated');
  assert.equal((await request(`/api/courses/${id}`, 'DELETE', 'teacher')).status, 403);
  assert.equal((await request(`/api/courses/${id}`, 'DELETE', 'admin')).status, 204);
  assert.equal((await request(`/api/courses/${id}`, 'GET', 'admin')).status, 404);
  assert.equal((await request('/api/departments', 'POST', 'teacher', { name: 'IT' })).status, 403);
  assert.equal((await request('/api/departments', 'POST', 'admin', { name: 'IT' })).status, 201);
  assert.equal((await request('/api/students', 'POST', 'teacher', { name: 'A', email: 'a@example.com', program: 'IT' })).status, 201);
  const missing = await request('/missing');
  assert.equal(missing.status, 404);
  assert.match((await missing.json()).message, /Route not found/);
  const failure = await request('/api/demo-error');
  assert.equal(failure.status, 500);
  assert.deepEqual(await failure.json(), { message: 'Internal server error' });
  const malformed = await fetch(base + '/api/courses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
  assert.equal(malformed.status, 400);
  assert.deepEqual(await malformed.json(), { message: 'Invalid JSON body' });
  const preflight = await request('/api/courses', 'OPTIONS', null, undefined, {
    Origin: 'http://localhost:3001', 'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'Authorization,Content-Type',
  });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), 'http://localhost:3001');
  assert.match(preflight.headers.get('access-control-allow-headers'), /Authorization/);
  const denied = await request('/api/courses', 'GET', 'admin', undefined, { Origin: 'https://untrusted.example' });
  assert.equal(denied.headers.get('access-control-allow-origin'), null);
  assert.equal((await request('/api-docs/')).status, 200);
  assert.equal((await request('/api-docs/swagger-ui-init.js')).status, 200);
  const spec = await (await request('/api-docs/openapi.json')).json();
  assert.equal(spec.openapi, '3.0.3');
  assert.ok(spec.paths['/api/auth/login'].post);
  assert.ok(spec.paths['/api/courses/{id}'].delete.responses['204']);
  assert.deepEqual(spec, YAML.load(path.join(__dirname, '../swagger/openapi.yaml')));
});
