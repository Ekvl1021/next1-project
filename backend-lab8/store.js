const fs = require("node:fs/promises");
const path = require("node:path");

const dataDir = path.join(__dirname, "data");
async function read(name) {
  try { return JSON.parse(await fs.readFile(path.join(dataDir, name), "utf8")); }
  catch (error) { if (error.code === "ENOENT") return []; throw error; }
}
async function write(name, value) {
  const target = path.join(dataDir, name);
  const temporary = `${target}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await fs.rename(temporary, target);
}
module.exports = { read, write };
