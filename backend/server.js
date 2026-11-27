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
const courseController = require("./controllers/course-controller");
const departmentController = require("./controllers/department-controller");
const roomController = require("./controllers/room-controller");
const teacherController = require("./controllers/teacher-controller");
const { validateResourceId } = require("./middlewares/validateResourceId");
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
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use("/api/assessments", express.json({ limit: "8mb" }));
app.use(express.json({ limit: "32kb" }));
app.use(logger);
const publicUser = ({ id, username, role }) => ({ id, username, role });
const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const validText = (value) => typeof value === "string" && value.trim().length > 0;

app.post(["/auth/register", "/api/auth/register"], (_req, res) => {
  res.status(403).json({ message: "Public registration is disabled. Accounts are managed in MongoDB." });
});

app.post(["/auth/login", "/api/auth/login"], asyncRoute(async (req, res) => {
  const { username, password } = req.body || {};
  if (!validText(username) || !validText(password)) return res.status(400).json({ message: "Username and password are required" });
  const User = require("./models/User");
  const user = await User.findOne({ username: username.trim() }).collation({ locale: "en", strength: 2 });
  if (!user) return res.status(401).json({ message: "Invalid username or password" });
  if (!(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ message: "Invalid username or password" });
  const token = jwt.sign(
    { sub: String(user.id), username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1m" }
  );
  return res.json({ token, user: publicUser(user) });
}));

app.use(["/students", "/api/students"], require("./routes/student-routes"));
app.get(["/teachers", "/api/teachers"], authenticateToken, asyncRoute(teacherController.getTeachers));
app.post(["/teachers", "/api/teachers"], authenticateToken, authorizeRoles("admin"), asyncRoute(teacherController.createTeacher));
app.get(["/teachers/:id", "/api/teachers/:id"], authenticateToken, validateResourceId, asyncRoute(teacherController.getTeacherById));
app.put(["/teachers/:id", "/api/teachers/:id"], authenticateToken, authorizeRoles("admin"), validateResourceId, asyncRoute(teacherController.updateTeacher));
app.patch(["/teachers/:id", "/api/teachers/:id"], authenticateToken, authorizeRoles("admin"), validateResourceId, asyncRoute(teacherController.updateTeacher));
app.delete(["/teachers/:id", "/api/teachers/:id"], authenticateToken, authorizeRoles("admin"), validateResourceId, asyncRoute(teacherController.deleteTeacher));
app.get(["/courses", "/api/courses"], authenticateToken, asyncRoute(courseController.getCourses));
app.get("/api/rooms", authenticateToken, asyncRoute(roomController.getRooms));
app.post("/api/rooms", authenticateToken, authorizeRoles("admin"), asyncRoute(roomController.createRoom));
app.get("/api/rooms/:id", authenticateToken, validateResourceId, asyncRoute(roomController.getRoomById));
app.put("/api/rooms/:id", authenticateToken, authorizeRoles("admin"), validateResourceId, asyncRoute(roomController.updateRoom));
app.patch("/api/rooms/:id", authenticateToken, authorizeRoles("admin"), validateResourceId, asyncRoute(roomController.updateRoom));
app.delete("/api/rooms/:id", authenticateToken, authorizeRoles("admin"), validateResourceId, asyncRoute(roomController.deleteRoom));
app.get(["/me/courses", "/api/me/courses"], authenticateToken, authorizeRoles("student"), asyncRoute(async (req, res) => {
  const user = await require("./models/User").findOne({ id: Number(req.user.id), role: "student" }).lean();
  if (!user) return res.status(404).json({ message: "Student account not found" });
  res.json({ courseIds: user.courseIds || [] });
}));
app.put(["/me/courses", "/api/me/courses"], authenticateToken, authorizeRoles("student"), asyncRoute(async (req, res) => {
  const { courseIds } = req.body || {};
  if (!Array.isArray(courseIds) || courseIds.some((id) =>
    typeof id !== "string" || !/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))
  )) {
    return res.status(400).json({ message: "courseIds must be an array of course IDs" });
  }
  const uniqueIds = [...new Set(courseIds)];
  const Course = require("./models/Course");
  const existingCourses = await Course.find({ id: { $in: uniqueIds.map(Number) } }).select("id").lean();
  if (existingCourses.length !== uniqueIds.length ||
      existingCourses.some((course) => !Number.isSafeInteger(Number(course.id)))) {
    return res.status(400).json({ message: "One or more selected courses do not exist" });
  }
  const User = require("./models/User");
  const user = await User.findOneAndUpdate(
    { id: Number(req.user.id), role: "student" },
    { $set: { courseIds: uniqueIds } },
    { new: true }
  );
  if (!user) return res.status(404).json({ message: "Student account not found" });
  res.json({ courseIds: uniqueIds });
}));
app.get(["/courses/:id", "/api/courses/:id"], authenticateToken, asyncRoute(courseController.getCourseById));
app.post(["/courses", "/api/courses"], authenticateToken, authorizeRoles("admin"), validateCourse, asyncRoute(courseController.createCourse));
app.put(["/courses/:id", "/api/courses/:id"], authenticateToken, authorizeRoles("admin"), validateCourse, asyncRoute(courseController.updateCourse));
app.patch(["/courses/:id", "/api/courses/:id"], authenticateToken, authorizeRoles("admin"), validateCourse, asyncRoute(courseController.updateCourse));
app.delete(["/courses/:id", "/api/courses/:id"], authenticateToken, authorizeRoles("admin"), asyncRoute(courseController.deleteCourse));

app.get(["/departments", "/api/departments"], authenticateToken, asyncRoute(departmentController.getDepartments));
app.post(["/departments", "/api/departments"], authenticateToken, authorizeRoles("admin"), asyncRoute(departmentController.createDepartment));
app.get(["/departments/:id", "/api/departments/:id"], authenticateToken, validateResourceId, asyncRoute(departmentController.getDepartmentById));
app.put(["/departments/:id", "/api/departments/:id"], authenticateToken, authorizeRoles("admin"), validateResourceId, asyncRoute(departmentController.updateDepartment));
app.patch(["/departments/:id", "/api/departments/:id"], authenticateToken, authorizeRoles("admin"), validateResourceId, asyncRoute(departmentController.updateDepartment));
app.delete(["/departments/:id", "/api/departments/:id"], authenticateToken, authorizeRoles("admin"), validateResourceId, asyncRoute(departmentController.deleteDepartment));

app.use("/api/assessments", require("./routes/assessmentRoutes"));
app.use("/api/academic", require("./routes/academicRoutes"));
app.use("/api/planner", require("./routes/plannerRoutes"));
app.use("/api/attendance", require("./routes/attendanceRoutes"));
app.use("/api/course-selections", require("./routes/courseSelectionRoutes"));

const openapiPath = path.join(__dirname, "swagger", "openapi.yaml");
const swaggerDocument = YAML.load(openapiPath);
app.get(["/openapi.yaml", "/api-docs/openapi.yaml"], (_req, res) => res.sendFile(openapiPath));
app.get("/api-docs/openapi.json", (_req, res) => res.json(swaggerDocument));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  docExpansion: "none",
  tagsSorter: "alpha",
  operationsSorter: "alpha",
  filter: true,
}));
app.get("/api/demo-error", (_req, _res, next) => next(new Error("Жишээ серверийн алдаа")));
app.use((req, res) => res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` }));
app.use(errorHandler);
const port = Number(process.env.PORT || 3002);
if (require.main === module) {
  require("./config/db")().then(async () => {
    const User = require("./models/User");
    await User.init();
    const accountCount = await User.countDocuments();
    if (accountCount === 0) {
      const accounts = await read("users.json");
      await User.insertMany(accounts);
      console.log("MongoDB accounts seeded from data/users.json");
    }
    await require("./models/Assessment").Submission.init();
    await require("./models/Student").init();
    await require("./models/Counter").init();
    await require("./models/Counter").updateOne({ _id: "students" }, { $setOnInsert: { value: 0 } }, { upsert: true });
    app.listen(port, "0.0.0.0", () => console.log(`Lab 8 API: http://localhost:${port}; Swagger: http://localhost:${port}/api-docs/`));
  }).catch(async (error) => {
    console.error("Startup failed:", error.message);
    await require("mongoose").disconnect();
    process.exitCode = 1;
  });
}
module.exports = app;
