import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspace = path.dirname(appRoot);
const requireTool = createRequire(path.join(workspace, '.lab-tools/package.json'));
const puppeteerModule = await import(pathToFileURL(requireTool.resolve('puppeteer')).href);
const puppeteer = puppeteerModule.default;
const lighthouse = (await import(pathToFileURL(requireTool.resolve('lighthouse')).href)).default;
const desktop = (await import(pathToFileURL(requireTool.resolve('lighthouse/core/config/desktop-config.js')).href)).default;
const base = process.env.LAB_FRONTEND || 'http://localhost:3101';
const api = process.env.LAB_BACKEND || 'http://localhost:3100';
const out = path.join(appRoot, 'reports/lab56-performance');
await fs.mkdir(out, { recursive: true });
const evidence = { generatedAt: new Date().toISOString(), environment: { platform: os.platform(), arch: os.arch(), cpus: os.cpus()[0].model, cores: os.cpus().length, node: process.version, frontend: base, backend: api, next: '16.4.2', mode: 'production', bundler: 'webpack', viewport: { width: 1350, height: 940, deviceScaleFactor: 1 }, browserCache: 'disabled for network measurements', network: 'local loopback, unthrottled for navigation measurements', cpu: 'unthrottled for navigation measurements', renderMetric: 'CourseItem commits recorded by a build-flag-gated effect; includes initial mount', data: {}, note: 'Baseline immediately shows the report; optimized initially shows the open button. Load event and report-ready times are distinct.' }, networkRuns: [], renderRuns: [], caching: [], lighthouseRuns: [] };
async function save() { await fs.writeFile(path.join(out, 'measurements.json'), JSON.stringify(evidence, null, 2)); }
async function login() {
  const response = await fetch(api + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: process.env.LAB_USERNAME || 'admin', password: process.env.LAB_PASSWORD || 'Admin123!' }) });
  assert.equal(response.status, 200, 'Real API login must succeed');
  return response.json();
}
const auth = await login();
for (const resource of ['courses', 'students', 'teachers', 'departments']) {
  const response = await fetch(api + '/' + resource, { headers: { Authorization: `Bearer ${auth.token}` } });
  assert.equal(response.status, 200);
  evidence.environment.data[resource] = (await response.json()).length;
}
async function browserWithSession() {
  const browser = await puppeteer.launch({ headless: process.env.LAB_CHROME_SHELL === '1' ? 'shell' : true, args: ['--no-first-run', '--disable-background-networking', '--disable-extensions'] });
  const page = await browser.newPage();
  await page.setViewport(evidence.environment.viewport);
  await page.goto(base + '/login', { waitUntil: 'networkidle0' });
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('surgaal-token', token);
    localStorage.setItem('surgaal-session', JSON.stringify({ name: user.username, email: user.email || '', role: user.role }));
    document.cookie = `surgaal-token=${encodeURIComponent(token)}; Path=/; SameSite=Lax`;
  }, auth);
  return { browser, page };
}
async function measuredPage(route, repetition, clickReport = false) {
  const { browser, page } = await browserWithSession();
  try {
    evidence.environment.chrome = await browser.version();
    const cdp = await page.createCDPSession();
    await cdp.send('Network.enable');
    await cdp.send('Network.clearBrowserCache');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    const requests = new Map();
    const failures = [];
    let phase = 'initial';
    cdp.on('Network.requestWillBeSent', event => requests.set(event.requestId, { url: event.request.url, type: event.type, method: event.request.method, phase, timestamp: event.timestamp }));
    cdp.on('Network.responseReceived', event => {
      const item = requests.get(event.requestId);
      if (item) Object.assign(item, { status: event.response.status, mime: event.response.mimeType, protocol: event.response.protocol });
    });
    cdp.on('Network.loadingFinished', event => {
      const item = requests.get(event.requestId);
      if (item) Object.assign(item, { transferBytes: event.encodedDataLength, durationMs: (event.timestamp - item.timestamp) * 1000 });
    });
    page.on('pageerror', error => failures.push(String(error)));
    await page.evaluateOnNewDocument(() => {
      window.__labCourseCommits = [];
      window.addEventListener('lab:course-item-commit', event => window.__labCourseCommits.push(event.detail));
      window.__labVisible = {};
      new MutationObserver(() => {
        for (const [name, selector] of Object.entries({ report: '.report-statistics', button: '.reports-toggle', courses: '.course-search', dashboard: '.ulms-shell' })) {
          if (!window.__labVisible[name] && document.querySelector(selector)) window.__labVisible[name] = performance.now();
        }
      }).observe(document, { subtree: true, childList: true });
    });
    await page.goto(base + route, { waitUntil: 'load', timeout: 30000 });
    if (route === '/reports/baseline') await page.waitForSelector('.report-statistics', { timeout: 15000 });
    else if (route === '/reports/optimized') await page.waitForSelector('.reports-toggle');
    else if (route === '/dashboard') await page.waitForSelector('.ulms-shell');
    else if (route === '/courses-client') await page.waitForSelector('.course-search');
    await page.waitForNetworkIdle({ idleTime: 700, timeout: 15000 });
    const initial = await page.evaluate(() => ({ navigation: performance.getEntriesByType('navigation')[0].toJSON(), visible: window.__labVisible, resources: performance.getEntriesByType('resource').map(item => item.toJSON()) }));
    await page.screenshot({ path: path.join(out, `${route.split('/').filter(Boolean).join('-')}-${repetition}-initial.png`), fullPage: true });
    let interaction = null;
    if (clickReport) {
      phase = 'open-report';
      const before = await page.evaluate(() => performance.now());
      await page.click('.reports-toggle');
      await page.waitForSelector('.report-statistics', { timeout: 15000 });
      await page.waitForNetworkIdle({ idleTime: 700, timeout: 15000 });
      interaction = await page.evaluate(start => ({ reportReadyAfterClickMs: window.__labVisible.report - start }), before);
      await page.screenshot({ path: path.join(out, `reports-optimized-${repetition}-opened.png`), fullPage: true });
    }
    assert.equal(failures.length, 0, failures.join('\n'));
    const list = [...requests.values()].filter(item => item.url.startsWith('http'));
    for (const item of list) delete item.timestamp;
    const sumJS = which => list.filter(item => item.phase === which && (item.type === 'Script' || /\.js(?:\?|$)/.test(item.url))).reduce((sum, item) => sum + (item.transferBytes || 0), 0);
    const apis = which => list.filter(item => item.phase === which && item.url.startsWith(api) && item.method !== 'OPTIONS');
    const result = { route, repetition, loadEventMs: initial.navigation.loadEventEnd, domContentLoadedMs: initial.navigation.domContentLoadedEventEnd, visible: initial.visible, initialJSTransferBytes: sumJS('initial'), initialAPIRequests: apis('initial').length, initialAPI: apis('initial'), openReportJSTransferBytes: sumJS('open-report'), openReportAPIRequests: apis('open-report').length, interaction, requests: list, browserResources: initial.resources, failures };
    evidence.networkRuns.push(result);
    console.log('Network', route, repetition, JSON.stringify({ js: result.initialJSTransferBytes, api: result.initialAPIRequests, loadMs: result.loadEventMs, clickJS: result.openReportJSTransferBytes }));
    await save();
  } finally { await browser.close(); }
}
async function renderRun(mode, repetition) {
  const { browser, page } = await browserWithSession();
  try {
    await page.evaluateOnNewDocument(() => {
      window.__labCourseCommits = [];
      window.addEventListener('lab:course-item-commit', event => window.__labCourseCommits.push(event.detail));
    });
    await page.goto(`${base}/reports/render-test?mode=${mode}`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#render-test-table tr');
    const initial = await page.evaluate(() => window.__labCourseCommits.length);
    for (let count = 1; count <= 10; count++) {
      await page.click('#render-counter');
      await page.waitForFunction(expected => document.querySelector('#render-counter-value').textContent === String(expected), {}, count);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    }
    const total = await page.evaluate(() => window.__labCourseCommits.length);
    const rowCount = await page.$$eval('#render-test-table tr', rows => rows.length);
    assert.equal(total, mode === 'baseline' ? rowCount * 11 : rowCount);
    evidence.renderRuns.push({ mode, repetition, rows: rowCount, parentUpdates: 10, initialCommits: initial, totalCommits: total, updateCommits: total - initial });
    if (repetition === 1) await page.screenshot({ path: path.join(out, `render-${mode}.png`), fullPage: true });
    console.log('Render', mode, repetition, total);
    await save();
  } finally { await browser.close(); }
}
function backendHits(resource) {
  return fs.readFile('/tmp/lab56-backend.log', 'utf8').then(log => log.split('\n').filter(line => new RegExp(` GET /${resource} 200 `).test(line)).length);
}
async function cacheRun(resource, mode) {
  // A separate JWT per experiment creates a fresh authenticated cache key.
  const session = await login();
  const before = await backendHits(resource);
  const runs = [];
  for (let n = 0; n < 3; n++) {
    const started = performance.now();
    const response = await fetch(`${base}/api/lab-cache?resource=${resource}&mode=${mode}`, { headers: { Authorization: `Bearer ${session.token}` } });
    const rows = await response.json();
    assert.equal(response.status, 200, JSON.stringify(rows));
    runs.push({ elapsedMs: performance.now() - started, rows: rows.length });
  }
  const hits = (await backendHits(resource)) - before;
  evidence.caching.push({ resource, mode, requestsToNext: 3, requestsToExpress: hits, runs });
  console.log('Cache', resource, mode, hits);
  await save();
}
async function lighthouseRun(route, repetition) {
  const { browser, page } = await browserWithSession();
  try {
    const port = Number(new URL(browser.wsEndpoint()).port);
    const result = await lighthouse(base + route, { port, onlyCategories: ['performance'], output: ['json', 'html'], logLevel: 'error', disableStorageReset: true }, desktop);
    assert.ok(!result.lhr.runtimeError, JSON.stringify(result.lhr.runtimeError));
    const data = result.lhr;
    const file = `${route.split('/').filter(Boolean).join('-')}-${repetition}-lighthouse`;
    await fs.writeFile(path.join(out, file + '.json'), JSON.stringify(data));
    await fs.writeFile(path.join(out, file + '.html'), result.report[1]);
    const finalURL = data.finalDisplayedUrl || data.finalUrl;
    assert.ok(finalURL.includes(route), `Wrong Lighthouse destination: ${finalURL}`);
    // Verify the audited browser retained a valid authenticated session.
    await page.goto(base + route, { waitUntil: 'networkidle0' });
    const visible = await page.$eval('h1', element => element.textContent);
    assert.ok(!visible.includes('НЭВТРЭХ'));
    const entry = { route, repetition, performanceScore: data.categories.performance.score * 100, fcpMs: data.audits['first-contentful-paint'].numericValue, lcpMs: data.audits['largest-contentful-paint'].numericValue, speedIndexMs: data.audits['speed-index'].numericValue, tbtMs: data.audits['total-blocking-time'].numericValue, cls: data.audits['cumulative-layout-shift'].numericValue, config: data.configSettings, warnings: data.runWarnings, report: file + '.html' };
    evidence.lighthouseRuns.push(entry);
    console.log('Lighthouse', route, repetition, entry.performanceScore);
    await save();
  } finally { await browser.close(); }
}
await save();
const phase = process.env.LAB_PHASE || 'all';
if (phase === 'all' || phase === 'network') {
  for (let repetition = 1; repetition <= 3; repetition++) {
    const routes = repetition % 2 ? ['/reports/baseline', '/reports/optimized'] : ['/reports/optimized', '/reports/baseline'];
    for (const route of routes) await measuredPage(route, repetition, route.endsWith('optimized'));
    await measuredPage('/dashboard', repetition);
    for (const mode of ['baseline', 'optimized']) await renderRun(mode, repetition);
  }
  for (const resource of ['courses', 'departments']) for (const mode of ['no-store', 'revalidate']) await cacheRun(resource, mode);
}
if (phase === 'all' || phase === 'lighthouse') {
  for (let repetition = 1; repetition <= 3; repetition++) {
    for (const route of repetition % 2 ? ['/reports/baseline', '/reports/optimized', '/dashboard'] : ['/reports/optimized', '/reports/baseline', '/dashboard']) await lighthouseRun(route, repetition);
  }
}
await save();
console.log('Evidence saved:', out);
