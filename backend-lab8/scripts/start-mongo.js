require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
const local = path.join(root, '.local-tools/bin/mongod');
const data = path.join(root, '.local-mongodb/data');
fs.mkdirSync(data, { recursive: true });
const net = require('node:net');
const port = Number(process.env.MONGODB_PORT || 27017);
const probe = net.createConnection({ host: '127.0.0.1', port });
probe.on('connect', () => { console.log(`MongoDB already running on 127.0.0.1:${port}`); probe.end(); });
probe.on('error', () => startMongo());
function startMongo() {
const child = spawn(fs.existsSync(local) ? local : 'mongod', [
  '--dbpath', data, '--bind_ip', '127.0.0.1', '--port', String(port),
  '--logpath', path.join(root, '.local-mongodb/mongod.log'), '--logappend', '--auth',
], { stdio: 'inherit' });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code || 0; });
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => child.kill(signal));

}
