import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const adapter = path.resolve(app, "../../.lab-postcss-tools/node_modules/@tailwindcss/postcss/dist/index.js");
const config = path.join(app, "postcss.config.mjs");
try { await fs.access(config); throw new Error("Existing postcss.config.mjs must be preserved; configure the adapter there before running this harness."); }
catch (error) { if (error.code !== "ENOENT") throw error; }
await fs.access(adapter);
try {
  await fs.writeFile(config, `export default {plugins: {[process.env.LAB_POSTCSS_PLUGIN]: {}}};\n`, { flag: "wx" });
  const result = spawnSync(process.execPath, [path.join(app, "node_modules/next/dist/bin/next"), "build", "--webpack"], {
    cwd: app, stdio: "inherit", env: { ...process.env, LAB_POSTCSS_PLUGIN: adapter,
      LAB_DIST_DIR: ".next-lab-performance", NEXT_PUBLIC_LAB_MEASUREMENTS: "1",
      NEXT_PUBLIC_API_URL: process.env.LAB_BACKEND || "http://localhost:3100",
      API_URL: process.env.LAB_BACKEND || "http://localhost:3100" },
  });
  if (result.error) throw result.error;
  process.exitCode = result.status || 0;
} finally { await fs.unlink(config); }
