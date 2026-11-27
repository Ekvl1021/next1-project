require('dotenv').config();
const fs=require('node:fs');
const path=require('node:path');
const mongoose=require('mongoose');
const Course=require('../models/Course');
const Teacher=require('../models/Teacher');
const {sessionsFor}=require('../services/schedule');
const titles=[
 ['Мэргэжлийн удиртгал','Алгоритм, программчлалын үндэс','Дээд математик-1','Англи хэл-1','Компьютер, тооцоолох системийн үндэс'],
 ['Объект хандалтат программчлал','Дээд математик-2','Дискрет математик','Англи хэл-2','Монгол хэл, найруулга зүй'],
 ['Өгөгдлийн бүтэц ба алгоритм','Өгөгдлийн сангийн систем','Компьютерын архитектур','Магадлал ба статистик','Мэргэжлийн англи хэл'],
 ['Үйлдлийн систем','Компьютерын сүлжээ','Программ хангамжийн инженерчлэл','Веб программчлалын үндэс','Системийн шинжилгээ ба зохиомж'],
 ['Веб систем ба технологи','Мобайл программчлал','Программ хангамжийн шаардлагын шинжилгээ','Хүн-компьютерын харилцаа','Мэдээллийн аюулгүй байдал'],
 ['Программ хангамжийн тестлэл','Тархмал систем','Хиймэл оюун ухааны үндэс','Программ хангамжийн архитектур','Багийн төсөл'],
 ['Үүлэн тооцоолол','Машин сургалт','DevOps ба тасралтгүй хүргэлт','Үйлдвэрлэлийн дадлага','Судалгааны арга зүй'],
 ['Төгсөлтийн төсөл','Өгөгдлийн шинжилгээ','Программ хангамжийн төслийн менежмент','Мэргэжлийн ёс зүй','Сонгон: IoT систем']
];
async function main(){
 await require('../config/db')();
 const existing=await Course.find().lean(), teachers=await Teacher.find().sort({id:1}).lean();
 fs.mkdirSync(path.join(__dirname,'../reports'),{recursive:true});
 fs.writeFileSync(path.join(__dirname,`../reports/curriculum-before-${Date.now()}.json`),JSON.stringify({courses:existing,teachers},null,2));
 let maxId=Math.max(0,...existing.map(c=>c.id)), added=0;
 const preferred=['teacher1','rege','Mijiddorj','Ulambayar'].filter(name=>teachers.some(t=>t.username===name));
 const assigned=preferred.length?preferred:teachers.map(t=>t.username);
 if(!assigned.length)throw new Error('No existing teachers.');
 const slots=['08:00','09:40','11:20','13:20','15:00','16:40'];
 for(let term=0;term<titles.length;term++){
  for(let i=0;i<titles[term].length;i++){
   const title=titles[term][i],year=Math.floor(term/2)+1;
   const found=existing.find(c=>c.title===title);
   const metadata={code:`M.${i===2?'CS':'SW'}${year}${String(term*5+i+1).padStart(2,'0')}`,credits:3,year,semester:term+1,category:year===1?'Ерөнхий суурь':year===4?'Мэргэшүүлэх':'Мэргэжлийн суурь'};
   if(found){
    const update={...metadata};
    if(!found.sessions?.length&&sessionsFor(found).length)update.sessions=sessionsFor(found);
    await Course.updateOne({id:found.id},{$set:update});
   }else{
    const n=term*5+i,day=n%5,start=slots[Math.floor(n/5)%slots.length];
    const min=Number(start.slice(0,2))*60+Number(start.slice(3))+90;
    const end=`${String(Math.floor(min/60)).padStart(2,'0')}:${String(min%60).padStart(2,'0')}`;
    const room=`${['A','B','C','D'][Math.floor(n/30)]}-${201+n%5}`;
    const teacher=assigned[Math.floor(n/5)%assigned.length];
    const sessions=[{day,start,end,room,kind:'Лекц'}];
    await Course.create({id:++maxId,title,teacher,...metadata,sessions,room,schedule:`${['Даваа','Мягмар','Лхагва','Пүрэв','Баасан'][day]} ${start}–${end}`});added++;
   }
  }
 }
 const names={'teacher1':'Б. Энхтүвшин','rege':'Д. Рэгзэдмаа','Mijiddorj':'Р. Мижиддорж','Ulambayar':'Б. Уламбаяр'};
 for(let i=0;i<teachers.length;i++){
  const teacher=teachers[i];
  await Teacher.updateOne({id:teacher.id},{$set:{displayName:teacher.displayName||names[teacher.username]||teacher.username,photo:teacher.photo||`/teachers/profile-${i%4+1}.jpg`,department:teacher.department||'Мэдээллийн технологийн тэнхим',position:teacher.position||'Ахлах багш',office:teacher.office||`A-${301+i}`,bio:teacher.bio||'Программ хангамж, мэдээллийн технологийн чиглэлээр хичээл зааж, оюутны төсөл болон дадлагын ажлыг удирдана.'}});
 }
 console.log(JSON.stringify({added,total:await Course.countDocuments(),teachers:teachers.length,years:await Course.aggregate([{$group:{_id:'$year',count:{$sum:1},credits:{$sum:'$credits'}}}])},null,2));
 await mongoose.disconnect();
}
main().catch(async e=>{console.error(e.message);await mongoose.disconnect();process.exitCode=1});
