require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { read, write } = require("./store");
const { authenticateToken } = require("./middlewares/auth");
const { authorizeRoles } = require("./middlewares/authorize");
const logger = require("./middlewares/logger");
const { validateCourse } = require("./middlewares/validateCourse");
const { errorHandler } = require("./middlewares/errorHandler");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const path = require("node:path");

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error("Set JWT_SECRET to a random value at least 32 characters long.");
}
const app = express();
const origins = (process.env.CORS_ORIGINS || process.env.FRONTEND_ORIGIN || "http://localhost:3001")
  .split(",").map((origin) => origin.trim()).filter(Boolean);
app.use(cors({
  origin: origins,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json({ limit: "32kb" }));
app.use(logger);
const publicUser = ({ id, username, role }) => ({ id, username, role });
const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const validText = (value) => typeof value === "string" && value.trim().length > 0;

app.post(["/auth/register", "/api/auth/register"], asyncRoute(async (req, res) => {
  const { username, password } = req.body || {};
  if (!validText(username) || !validText(password)) return res.status(400).json({ message: "Username and password are required" });
  if (password.length < 8) return res.status(400).json({ message: "Password must contain at least 8 characters" });
  const users = await read("users.json");
  const normalized = username.trim();
  if (users.some((user) => user.username.toLowerCase() === normalized.toLowerCase())) return res.status(409).json({ message: "Username already exists" });
  const user = { id: users.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1, username: normalized, passwordHash: await bcrypt.hash(password, 12), role: "student" };
  users.push(user);
  await write("users.json", users);
  return res.status(201).json({ user: publicUser(user) });
}));

app.post(["/auth/login", "/api/auth/login"], asyncRoute(async (req, res) => {
  const { username, password } = req.body || {};
  if (!validText(username) || !validText(password)) return res.status(400).json({ message: "Username and password are required" });
  const users = await read("users.json");
  const user = users.find((item) => item.username.toLowerCase() === username.trim().toLowerCase());
  if (!user) return res.status(401).json({ message: "Invalid username or password" });
  if (!(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ message: "Invalid username or password" });
  const token = jwt.sign(
    { sub: String(user.id), username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1m" }
  );
  return res.json({ token, user: publicUser(user) });
}));

app.get(["/students", "/api/students"], authenticateToken, asyncRoute(async (req, res) => {
  const students = await read("students.json");
  const search = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";
  const results = search
    ? students.filter((student) => `${student.name} ${student.email} ${student.program}`.toLowerCase().includes(search))
    : students;
  res.json(results);
}));
app.get(["/teachers", "/api/teachers"], authenticateToken, asyncRoute(async (_req, res) => {
  const users = await read("users.json");
  res.json(users.filter((user) => user.role === "teacher").map(publicUser));
}));
app.post(["/students", "/api/students"], authenticateToken, authorizeRoles("admin", "teacher"), asyncRoute(async (req, res) => {
  const { name, email, program, courseId = "" } = req.body || {};
  if (![name, email, program].every(validText)) return res.status(400).json({ message: "Name, email and program are required" });
  const rows = await read("students.json");
  const student = { id: String(Date.now()), name: name.trim(), email: email.trim(), program: program.trim(), courseId: String(courseId) };
  for (const field of ["code", "firstName", "lastName"]) if (validText(req.body[field])) student[field] = req.body[field].trim();
  rows.push(student); await write("students.json", rows); res.status(201).json(student);
}));
app.delete(["/students/:id", "/api/students/:id"], authenticateToken, authorizeRoles("admin"), asyncRoute(async (req, res) => {
  const rows = await read("students.json"); const next = rows.filter((item) => String(item.id) !== req.params.id);
  if (rows.length === next.length) return res.status(404).json({ message: "Student not found" });
  await write("students.json", next); res.status(204).end();
}));

app.get(["/courses", "/api/courses"], authenticateToken, asyncRoute(async (req, res) => {
  const courses = await read("courses.json");
  const search = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";
  res.json(search ? courses.filter((course) =>
    `${course.title} ${course.teacher} ${course.schedule} ${course.room}`.toLowerCase().includes(search)
  ) : courses);
}));
app.get(["/courses/:id", "/api/courses/:id"], authenticateToken, asyncRoute(async (req, res) => {
  const course = (await read("courses.json")).find((item) => String(item.id) === req.params.id);
  if (!course) return res.status(404).json({ message: "Course not found" });
  res.json(course);
}));
app.post(["/courses", "/api/courses"], authenticateToken, authorizeRoles("admin", "teacher"), validateCourse, asyncRoute(async (req, res) => {
  const { title, teacher, schedule, room } = req.body || {};
  const rows = await read("courses.json");
  const course = { id: String(Date.now()), title: title.trim(), teacher: teacher.trim(), schedule: schedule.trim(), room: room.trim() };
  rows.push(course); await write("courses.json", rows); res.status(201).json(course);
}));
app.put(["/courses/:id", "/api/courses/:id"], authenticateToken, authorizeRoles("admin", "teacher"), validateCourse, asyncRoute(async (req, res) => {
  const rows = await read("courses.json"); const index = rows.findIndex((item) => String(item.id) === req.params.id);
  if (index < 0) return res.status(404).json({ message: "Course not found" });
  const fields = ["title", "teacher", "schedule", "room"];
  const updated = { ...rows[index] };
  for (const field of fields) if (req.body?.[field] !== undefined) {
    updated[field] = req.body[field].trim();
  }
  rows[index] = updated; await write("courses.json", rows); res.json(updated);
}));
app.delete(["/courses/:id", "/api/courses/:id"], authenticateToken, authorizeRoles("admin"), asyncRoute(async (req, res) => {
  const rows = await read("courses.json"); const next = rows.filter((item) => String(item.id) !== req.params.id);
  if (next.length === rows.length) return res.status(404).json({ message: "Course not found" });
  await write("courses.json", next); res.status(204).end();
}));

app.get(["/departments", "/api/departments"], authenticateToken, asyncRoute(async (_req, res) => res.json(await read("departments.json"))));
app.post(["/departments", "/api/departments"], authenticateToken, authorizeRoles("admin"), asyncRoute(async (req, res) => {
  const { name } = req.body || {};
  if (!validText(name)) return res.status(400).json({ message: "Department name is required" });
  const rows = await read("departments.json"); const department = { id: String(Date.now()), name: name.trim() };
  rows.push(department); await write("departments.json", rows); res.status(201).json(department);
}));

app.use("/api/planner", require("./routes/plannerRoutes"));
app.use(["/me/courses", "/api/me/courses"], require("./routes/courseSelectionRoutes"));

const swaggerDocument = YAML.load(path.join(__dirname, "swagger", "openapi.yaml"));
app.get("/api-docs/openapi.json", (_req, res) => res.json(swaggerDocument));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.get("/api/demo-error", (_req, _res, next) => next(new Error("Жишээ серверийн алдаа")));
app.use((req, res) => res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` }));
app.use(errorHandler);
const port = Number(process.env.PORT || 3000);
if (require.main === module) {
  app.listen(port, () => console.log(`Surgaal API listening on http://localhost:${port}`));
}
module.exports = app;
