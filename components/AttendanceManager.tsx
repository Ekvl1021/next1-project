"use client";
import { useEffect, useRef, useState } from 'react';
import { useUser } from '../context/UserContext';
import { apiRequest } from '../lib/api';
import type { Course, Student } from '../lib/types';
import Icon from './Icon';
import EmptyState from './EmptyState';
type Status='present'|'absent'|'late'|'excused';
type AttendanceRecord={courseId:string;courseTitle:string;studentCode:string;studentName:string;date:string;status:Status};
const labels:Record<Status,string>={present:'Ирсэн',absent:'Тасалсан',late:'Хоцорсон',excused:'Чөлөөтэй'};
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ulaanbaatar'}).format(new Date());
export default function AttendanceManager({courses}:{courses:Course[];students:Student[]}){
 const {session}=useUser();
 const version=useRef(0);
 const [courseId,setCourseId]=useState(''),[date,setDate]=useState(today),[roster,setRoster]=useState<Student[]>([]),[records,setRecords]=useState<AttendanceRecord[]>([]),[statuses,setStatuses]=useState<Record<string,Status|''|'unmark'>>({}),[loading,setLoading]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const manageable=courses.filter(c=>c.teacher.toLowerCase()===session?.name.toLowerCase());
 useEffect(()=>{
  const request=++version.current;
  setRoster([]);setRecords([]);setStatuses({});setError('');setMessage('');
  if(!courseId||!date){setLoading(false);return;}
  let active=true;
  setLoading(true);
  Promise.all([apiRequest<{data:AttendanceRecord[]}>(`/api/attendance?${new URLSearchParams({courseId,date})}`,{cache:'no-store'}),apiRequest<Student[]>(`/api/academic/roster/${courseId}`,{cache:'no-store'})]).then(([result,students])=>{if(active&&request===version.current){setRoster(students);setRecords(result.data);setStatuses(Object.fromEntries(result.data.map(r=>[r.studentCode,r.status])))}}).catch(e=>{if(active&&request===version.current)setError(e.message)}).finally(()=>{if(active&&request===version.current)setLoading(false)});
  return()=>{active=false};
 },[courseId,date]);
 async function save(){
  if(saving||loading||!courseId||!date)return;
  const entries=Object.entries(statuses).filter(([code,status])=>status&&roster.some(s=>s.code===code)).map(([studentCode,status])=>({studentCode,status:status==='unmark'?null:status}));
  if(!entries.length){setError('Хадгалахын өмнө оюутны ирцийг тэмдэглэнэ үү.');return;}
  setSaving(true);setError('');setMessage('');
  try{const saved=await apiRequest<{data:AttendanceRecord[]}>('/api/attendance',{method:'PUT',body:JSON.stringify({courseId,date,entries})});setRecords(saved.data);setStatuses(Object.fromEntries(saved.data.map(r=>[r.studentCode,r.status])));setMessage(`${date} өдрийн ${entries.length} оюутны ирц хадгалагдлаа.`)}catch(e){setError(e instanceof Error?e.message:'Ирц хадгалж чадсангүй.')}finally{setSaving(false)}
 }
 if(session?.role!=='teacher')return <EmptyState title="Багшийн ирцийн бүртгэл" text="Зөвхөн тухайн хичээлийн багш ирц бүртгэнэ."/>;
 const chosen=manageable.find(c=>c.id===courseId);
 const marked=roster.filter(s=>statuses[s.code]&&statuses[s.code]!=='unmark').length;
 return <section className="sg-panel portal-attendance"><div className="sg-panel-toolbar"><div><h2>Ирц бүртгэх</h2><p>Өөрийн заадаг хичээл, огноогоо сонгоод баталгаажсан оюутнуудын ирцийг тэмдэглэнэ.</p></div><span className="sg-count">{manageable.length} хичээл</span></div>
 <div className="portal-attendance-filters"><label><span>Хичээл</span><select aria-label="Ирц бүртгэх хичээл" value={courseId} disabled={saving} onChange={e=>setCourseId(e.target.value)}><option value="">Хичээл сонгох</option>{manageable.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label><label><span>Ирцийн огноо</span><input aria-label="Ирцийн огноо" type="date" required value={date} disabled={saving} onChange={e=>setDate(e.target.value)}/></label></div>
 {error&&<p className="sg-error" role="alert">{error}</p>}{message&&<p className="sg-success" role="status"><Icon name="check"/>{message}</p>}
 {!courseId?<EmptyState icon="calendar" title="Хичээл, огноогоо сонгоно уу" text="Сонгосон хичээлийн баталгаажсан оюутнууд болон өмнө хадгалсан ирц энд харагдана."/>:loading?<div className="sg-skeleton" role="status" aria-label="Ирц ачаалж байна"><i/><i/></div>:!roster.length?<EmptyState icon="users" title="Баталгаажсан оюутан алга" text="Админ энэ хичээлийн сонголтыг баталсны дараа оюутнуудын ирцийг бүртгэнэ."/>:<><div className="portal-attendance-summary"><div><strong>{chosen?.title}</strong><span>{roster.length} оюутан · {marked} тэмдэглэсэн · {date}</span></div><button type="button" className="sg-button sg-secondary" disabled={saving} onClick={()=>setStatuses(Object.fromEntries(roster.map(s=>[s.code,'present'])))}>Бүгд ирсэн</button></div><div className="sg-table-scroll"><table className="sg-table"><thead><tr><th>Оюутан</th><th>Оюутны код</th><th>Ирцийн төлөв</th></tr></thead><tbody>{roster.map(s=><tr key={s.code}><td><strong>{s.lastName} {s.firstName}</strong></td><td>{s.code}</td><td><select aria-label={`${s.code} ирц`} value={statuses[s.code]||''} disabled={saving} onChange={e=>setStatuses(current=>({...current,[s.code]:e.target.value as Status|''|'unmark'}))}><option value="">Бүртгээгүй</option>{records.some(r=>r.studentCode===s.code)&&<option value="unmark">Ирцийг цуцлах</option>}{Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></td></tr>)}</tbody></table></div><div className="sg-dialog-actions"><button className="sg-button sg-primary" disabled={saving||!marked&&!Object.values(statuses).includes('unmark')} onClick={()=>void save()}>{saving?'Хадгалж байна…':'Ирц хадгалах'}</button></div></>}
 </section>;
}
