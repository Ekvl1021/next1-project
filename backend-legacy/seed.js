require("dotenv").config();
const bcrypt = require("bcryptjs");
const { read, write } = require("./store");

async function main() {
  const users = await read("users.json");
  if (users.length) throw new Error("users.json is not empty; refusing to overwrite accounts.");
  const defaults = [
    { id: 1, username: "admin", password: "Admin123!", role: "admin" },
    { id: 2, username: "teacher1", password: "Teacher123!", role: "teacher" },
    { id: 3, username: "student1", password: "Student123!", role: "student" },
  ];
  await write("users.json", await Promise.all(defaults.map(async ({ password, ...user }) => ({ ...user, passwordHash: await bcrypt.hash(password, 12) }))));
  console.log("Demo accounts created. Change these passwords before using the system beyond local coursework.");
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
