require('dotenv').config();
const mongoose=require('mongoose');
const fs=require('node:fs');
const path=require('node:path');
const Student=require('../models/Student');
const names=['Амин-Эрдэнэ','Анужин','Билгүүн','Бат-Оргил','Мөнхжин','Төгөлдөр','Хулан','Энхжин','Тэмүүлэн','Нандин-Эрдэнэ','Мөнх-Эрдэнэ','Сондор','Тэнүүн','Ундрал','Марал','Ирмүүн','Хүслэн','Эгшиглэн','Баясгалан','Гүнбилэг','Мишээл','Ананд','Саруул','Оюундарь','Энэрэл','Тэлмэн','Гэрэлмаа','Түшиг','Есүй','Хангай','Аялгуу','Номуун','Хосбаяр','Цэлмэг','Дөлгөөн','Баярмаа','Мөнхтулга','Сувд','Золбоо','Номин'];
const parents=['Бат','Энхболд','Ганболд','Мөнхбат','Баярсайхан','Дорж','Эрдэнэ','Төмөрбаатар','Алтангэрэл','Болд','Батсайхан'];
async function main(){
 await require('../config/db')();
 await Student.init();
 const before=await Student.find().lean();
 fs.mkdirSync(path.join(__dirname,'../reports'),{recursive:true});
 fs.writeFileSync(path.join(__dirname,`../reports/students-before-expansion-${Date.now()}.json`),JSON.stringify(before,null,2));
 let id=Math.max(0,...before.map(s=>s.id)),added=0;
 // Connect the existing demo login to its student profile without changing accounts.
 if(!await Student.exists({code:'student1'})){
  await Student.create({id:++id,code:'student1',firstName:'Энхжин',lastName:'Бат',email:'student1@edura.example',program:'Программ хангамж'});added++;
 }
 for(let i=0;await Student.countDocuments()<40 && i<names.length;i++){
  const code=`ST${2023+i%4}${String(101+i).padStart(3,'0')}`;
  if(await Student.exists({code}))continue;
  await Student.create({id:++id,code,firstName:names[i],lastName:parents[i%parents.length],email:`${code.toLowerCase()}@edura.example`,program:'Программ хангамж'});added++;
 }
 const total=await Student.countDocuments();
 const report={generatedAt:new Date().toISOString(),before:before.length,added,total,source:'Сургалтын жишээ оюутны бүртгэл. Нэвтрэх данс болон хичээл сонголт автоматаар үүсгээгүй.'};
 fs.writeFileSync(path.join(__dirname,'../reports/student-expansion.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));await mongoose.disconnect();
}
main().catch(async e=>{console.error(e.message);await mongoose.disconnect();process.exitCode=1});
