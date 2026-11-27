import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../../.lab-tools/package.json', import.meta.url));
const puppeteer = require('puppeteer');
const out = path.resolve(process.env.UI_TEST_ARTIFACTS || 'reports/ui-redesign');
await fs.mkdir(out, { recursive: true });
const browser = await puppeteer.launch({ headless: 'shell' });
const errors = [], checks = [];
async function setup(context = browser) {
  const page = await context.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  await page.setRequestInterception(true);
  page.on('request', request => {
    if (request.url().startsWith('http://localhost:3000/')) request.continue({ url: request.url().replace('http://localhost:3000', 'http://127.0.0.1:3100') });
    else request.continue();
  });
  page.on('pageerror', error => errors.push(error.message));
  return page;
}
async function click(page, label, scope = '') {
  await page.waitForFunction(({ label, scope }) => [...document.querySelectorAll(`${scope} button`)].some(button => button.getClientRects().length && button.textContent.trim() === label), {}, { label, scope });
  const handle = await page.evaluateHandle(({ label, scope }) => [...document.querySelectorAll(`${scope} button`)].find(button => button.getClientRects().length && button.textContent.trim() === label), { label, scope });
  await handle.asElement().click();
}
async function field(page, name, value) {
  await page.waitForSelector(`dialog[open] [name="${name}"]`, { visible: true });
  await page.$eval(`dialog[open] [name="${name}"]`, (element, value) => { element.value = value; element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true })); }, String(value));
}
async function submit(page) { await click(page, 'Хадгалах', 'dialog[open]'); await page.waitForFunction(() => !document.querySelector('dialog[open]')); }
async function login(page, username, password) {
  await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle0' });
  await page.type('input[autocomplete=username]', username);
  await page.type('input[autocomplete=current-password]', password);
  await click(page, 'Нэвтрэх');
  await page.waitForFunction(() => location.pathname === '/courses');
  await page.waitForSelector('.sg-course-table');
}
async function navigate(page, route) {
  await page.goto('http://localhost:3001' + route, { waitUntil: 'networkidle0' });
  await page.waitForSelector('.sg-page-heading h1');
}
try {
  const page = await setup();
  await page.goto('http://localhost:3001/', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: out + '/home-desktop.png', fullPage: true });
  await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: out + '/login-desktop.png', fullPage: true });
  await login(page, 'admin', 'Admin123!');
  assert.ok(!(await page.$eval('body', body => body.textContent)).includes('ХЭРЭГТЭЙ ХОЛБООСУУД'));
  await page.screenshot({ path: out + '/courses-desktop.png', fullPage: true });
  await page.type('input[aria-label="Хичээл хайх"]', 'does-not-exist');
  await page.waitForSelector('.sg-empty');
  await click(page, 'Шүүлтүүр цэвэрлэх');
  await page.waitForSelector('.sg-course-table');
  await click(page, 'Хичээл нэмэх');
  for (const [name, value] of Object.entries({ title: 'UI TEST COURSE', teacher: 'Test Teacher', schedule: 'Даваа 14:00', room: 'TEST-1' })) await field(page, name, value);
  await submit(page);
  await page.waitForFunction(() => document.querySelector('.sg-course-table').textContent.includes('UI TEST COURSE'));
  await page.click('button[aria-label="UI TEST COURSE хичээлийг засах"]');
  await field(page, 'room', 'TEST-2'); await submit(page);
  assert.ok((await page.$eval('.sg-course-table', element => element.textContent)).includes('TEST-2'));
  await page.click('button[aria-label="UI TEST COURSE хичээлийг устгах"]');
  await click(page, 'Устгах', 'dialog[open]');
  await page.waitForFunction(() => !document.querySelector('dialog[open]'));
  assert.ok(!(await page.$eval('.sg-course-table', element => element.textContent)).includes('UI TEST COURSE'));
  checks.push('Login, course search, create, update and delete');
  await navigate(page, '/students');
  await page.waitForSelector('.sg-empty');
  await page.screenshot({ path: out + '/students-empty.png', fullPage: true });
  await click(page, 'Оюутан бүртгэх', '.sg-heading-actions');
  for (const [name, value] of Object.entries({ code: 'UI2026001', lastName: 'UI Test', firstName: 'Student', email: 'ui-test@example.com', program: 'Программ хангамж' })) await field(page, name, value);
  await submit(page);
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('.sg-table tbody tr');
  assert.ok((await page.$eval('.sg-table', element => element.textContent)).includes('UI Test Student'));
  checks.push('Student registration persists across reload');
  await navigate(page, '/planner');
  await page.waitForSelector('.sg-week-grid');
  await click(page, 'Хуваарь нэмэх', '.sg-section-bar');
  for (const [name, value] of Object.entries({ title: 'Алгебр', day: '0', start: '09:00', end: '10:30', room: 'A-201' })) await field(page, name, value);
  await submit(page);
  await page.waitForSelector('.sg-event');
  await click(page, 'Хуваарь нэмэх', '.sg-section-bar');
  for (const [name, value] of Object.entries({ title: 'Давхардсан цаг', day: '0', start: '09:30', end: '11:00' })) await field(page, name, value);
  await click(page, 'Хадгалах', 'dialog[open]');
  await page.waitForFunction(() => document.querySelector('dialog[open] [role=alert]')?.textContent.includes('давхцаж'));
  await click(page, 'Болих', 'dialog[open]');
  await page.screenshot({ path: out + '/planner-schedule.png', fullPage: true });
  checks.push('Weekly schedule saves and conflicting times are rejected');
  await page.click('#tab-tasks');
  await click(page, 'Төлөвлөгөө нэмэх', '.sg-section-bar');
  for (const [name, value] of Object.entries({ title: 'UI тестийн тайлан', due: '2026-11-22', priority: 'high', kind: 'assignment' })) await field(page, name, value);
  await submit(page);
  await page.waitForSelector('.sg-task-list input[type=checkbox]');
  await page.screenshot({ path: out + '/planner-tasks.png', fullPage: true });
  await page.click('.sg-task-list input[type=checkbox]');
  await page.waitForFunction(() => !document.querySelector('.sg-task-list'));
  await page.click('.sg-task-filters button:nth-child(2)');
  await page.waitForSelector('.sg-task-list .is-done');
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('.sg-week-grid');
  await page.click('#tab-tasks');
  await page.click('.sg-task-filters button:nth-child(2)');
  await page.waitForSelector('.sg-task-list .is-done');
  checks.push('Task creation, completion, filters and persisted state');
  await page.click('#tab-grades');
  for (const grade of [{ title: 'Алгебр', credits: 3, point: 4 }, { title: 'Веб систем', credits: 2, point: 3 }]) {
    await click(page, 'Үнэлгээ нэмэх', '.sg-section-bar');
    for (const [name, value] of Object.entries(grade)) await field(page, name, value);
    await submit(page);
  }
  const gpa = await page.$eval('.sg-gpa-main strong', element => element.textContent);
  assert.ok(gpa.startsWith('3.60'), gpa);
  await page.screenshot({ path: out + '/planner-gpa.png', fullPage: true });
  checks.push('Weighted GPA: (3×4 + 2×3)/5 = 3.60');
  await page.setViewport({ width: 390, height: 844 });
  await page.waitForFunction(() => document.querySelector('.sg-sidebar').getBoundingClientRect().right <= 1);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: out + '/planner-mobile.png', fullPage: true });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Mobile body overflows');
  await page.click('button[aria-label="Цэс нээх"]');
  await page.waitForSelector('.sg-sidebar.is-open');
  await page.screenshot({ path: out + '/navigation-mobile.png', fullPage: true });
  await page.click('button[aria-label="Цэс хаах"]');
  checks.push('Mobile layout, no page overflow and working navigation');
  await page.setViewport({ width: 1440, height: 1000 });
  await navigate(page, '/reports');
  await click(page, 'Тайлан харах');
  await page.waitForSelector('.report-statistics');
  await page.screenshot({ path: out + '/reports-desktop.png', fullPage: true });
  checks.push('Reports load actual API counts on demand');
  const context = await browser.createBrowserContext();
  const student = await setup(context);
  await login(student, 'student1', 'Student123!');
  assert.equal(await student.$('.sg-heading-actions .sg-primary'), null);
  assert.ok(!(await student.$eval('.sg-sidebar nav', element => element.textContent)).includes('Оюутнууд'));
  await navigate(student, '/planner');
  await student.waitForSelector('.sg-week-grid');
  assert.equal((await student.$$('.sg-event')).length, 0);
  checks.push('Student role hides management actions and has a separate private planner');
  await context.close();
  assert.deepEqual(errors, []);
  await fs.writeFile(out + '/results.json', JSON.stringify({ passed: true, checks, errors, backend: 'in-memory port 3100; real data unchanged', frontend: 'Next.js development localhost:3001', viewport: ['1440×1000', '390×844'] }, null, 2));
  console.log(JSON.stringify({ passed: true, checks }, null, 2));
} catch (error) {
  console.error(error);
  for (const page of await browser.pages()) { try { console.error('Overflow',await page.evaluate(() => ({width:innerWidth,scroll:document.documentElement.scrollWidth,items:[...document.querySelectorAll('body *')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0 && r.right>innerWidth+2 && getComputedStyle(el).position!=='fixed'}).slice(0,15).map(el=>({tag:el.tagName,cls:el.className,right:el.getBoundingClientRect().right,width:el.getBoundingClientRect().width}))}))); } catch {} }
  for (const page of await browser.pages()) { try { await page.screenshot({ path: out + '/failure.png', fullPage: true }); } catch {} }
  process.exitCode = 1;
} finally { await browser.close(); }
