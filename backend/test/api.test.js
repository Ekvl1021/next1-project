const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
process.env.JWT_SECRET = 'lab8-integration-secret-at-least-32-characters';
process.env.CORS_ORIGINS = 'http://localhost:3001';
const dbName = `lab8_api_test_${process.pid}_${Date.now()}`;
const mongoUrl = new URL(process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017');
mongoUrl.pathname = `/${dbName}`;
const uri = mongoUrl.toString();
const store = require('../store');
const data = { 'users.json': [{ id: 1, username: 'admin', role: 'admin', passwordHash: bcrypt.hashSync('Admin123!', 4) }], 'courses.json': [], 'departments.json': [], 'rooms.json': [] };
store.read = async (name) => structuredClone(data[name] || []);
store.write = async (name, rows) => { data[name] = structuredClone(rows); };
const app = require('../server');
const Student = require('../models/Student');
const Counter = require('../models/Counter');
const { cleanStudentIds } = require('../scripts/clean-student-ids');

test('Lab 8: real MongoDB CRUD, validation, roles and middleware', async (t) => {
  await require('../config/db')(uri);
  t.after(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });
  await Student.init();
  await Counter.init();
  const User = require('../models/User');
  await User.init();
  await User.create({ id: 1, username: 'admin', role: 'admin', passwordHash: bcrypt.hashSync('Admin123!', 4) });
  await User.create({ id: 2, username: 'teacher', role: 'teacher', passwordHash: bcrypt.hashSync('Teacher123!', 4) });
  await User.create({ id: 3, username: 'student', role: 'student', passwordHash: bcrypt.hashSync('Student123!', 4) });
  await Counter.create({ _id: 'students', value: 0 });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const tokens = Object.fromEntries(['admin', 'teacher', 'student'].map(role => [role, jwt.sign({ sub: ({ admin: '1', teacher: '2', student: '3' })[role], username: role, role }, process.env.JWT_SECRET, { expiresIn: '5m' })]));
  const request = (url, method = 'GET', role = 'admin', body, headers = {}) => fetch(base + url, {
    method, headers: { ...(role ? { Authorization: `Bearer ${tokens[role] || role}` } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const fixture = { code: 'ST2026099', firstName: 'Номин', lastName: 'Бат', email: 'Nomin99@Example.com' };
  await t.test('Course, Teacher and Department schemas persist and validate real documents', async () => {
    const resources = [
      [require('../models/Course'), { id: 1, title: 'Веб', teacher: 'teacher1', schedule: 'Баасан', room: 'A-205' }],
      [require('../models/Teacher'), { id: 1, username: 'teacher1', role: 'teacher' }],
      [require('../models/Department'), { id: 1, name: 'Мэдээллийн технологи' }],
      [require('../models/Room'), { id: 1, name: 'A-205' }],
    ];
    for (const [Model, value] of resources) {
      await Model.init();
      const document = await Model.create(value);
      assert.ok(document._id instanceof mongoose.Types.ObjectId);
      assert.equal((await Model.findOne({ id: 1 })).id, 1);
      await assert.rejects(Model.create({ ...value, id: 1.5 }), { name: 'ValidationError' });
      await assert.rejects(Model.create(value), error => error.code === 11000);
    }
  });
  await t.test('login, missing/invalid/expired JWT and role protection', async () => {
    assert.equal((await request('/api/auth/login', 'POST', null, { username: 'admin', password: 'Admin123!' })).status, 200);
    assert.equal((await request('/api/students', 'GET', null)).status, 401);
    assert.equal((await request('/api/students', 'GET', 'invalid')).status, 401);
    const expired = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: -1 });
    assert.equal((await request('/api/students', 'GET', expired)).status, 401);
    for (const [url, method, body] of [['/api/students', 'GET'], ['/api/students/1', 'GET'], ['/api/students', 'POST', fixture], ['/api/students/1', 'PUT', fixture], ['/api/students/1', 'DELETE']]) {
      assert.equal((await request(url, method, 'student', body)).status, 403);
    }
    assert.equal((await request('/api/students', 'POST', 'teacher', fixture)).status, 403);
    assert.equal((await request('/api/students/1', 'DELETE', 'teacher')).status, 403);
  });
  let id;
  await t.test('create, read and persist; numeric id and separate ObjectId', async () => {
    const response = await request('/api/students', 'POST', 'admin', fixture);
    assert.equal(response.status, 201);
    const { data: created } = await response.json();
    id = created.id;
    assert.equal(id, 1);
    assert.match(created._id, /^[a-f\d]{24}$/);
    assert.equal(created.email, 'nomin99@example.com');
    await mongoose.disconnect();
    await mongoose.connect(uri);
    assert.equal((await Student.findOne({ id })).firstName, fixture.firstName);
    const fetched = await request(`/api/students/${id}`, 'GET', 'teacher');
    assert.equal(fetched.status, 200);
    assert.equal((await fetched.json()).data.id, id);
    assert.equal((await request(`/students/${id}`)).status, 200);
  });
  await t.test('bad IDs, nonexistent records, body validation, duplicate code/email', async () => {
    for (const bad of ['abc', '0', '-1', '1.5', '1e2', '9007199254740992']) assert.equal((await request(`/api/students/${bad}`)).status, 400);
    assert.equal((await request('/api/students/999999')).status, 404);
    for (const body of [{}, [], { ...fixture, id: 8 }, { ...fixture, _id: 'abc' }, { ...fixture, firstName: ' ' }, { ...fixture, email: 'bad' }]) {
      assert.equal((await request('/api/students', 'POST', 'admin', body)).status, 400);
    }
    assert.equal((await request('/api/students', 'POST', 'admin', { ...fixture, email: 'other@example.com' })).status, 409);
    assert.equal((await request('/api/students', 'POST', 'admin', { ...fixture, code: 'OTHER' })).status, 409);
  });
  await t.test('atomic IDs under concurrent creates, search and pagination', async () => {
    const responses = await Promise.all(Array.from({ length: 6 }, (_, index) => request('/api/students', 'POST', 'admin', { ...fixture, code: `CONCURRENT${index}`, email: `concurrent${index}@example.com` })));
    assert.ok(responses.every(response => response.status === 201));
    const students = await Promise.all(responses.map(async response => (await response.json()).data));
    assert.equal(new Set(students.map(student => student.id)).size, 6);
    const list = await (await request('/api/students?search=' + encodeURIComponent('номин') + '&page=2&limit=2')).json();
    assert.equal(list.data.length, 2);
    assert.equal(list.pagination.total, 7);
    const firstPage = await (await request('/api/students?page=1&limit=5')).json();
    const secondPage = await (await request('/api/students?page=2&limit=5')).json();
    assert.equal(firstPage.data.length, 5);
    assert.equal(secondPage.data.length, 2);
    assert.equal(firstPage.pagination.pages, 2);
    assert.equal(new Set([...firstPage.data, ...secondPage.data].map(student => student.id)).size, 7);
    const bySurname = await (await request('/api/students?search=' + encodeURIComponent('бат'))).json();
    assert.equal(bySurname.pagination.total, 7);
    const byCode = await (await request('/api/students?search=concurrent0')).json();
    assert.equal(byCode.pagination.total, 1);
    assert.equal(byCode.data[0].code, 'CONCURRENT0');

    assert.ok(list.data[0].id < list.data[1].id);
    assert.equal((await (await request('/api/students?search=%2E%2A')).json()).pagination.total, 0);
    for (const query of ['page=0', 'limit=101', 'page=abc', 'page=1.5', 'limit=-1', 'search[x]=bad']) assert.equal((await request('/api/students?' + query)).status, 400);
  });
  await t.test('update validation, duplicate conflict and deletion persisted', async () => {
    const update = { ...fixture, firstName: 'Болор', email: 'updated@example.com' };
    assert.equal((await request(`/api/students/${id}`, 'PUT', 'teacher', { ...update, email: 'invalid' })).status, 400);
    const response = await request(`/api/students/${id}`, 'PUT', 'teacher', update);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).data.firstName, 'Болор');
    const byFirstName = await (await request('/api/students?search=' + encodeURIComponent('болор'))).json();
    assert.equal(byFirstName.pagination.total, 1);
    assert.equal(byFirstName.data[0].id, id);

    assert.equal((await request(`/api/students/${id}`, 'PUT', 'teacher', { ...update, code: 'CONCURRENT0' })).status, 409);
    assert.equal((await request('/api/students/999999', 'PUT', 'teacher', update)).status, 404);
    const patched = await request(`/api/students/${id}`, 'PATCH', 'teacher', { program: 'Computer Science' });
    assert.equal(patched.status, 200);
    assert.equal((await patched.json()).data.program, 'Computer Science');
    assert.equal((await request(`/api/students/${id}`, 'PATCH', 'teacher', {})).status, 400);
    assert.equal((await request(`/api/students/${id}`, 'DELETE')).status, 200);
    assert.equal(await Student.findOne({ id }), null);
    assert.equal((await request(`/api/students/${id}`, 'DELETE')).status, 404);
  });
  await t.test('CSV string IDs cleaned, collisions rejected before mutation', async () => {
    await Student.collection.insertOne({ id: '500', code: 'CSV500', firstName: 'CSV', lastName: 'Test', email: 'csv500@example.com' });
    assert.equal((await cleanStudentIds()).converted, 1);
    assert.ok(await Student.collection.findOne({ id: 500 }));
    await Student.collection.insertOne({ id: '0500', code: 'CSV501', firstName: 'CSV', lastName: 'Test', email: 'csv501@example.com' });
    await assert.rejects(cleanStudentIds(), /colliding/);
    await Student.collection.deleteOne({ id: '0500' });
    const next = await request('/api/students', 'POST', 'admin', { ...fixture, code: 'AFTERIMPORT', email: 'afterimport@example.com' });
    assert.equal(next.status, 201);
    assert.equal((await next.json()).data.id, 501);
  });
  await t.test('CORS, central errors, Swagger and preserved course authorization', async () => {
    const cors = await request('/api/students', 'OPTIONS', null, undefined, { Origin: 'http://localhost:3001', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'Content-Type,Authorization' });
    assert.equal(cors.status, 204);
    assert.equal(cors.headers.get('access-control-allow-origin'), 'http://localhost:3001');
    const denied = await request('/api/students', 'GET', 'admin', undefined, { Origin: 'https://denied.example' });
    assert.equal(denied.headers.get('access-control-allow-origin'), null);
    assert.equal((await request('/missing')).status, 404);
    const failure = await request('/api/demo-error');
    assert.equal(failure.status, 500);
    assert.deepEqual(await failure.json(), { message: 'Internal server error' });
    const malformed = await fetch(base + '/api/students', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
    assert.equal(malformed.status, 400);
    assert.equal((await request('/api-docs/')).status, 200);
    assert.equal((await request('/api-docs/swagger-ui-init.js')).status, 200);
    const spec = await (await request('/api-docs/openapi.json')).json();
    assert.ok(spec.paths['/api/students/{id}'].put);
    assert.ok(spec.paths['/api/students/{id}'].patch);
    assert.ok(spec.paths['/api/courses/{id}'].patch);
    assert.ok(spec.paths['/api/planner'].put);
    assert.ok(spec.paths['/api/attendance'].put);
    for (const tag of ['Students', 'Courses', 'Departments', 'Rooms', 'Teachers']) {
      assert.ok(spec.tags.some(item => item.name === tag), `Missing Swagger group: ${tag}`);
    }
    for (const path of ['/api/students', '/api/courses', '/api/departments', '/api/rooms', '/api/teachers']) {
      assert.ok(spec.paths[path], `Missing Swagger path: ${path}`);
    }
    const courseResponse = await request('/api/courses', 'POST', 'admin', {
      title: 'Test course', teacher: 'teacher1', schedule: 'Monday 10:00', room: 'TEST-COURSE-ROOM',
    });
    assert.equal(courseResponse.status, 201);
    const course = await courseResponse.json();
    assert.equal(course.title, "Test course");
    assert.ok(!course._doc);
    assert.equal((await request(`/api/courses/${course.id}`)).status, 200);
    assert.equal((await request(`/api/courses/${course.id}`, 'PUT', 'admin', { title: 'Updated course' })).status, 200);
    assert.equal((await request(`/api/courses/${course.id}`, 'PATCH', 'admin', { room: 'UPDATED-ROOM' })).status, 200);
    assert.equal((await request(`/api/courses/${course.id}`, 'DELETE')).status, 204);

    const departmentResponse = await request('/api/departments', 'POST', 'admin', { name: 'Test Department' });
    assert.equal(departmentResponse.status, 201);
    const department = await departmentResponse.json();
    assert.equal((await request(`/api/departments/${department.id}`)).status, 200);
    assert.equal((await request(`/api/departments/${department.id}`, 'PUT', 'admin', { name: 'Updated Department' })).status, 200);
    assert.equal((await request(`/api/departments/${department.id}`, 'PATCH', 'admin', { name: 'Patched Department' })).status, 200);
    assert.equal((await request(`/api/departments/${department.id}`, 'DELETE')).status, 204);
    assert.equal((await request(`/api/departments/${department.id}`)).status, 404);

    const roomResponse = await request('/api/rooms', 'POST', 'admin', { name: 'TEST-ROOM' });
    assert.equal(roomResponse.status, 201);
    const room = await roomResponse.json();
    assert.equal((await request(`/api/rooms/${room.id}`)).status, 200);
    assert.equal((await request(`/api/rooms/${room.id}`, 'PUT', 'admin', { name: 'TEST-ROOM-2' })).status, 200);
    assert.equal((await request(`/api/rooms/${room.id}`, 'PATCH', 'admin', { name: 'TEST-ROOM-3' })).status, 200);
    assert.equal((await request(`/api/rooms/${room.id}`, 'DELETE')).status, 204);
    assert.equal((await request(`/api/rooms/${room.id}`)).status, 404);

    const username = `teacher-${process.pid}`;
    const teacherResponse = await request('/api/teachers', 'POST', 'admin', { username, password: 'Teacher123!' });
    assert.equal(teacherResponse.status, 201);
    const teacher = await teacherResponse.json();
    assert.equal((await request(`/api/teachers/${teacher.id}`)).status, 200);
    assert.equal((await request(`/api/teachers/${teacher.id}`, 'PUT', 'admin', { username: `${username}-updated` })).status, 200);
    assert.equal((await request(`/api/teachers/${teacher.id}`, 'PATCH', 'admin', { password: 'Teacher456!' })).status, 200);
    assert.equal((await request(`/api/teachers/${teacher.id}`, 'DELETE')).status, 204);
    assert.equal((await request(`/api/teachers/${teacher.id}`)).status, 404);
    assert.equal((await request('/api/courses', 'GET', 'student')).status, 200);
    assert.equal((await request('/api/courses/1', 'DELETE', 'student')).status, 403);
  });
  await t.test('planner grades are private, persisted, and calculated from percentages', async () => {
    const Planner = require('../models/Planner');
    await Planner.init();
    assert.deepEqual(await (await request('/api/planner', 'GET', 'admin')).json(), { schedule: [], tasks: [], grades: [] });
    const saved = await request('/api/planner', 'PUT', 'admin', {
      schedule: [],
      tasks: [],
      grades: [{ id: 'grade-1', title: 'Веб систем', credits: 3, score: 92, term: '2026 Fall' }],
    });
    assert.equal(saved.status, 200);
    const result = await saved.json();
    assert.deepEqual(
      { score: result.grades[0].score, letter: result.grades[0].letter, point: result.grades[0].point },
      { score: 92, letter: 'A', point: 3.7 }
    );
    assert.equal(await Planner.countDocuments({ userId: '1' }), 1);
    assert.deepEqual(await (await request('/api/planner', 'GET', 'student')).json(), { schedule: [], tasks: [], grades: [] });
    assert.equal((await request('/api/planner', 'PUT', 'admin', {
      schedule: [], tasks: [], grades: [{ id: 'bad', title: 'Invalid', credits: 3, score: 101, term: '2026 Fall' }],
    })).status, 400);
    const bands = [
      [95, 'A+', 4], [90, 'A', 3.7], [85, 'B+', 3.3], [80, 'B', 3],
      [75, 'C+', 2.7], [70, 'C', 2.3], [65, 'D+', 2], [60, 'D', 1.7], [59, 'F', 0],
    ];
    for (const [score, letter, point] of bands) {
      const response = await request('/api/planner', 'PUT', 'teacher', {
        schedule: [], tasks: [], grades: [{ id: `grade-${score}`, title: 'Үнэлгээ', credits: 1, score, term: '2026 Fall' }],
      });
      assert.equal(response.status, 200);
      const grade = (await response.json()).grades[0];
      assert.equal(grade.letter, letter);
      assert.equal(grade.point, point);
    }
  });
  await t.test('course selection requests require admin approval before appearing in teacher schedule', async () => {
    const Course = require('../models/Course');
    const CourseSelection = require('../models/CourseSelection');
    await Course.init();
    await CourseSelection.init();
    await Course.create({ id: 2, title: 'Сонголтын хичээл', teacher: 'teacher', schedule: 'Даваа 10:00', room: 'A-205' });

    const submitted = await request('/api/course-selections', 'POST', 'student', { courseId: '2' });
    assert.equal(submitted.status, 201);
    assert.equal((await submitted.json()).status, 'pending');
    assert.equal((await request('/api/course-selections', 'GET', 'teacher')).status, 200);
    assert.deepEqual(await (await request('/api/course-selections', 'GET', 'teacher')).json(), []);

    const pending = await request('/api/course-selections', 'GET', 'admin');
    assert.equal((await pending.json()).some(row => row.courseId === '2' && row.status === 'pending'), true);
    assert.equal((await request('/api/course-selections/3/2', 'PATCH', 'teacher', { status: 'approved' })).status, 403);
    assert.equal((await request('/api/course-selections/3/2', 'PATCH', 'admin', { status: 'invalid' })).status, 400);
    assert.equal((await request('/api/course-selections/3/2', 'PATCH', 'admin', { status: 'approved' })).status, 200);

    const teacherSchedule = await request('/api/course-selections', 'GET', 'teacher');
    const assigned = await teacherSchedule.json();
    assert.equal(assigned.length, 1);
    assert.equal(assigned[0].course.title, 'Сонголтын хичээл');
    assert.equal(assigned[0].studentCode, 'student');
    assert.equal((await request('/api/course-selections', 'POST', 'student', { courseId: '2' })).status, 201);
    assert.equal((await (await request('/api/course-selections', 'GET', 'student')).json())[0].status, 'approved');
    await User.updateOne({ id: 3 }, { $set: { courseIds: ['1'] } });
    const migrated = await request('/api/course-selections', 'GET', 'admin');
    assert.equal((await migrated.json()).some(row => row.courseId === '1' && row.status === 'pending'), true);
  });
  await t.test('attendance writes are role-scoped and students only read their own records', async () => {
    const Attendance = require('../models/Attendance');
    const Course = require('../models/Course');
    await Attendance.init();
    await Course.init();
    await Student.create({ id: 5001, code: 'student', firstName: 'Номин', lastName: 'Бат', email: 'attendance.student@example.com' });
    await Student.create({ id: 5002, code: 'STOTHER', firstName: 'Тэмүүлэн', lastName: 'Эрдэнэ', email: 'attendance.other@example.com' });
    await Course.create({ id: 50, title: 'Attendance test', teacher: 'teacher', schedule: 'Monday 10:00', room: 'A-50' });
    await Course.create({ id: 51, title: 'Unassigned test', teacher: 'other-teacher', schedule: 'Tuesday 10:00', room: 'A-51' });
    const CourseSelection = require('../models/CourseSelection');
    await CourseSelection.create({ studentId: '3', courseId: '50', status: 'approved' });
    await User.create({id:4,username:'STOTHER',role:'student',passwordHash:bcrypt.hashSync('Student123!',4)});
    await CourseSelection.create({studentId:'4',courseId:'50',status:'approved'});
    const studentList = await (await request('/api/students?limit=100', 'GET', 'teacher')).json();
    assert.ok(studentList.data.find(row => row.code === 'student').selectedCourses.some(course =>
      course.id === '50' && course.title === 'Attendance test' && course.status === 'approved'
    ));

    const payload = {
      courseId: '50',
      date: '2026-11-25',
      entries: [{ studentCode: 'student', status: 'present' }, { studentCode: 'STOTHER', status: 'absent' }],
    };
    assert.equal((await request('/api/attendance', 'PUT', 'teacher', payload)).status, 200);
    assert.equal((await request('/api/attendance', 'PUT', 'teacher', { ...payload, courseId: '51' })).status, 403);
    assert.equal((await request('/api/attendance', 'PUT', 'student', payload)).status, 403);
    const studentRecords = await (await request('/api/attendance', 'GET', 'student')).json();
    assert.equal(studentRecords.data.length, 1);
    assert.equal(studentRecords.data[0].studentCode, 'student');
    assert.equal(studentRecords.data[0].status, 'present');
    const teacherRecords = await (await request('/api/attendance?courseId=50&date=2026-11-25', 'GET', 'teacher')).json();
    assert.equal(teacherRecords.data.length, 2);
    assert.equal((await request('/api/attendance?courseId=51', 'GET', 'teacher')).status, 403);
    assert.equal((await request('/api/attendance', 'PUT', 'teacher', {
      ...payload, entries: [{ studentCode: 'student', status: 'late' }],
    })).status, 200);
    assert.equal(await Attendance.countDocuments({ courseId: '50', studentCode: 'student', date: '2026-11-25' }), 1);
    assert.equal((await (await request('/api/attendance', 'GET', 'student')).json()).data[0].status, 'late');
    assert.equal((await request('/api/attendance', 'PUT', 'teacher', {
      ...payload, entries: [{ studentCode: 'student', status: null }],
    })).status, 200);
    assert.equal(await Attendance.countDocuments({ courseId: '50', studentCode: 'student', date: '2026-11-25' }), 0);
    assert.equal((await request('/api/attendance', 'PUT', 'teacher', {
      ...payload, date: '2026-11-25', entries: [{ studentCode: 'missing', status: 'present' }],
    })).status, 400);
  });
  await t.test('admin saves and reloads lectures across all five class periods', async () => {
    const periods = require('../services/schedule').periods;
    const sessions = periods.map(p=>({day:5,start:p.start,end:p.end,room:'PERIODS-ROOM',kind:p.number===1?'Лекц':'Лаборатори'}));
    const response = await request('/api/courses','POST','admin',{title:'Five period course',teacher:'period-teacher',schedule:'Бямба 1–5-р пар',room:'PERIODS-ROOM',sessions});
    assert.equal(response.status,201);
    const created = await response.json();
    assert.equal(created.sessions.length,5);
    const update = await request(`/api/courses/${created.id}`,'PATCH','admin',{sessions:sessions.map(s=>({...s,day:6}))});
    assert.equal(update.status,200);
    assert.match((await update.json()).schedule,/5-р пар/);
    const loaded = await (await request(`/api/courses/${created.id}`)).json();
    assert.deepEqual(loaded.sessions.map(s=>[s.day,s.start,s.end]),periods.map(p=>[6,p.start,p.end]));
    let schedule = await (await request('/api/academic/schedule','GET','admin')).json();
    assert.ok(!schedule.some(c=>c.id===created.id), 'Unselected catalog courses must not enter the schedule');
    await request('/api/course-selections','POST','student',{courseId:created.id});
    schedule = await (await request('/api/academic/schedule','GET','admin')).json();
    assert.equal(schedule.find(c=>c.id===created.id).pendingCount,1);
    assert.equal(schedule.find(c=>c.id===created.id).approvedCount,0);
    assert.ok(!(await (await request('/api/academic/schedule','GET','student')).json()).some(c=>c.id===created.id));
    assert.equal((await request(`/api/course-selections/3/${created.id}`,'PATCH','admin',{status:'approved'})).status,200);
    schedule = await (await request('/api/academic/schedule','GET','admin')).json();
    assert.equal(schedule.find(c=>c.id===created.id).sessions.length,5);
    assert.equal(schedule.find(c=>c.id===created.id).approvedCount,1);
    assert.equal((await request(`/api/courses/${created.id}`,'PATCH','admin',{sessions:[sessions[0],sessions[0]]})).status,400);
    assert.equal((await request(`/api/courses/${created.id}`,'DELETE')).status,204);
  });
  await t.test('academic approval, separate days, grade persistence and role boundaries', async () => {
    const Course=require('../models/Course'), Selection=require('../models/CourseSelection');
    const Grade=require('../models/Grade'); await Grade.init();
    const slot=(day,room)=>[{day,start:'08:00',end:'09:30',room,kind:'Лекц'}];
    await Course.create({id:70,title:'Monday academic',teacher:'teacher',schedule:'Даваа 08:00',room:'Z-70',sessions:slot(0,'Z-70')});
    await Course.create({id:71,title:'Tuesday academic',teacher:'teacher',schedule:'Мягмар 08:00',room:'Z-71',sessions:slot(1,'Z-71')});
    await Course.create({id:72,title:'Conflicting academic',teacher:'other-teacher',schedule:'Мягмар 08:00',room:'Z-72',sessions:slot(1,'Z-72')});
    for(const courseId of ['70','71','72']) assert.equal((await request('/api/course-selections','POST','student',{courseId})).status,201);
    assert.equal((await request('/api/academic/schedule','GET','student')).status,200);
    let schedule=await (await request('/api/academic/schedule','GET','student')).json();
    assert.ok(!schedule.some(c=>c.id==='70'));
    assert.equal((await request('/api/course-selections/3/70','PATCH','teacher',{status:'approved'})).status,403);
    assert.equal((await request('/api/course-selections/3/70','PATCH','admin',{status:'approved'})).status,200);
    assert.equal((await request('/api/course-selections/3/71','PATCH','admin',{status:'approved'})).status,200);
    assert.equal((await request('/api/course-selections/3/71','PATCH','admin',{status:'approved'})).status,409);
    assert.equal((await request('/api/course-selections/3/72','PATCH','admin',{status:'approved'})).status,409);
    assert.equal((await request('/api/course-selections/70','DELETE','student')).status,409);
    schedule=await (await request('/api/academic/schedule','GET','student')).json();
    assert.equal(schedule.find(c=>c.id==='70').sessions[0].day,0);
    assert.equal(schedule.find(c=>c.id==='71').sessions[0].day,1);
    assert.ok(!schedule.some(c=>c.id==='72'));
    // Same time on a third day is valid; same day conflicts with teacher's other class.
    assert.equal((await request('/api/courses/71','PATCH','admin',{sessions:slot(2,'Z-71')})).status,200);
    assert.equal((await request('/api/courses/71','PATCH','admin',{sessions:slot(0,'Z-71')})).status,409);
    assert.equal((await request('/api/courses/71','PATCH','teacher',{sessions:slot(4,'Z-71')})).status,403);
    const roster=await (await request('/api/academic/roster/70','GET','teacher')).json();
    assert.ok(roster.some(s=>s.code==='student'));
    const body={courseId:'70',term:'2026 Намар',entries:[{studentCode:'student',score:91}]};
    assert.equal((await request('/api/academic/grades','PUT','teacher',body)).status,200);
    assert.equal((await request('/api/academic/grades','PUT','student',body)).status,403);
    assert.equal((await request('/api/academic/grades','PUT','admin',body)).status,403);
    assert.equal((await request('/api/academic/grades','PUT','teacher',{...body,courseId:'72'})).status,403);
    assert.equal((await request('/api/academic/grades','PUT','teacher',{...body,entries:[{studentCode:'STOTHER',score:88}]})).status,400);
    await mongoose.disconnect(); await mongoose.connect(uri);
    const grades=await (await request('/api/academic/grades','GET','student')).json();
    assert.equal(grades.find(g=>g.courseId==='70').score,91);
    // Updating a task from a different view must not erase the student's GPA inputs.
    assert.equal((await request('/api/planner','PATCH','student',{grades:[{id:'persisted',title:'Personal GPA',credits:3,score:88,term:'2026 Намар'}]})).status,200);
    assert.equal((await request('/api/planner','PATCH','student',{tasks:[]})).status,200);
    await mongoose.disconnect(); await mongoose.connect(uri);
    const planner=await (await request('/api/planner','GET','student')).json();
    assert.equal(planner.grades[0].score,88);
    assert.equal(planner.grades[0].letter,'B+');
    assert.equal((await request('/api/planner','PUT','student',{schedule:[{id:'bypass',title:'Own schedule',day:0,start:'08:00',end:'09:00',room:'A'}],tasks:[],grades:[]})).status,403);
    assert.equal((await request('/api/attendance','PUT','admin',{courseId:'70',date:'2026-11-26',entries:[{studentCode:'student',status:'present'}]})).status,403);
    assert.equal((await request('/api/courses','POST','teacher',{title:'Blocked',teacher:'teacher',schedule:'Monday 10:00',room:'TEST'})).status,403);
    const teacherCourses=await (await request('/api/courses','GET','teacher')).json();
    assert.ok(teacherCourses.every(c=>c.teacher==='teacher'));
    const teacherStudents=await (await request('/api/academic/students','GET','teacher')).json();
    assert.ok(teacherStudents.every(s=>s.selectedCourses.every(c=>c.status==='approved')));
    for(const id of [73,74]) {
      await Course.create({id,title:`Parallel ${id}`,teacher:`parallel-${id}`,schedule:'Баасан 08:00',room:`Z-${id}`,sessions:slot(4,`Z-${id}`)});
      await request('/api/course-selections','POST','student',{courseId:String(id)});
    }
    const decisions=await Promise.all([73,74].map(id=>request(`/api/course-selections/3/${id}`,'PATCH','admin',{status:'approved'})));
    assert.deepEqual(decisions.map(r=>r.status).sort(),[200,409]);
    const preflight=await request('/api/courses/71','OPTIONS',null,undefined,{Origin:'http://localhost:3001','Access-Control-Request-Method':'PATCH'});
    assert.ok(preflight.headers.get('access-control-allow-methods').includes('PATCH'));
  });

});
