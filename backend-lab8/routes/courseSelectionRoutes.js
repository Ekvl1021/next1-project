const express = require("express");
const { authenticateToken } = require("../middlewares/auth");
const { authorizeRoles } = require("../middlewares/authorize");
const CourseSelection = require("../models/CourseSelection");
const Course = require("../models/Course");
const User = require("../models/User");
const Student = require("../models/Student");
const { sessionsFor, overlap } = require("../services/schedule");

const router = express.Router();
router.use(authenticateToken);

function courseIdIsValid(value) {
  return typeof value === "string" && /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value));
}

async function importLegacySelections(userFilter) {
  const users = await User.find(userFilter).select("id courseIds").lean();
  const operations = users.flatMap(user => [...new Set(user.courseIds || [])]
    .filter(courseIdIsValid)
    .map(courseId => ({
      updateOne: {
        filter: { studentId: String(user.id), courseId },
        update: { $setOnInsert: { status: "pending" } },
        upsert: true,
      },
    })));
  if (operations.length) await CourseSelection.bulkWrite(operations, { ordered: false });
  return users;
}

async function enrichSelections(selections) {
  const courseIds = [...new Set(selections.map(selection => Number(selection.courseId)))];
  const studentIds = [...new Set(selections.map(selection => Number(selection.studentId)))];
  const [courses, users] = await Promise.all([
    Course.find({ id: { $in: courseIds } }).lean(),
    User.find({ id: { $in: studentIds }, role: "student" }).select("id username").lean(),
  ]);
  const students = await Student.find({ code: { $in: users.map(user => user.username) } }).lean();
  const courseById = new Map(courses.map(course => [String(course.id), course]));
  const userById = new Map(users.map(user => [String(user.id), user]));
  const studentByCode = new Map(students.map(student => [student.code, student]));

  return selections.flatMap(selection => {
    const course = courseById.get(selection.courseId);
    if (!course) return [];
    const user = userById.get(selection.studentId);
    const student = user ? studentByCode.get(user.username) : undefined;
    return [{
      id: String(selection._id),
      studentId: selection.studentId,
      studentName: student ? `${student.lastName} ${student.firstName}`.trim() : user?.username || "Оюутан",
      studentCode: user?.username || "",
      courseId: selection.courseId,
      course: { ...course, id: String(course.id), sessions: sessionsFor(course) },
      status: selection.status,
      createdAt: selection.createdAt,
      reviewedAt: selection.reviewedAt,
    }];
  });
}

router.get("/", async (req, res, next) => {
  try {
    let filter = {};
    if (req.user.role === "student") {
      filter = { studentId: req.user.id };
      const users = await importLegacySelections({ id: Number(req.user.id), role: "student" });
      if (!users.length) return res.status(404).json({ message: "Student account not found" });
    } else if (req.user.role === "teacher") {
      const assignedCourses = await Course.find({ teacher: req.user.username }).select("id").lean();
      filter = { courseId: { $in: assignedCourses.map(course => String(course.id)) }, status: "approved" };
    } else {
      await importLegacySelections({ role: "student", courseIds: { $ne: [] } });
    }

    const selections = await CourseSelection.find(filter)
      .sort(req.user.role === "admin" ? { status: 1, createdAt: -1 } : { createdAt: -1 }).lean();
    res.json(await enrichSelections(selections));
  } catch (error) {
    next(error);
  }
});

router.post("/", authorizeRoles("student"), async (req, res, next) => {
  try {
    const { courseId } = req.body || {};
    if (!courseIdIsValid(courseId)) return res.status(400).json({ message: "courseId must be a positive course ID" });
    if (!await Course.exists({ id: Number(courseId) })) return res.status(404).json({ message: "Course not found" });

    let selection = await CourseSelection.findOneAndUpdate(
      { studentId: req.user.id, courseId, status: "rejected" },
      { $set: { status: "pending", reviewedBy: "", reviewedAt: null } },
      { new: true }
    ).lean();
    if (!selection) {
      selection = await CourseSelection.findOne({ studentId: req.user.id, courseId }).lean();
    }
    if (!selection) {
      try {
        selection = (await CourseSelection.create({ studentId: req.user.id, courseId })).toObject();
      } catch (error) {
        if (error.code !== 11000) throw error;
        selection = await CourseSelection.findOne({ studentId: req.user.id, courseId }).lean();
        if (!selection) throw error;
      }
    }
    res.status(201).json((await enrichSelections([selection]))[0]);
  } catch (error) {
    next(error);
  }
});

router.delete("/:courseId", authorizeRoles("student"), async (req, res, next) => {
  try {
    if (!courseIdIsValid(req.params.courseId)) return res.status(400).json({ message: "courseId must be a positive course ID" });
    const result = await CourseSelection.deleteOne({ studentId: req.user.id, courseId: req.params.courseId, status: 'pending' });
    if(!result.deletedCount) return res.status(409).json({message:'Зөвхөн хүлээгдэж буй хүсэлтийг цуцална.'});
    await User.updateOne({id:Number(req.user.id)}, {$pull:{courseIds:req.params.courseId}});
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

router.patch("/:studentId/:courseId", authorizeRoles("admin"), require("../services/reviewLock"), async (req, res, next) => {
  try {
    const { studentId, courseId } = req.params;
    const { status } = req.body || {};
    if (!/^[1-9]\d*$/.test(studentId) || !Number.isSafeInteger(Number(studentId)) || !courseIdIsValid(courseId)) {
      return res.status(400).json({ message: "Student and course IDs must be positive integers" });
    }
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "status must be approved or rejected" });
    }
    const existing = await CourseSelection.findOne({ studentId, courseId }).lean();
    if(!existing) return res.status(404).json({message:'Хүсэлт олдсонгүй.'});
    if(existing.status !== 'pending') return res.status(409).json({message:'Энэ хүсэлт аль хэдийн шийдвэрлэгдсэн.'});
    if(status === 'approved') {
      const course = await Course.findOne({id:Number(courseId)}).lean();
      if(!course || !sessionsFor(course).length) return res.status(400).json({message:'Эхлээд хичээлийн хуваарийг тохируулна уу.'});
      const active = await CourseSelection.find({status:'approved',courseId:{$ne:courseId}}).select('courseId').lean();
      const activeCourses = await Course.find({id:{$in:active.map(s=>Number(s.courseId))}}).lean();
      const resourceConflict = activeCourses.find(c=>sessionsFor(c).some(a=>sessionsFor(course).some(b=>overlap(a,b)&&(c.teacher===course.teacher||a.room.trim().toLowerCase()===b.room.trim().toLowerCase()))));
      if(resourceConflict) return res.status(409).json({message:`“${resourceConflict.title}” хичээлийн багш эсвэл өрөөний цагтай давхцаж байна. Админ өөр пар сонгоно уу.`});
      const approved = await CourseSelection.find({studentId,status:'approved',courseId:{$ne:courseId}}).lean();
      const courses = await Course.find({id:{$in:approved.map(s=>Number(s.courseId))}}).lean();
      const collision = courses.find(c=>sessionsFor(c).some(a=>sessionsFor(course).some(b=>overlap(a,b))));
      if(collision) return res.status(409).json({message:`“${collision.title}” хичээлийн цагтай давхцаж байна. Хуваарийг өөрчилнө үү.`});
    }
    const selection = await CourseSelection.findOneAndUpdate(
      { studentId, courseId, status: 'pending' },
      { $set: { status, reviewedBy: req.user.username, reviewedAt: new Date() } },
      { returnDocument: "after", runValidators: true }
    ).lean();
    if (!selection) return res.status(409).json({ message: "Хүсэлт аль хэдийн шийдвэрлэгдсэн." });
    res.json((await enrichSelections([selection]))[0]);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
