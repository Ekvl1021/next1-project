require("dotenv").config();
const bcrypt = require("bcryptjs");
const connectDB = require("./config/db");
const User = require("./models/User");

async function main() {
  await connectDB();
  const defaults = [
    { id: 1, username: "admin", password: "Admin123!", role: "admin" },
    { id: 2, username: "teacher1", password: "Teacher123!", role: "teacher" },
    { id: 3, username: "student1", password: "Student123!", role: "student" },
  ];
  for (const { password, ...account } of defaults) {
    await User.updateOne(
      { id: account.id },
      { $setOnInsert: { ...account, passwordHash: await bcrypt.hash(password, 12) } },
      { upsert: true }
    );
  }
  console.log("Demo accounts created or confirmed in MongoDB.");
  await require("mongoose").disconnect();
}
main().catch(async (error) => { console.error(error.message); await require("mongoose").disconnect(); process.exitCode = 1; });
