require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('../models/Course');
const { Assessment } = require('../models/Assessment');
async function main() {
  await require('../config/db')();
  const courses = await Course.find({ teacher: { $ne: '' } }).sort({ id: 1 }).lean();
  const teachers = new Set();
  for (const course of courses) {
    if (teachers.has(course.teacher)) continue;
    teachers.add(course.teacher);
    for (const kind of ['assignment', 'exam']) {
      const title = kind === 'exam' ? 'Жишээ шалгалт — Мэдлэг бататгах' : 'Жишээ даалгавар — Бие даалтын тайлан';
      const description = kind === 'exam' ? '1. Хичээлээр үзсэн үндсэн гурван ойлголтыг тайлбарлана уу.\n2. Нэг бодит жишээн дээр хэрэглээг нь тайлбарлаарай.\n3. Хариугаа энд бичих эсвэл PDF / DOCX файлаар хавсаргана уу.\nҮнэлгээ: онол 40, жишээ 40, тайлбар 20 оноо.' : 'Хичээлээр үзсэн нэг сэдвээ сонгон 2–3 хуудас тайлан бэлтгэнэ үү.\nАгуулга: зорилго, онолын тайлбар, жишээ, дүгнэлт, эх сурвалж.\nТайлангаа PDF / DOCX эсвэл эх кодоо ZIP хэлбэрээр илгээнэ үү.';
      await Assessment.updateOne({ courseId: String(course.id), kind, title }, { $setOnInsert: { description, dueAt: new Date(Date.now() + 14 * 86400000), createdBy: course.teacher, attachment: { name: 'zaavar.txt', data: Buffer.from(description).toString('base64') } } }, { upsert: true });
    }
  }
  console.log(`Example assignment and exam ready for ${teachers.size} teachers.`);
}
main().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
