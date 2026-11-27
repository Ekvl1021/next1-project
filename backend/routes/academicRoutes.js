const router = require('express').Router();
const { authenticateToken } = require('../middlewares/auth');
const { authorizeRoles } = require('../middlewares/authorize');
const Course = require('../models/Course');
const Student = require('../models/Student');
const User = require('../models/User');
const Grade = require('../models/Grade');
const Selection = require('../models/CourseSelection');
const { sessionsFor, overlap } = require('../services/schedule');
const wrap = fn => (req,res,next)=>Promise.resolve(fn(req,res)).catch(next);
router.use(authenticateToken);
router.get('/profile', wrap(async(req,res)=>{
  const profile = req.user.role==='student' ? await Student.findOne({code:req.user.username}).lean() : null;
  res.json({ username:req.user.username, role:req.user.role, profile });
}));
router.get('/schedule', wrap(async(req,res)=>{
  const selectionFilter = req.user.role === 'student'
    ? { studentId:req.user.id, status:'approved' }
    : { status:{ $in:req.user.role === 'teacher' ? ['approved'] : ['pending','approved'] } };
  const selections = await Selection.find(selectionFilter).lean();
  const filter = { id:{ $in:[...new Set(selections.map(s=>Number(s.courseId)))] } };
  if(req.user.role === 'teacher') filter.teacher = req.user.username;
  const courses = await Course.find(filter).sort({id:1}).lean();
  res.json(courses.map(c=>({
    ...c,id:String(c.id),sessions:sessionsFor(c),
    approvedCount:selections.filter(s=>s.courseId===String(c.id)&&s.status==='approved').length,
    pendingCount:selections.filter(s=>s.courseId===String(c.id)&&s.status==='pending').length,
  })));
}));
router.get('/students', authorizeRoles('teacher'), wrap(async(req,res)=>{
  const courses=await Course.find({teacher:req.user.username}).lean();
  const byId=new Map(courses.map(c=>[String(c.id),c]));
  const selections=await Selection.find({courseId:{$in:[...byId.keys()]},status:'approved'}).lean();
  const users=await User.find({id:{$in:selections.map(s=>Number(s.studentId))},role:'student'}).lean();
  const byCode=new Map(users.map(u=>[u.username,String(u.id)]));
  const students=await Student.find({code:{$in:[...byCode.keys()]}}).lean();
  res.json(students.map(s=>({...s,selectedCourses:selections.filter(r=>r.studentId===byCode.get(s.code)).map(r=>({id:r.courseId,title:byId.get(r.courseId)?.title,status:'approved'}))})));
}));
router.get('/roster/:courseId', authorizeRoles('admin','teacher'), wrap(async(req,res)=>{
  const course = await Course.findOne({id:Number(req.params.courseId)}).lean();
  if(!course) return res.status(404).json({message:'Хичээл олдсонгүй.'});
  if(req.user.role==='teacher' && course.teacher!==req.user.username) return res.status(403).json({message:'Зөвхөн өөрийн хичээлийн оюутнуудыг харна.'});
  const selections=await Selection.find({courseId:String(course.id),status:'approved'}).lean();
  const users=await User.find({id:{$in:selections.map(s=>Number(s.studentId))},role:'student'}).lean();
  res.json(await Student.find({code:{$in:users.map(u=>u.username)}}).sort({firstName:1}).lean());
}));
router.get('/grades', wrap(async(req,res)=>{
  const filter = {};
  if(req.user.role==='student') filter.studentCode=req.user.username;
  if(req.user.role==='teacher') {
    const courses=await Course.find({teacher:req.user.username}).lean();
    filter.courseId={$in:courses.map(c=>String(c.id))};
  }
  const grades=await Grade.find(filter).sort({term:-1,studentCode:1}).lean();
  const courses=await Course.find({id:{$in:grades.map(g=>Number(g.courseId))}}).lean();
  const byId=new Map(courses.map(c=>[String(c.id),c]));
  res.json(grades.map(g=>({...g,id:String(g._id),course:byId.get(g.courseId)})));
}));
router.put('/grades', authorizeRoles('teacher'), wrap(async(req,res)=>{
  const {courseId,term,entries}=req.body||{};
  if(typeof courseId!=='string'||!/^\d+$/.test(courseId)||typeof term!=='string'||!term.trim()||term.length>100||!Array.isArray(entries)||!entries.length||entries.length>100||entries.some(e=>!e||typeof e.studentCode!=='string'||!Number.isFinite(e.score)||e.score<0||e.score>100)||new Set(entries.map(e=>e.studentCode)).size!==entries.length) return res.status(400).json({message:'Хичээл, улирал, давхардаагүй оюутан, 0–100 оноо шаардлагатай.'});
  const course=await Course.findOne({id:Number(courseId),teacher:req.user.username}).lean();
  if(!course) return res.status(403).json({message:'Зөвхөн өөрийн заадаг хичээлийн дүнг оруулна.'});
  const selections=await Selection.find({courseId,status:'approved'}).lean();
  const users=await User.find({id:{$in:selections.map(s=>Number(s.studentId))},role:'student'}).lean();
  const codes=new Set(users.map(u=>u.username));
  if(entries.some(e=>!codes.has(e.studentCode))) return res.status(400).json({message:'Зөвхөн баталгаажсан сонголттой оюутны дүнг оруулна.'});
  await Grade.bulkWrite(entries.map(e=>({updateOne:{filter:{studentCode:e.studentCode,courseId,term:term.trim()},update:{$set:{score:e.score,markedBy:req.user.username}},upsert:true}})));
  res.json({message:'Дүн хадгалагдлаа.'});
}));
module.exports=router;
