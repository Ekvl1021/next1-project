"use client";
import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';
import { useUser } from '../context/UserContext';
import type { Course, Student, OfficialGrade } from '../lib/types';
import StudentPlanner from './StudentPlanner';
import Icon from './Icon';
import EmptyState from './EmptyState';
function savedSelection(username?: string): { courseId?: string; term?: string } {
 if(typeof window==='undefined'||!username) return {};
 try { return JSON.parse(localStorage.getItem(`edura-gradebook-${username}`)||'{}'); } catch { return {}; }
}
const grade=(score:number)=>score>=95?['A+',4]:score>=90?['A',3.7]:score>=85?['B+',3.3]:score>=80?['B',3]:score>=75?['C+',2.7]:score>=70?['C',2.3]:score>=65?['D+',2]:score>=60?['D',1.7]:['F',0];
export default function Gradebook({courses}:{courses:Course[]}) {
 const {session}=useUser();
 const [rows,setRows]=useState<OfficialGrade[]>([]),[roster,setRoster]=useState<Student[]>([]),[courseId,setCourseId]=useState(()=>savedSelection(session?.name).courseId||''),[term,setTerm]=useState(()=>savedSelection(session?.name).term||'2026 Намар'),[scores,setScores]=useState<Record<string,string>>({}),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[calculator,setCalculator]=useState(false);
 const load=useCallback(async()=>{try{setRows(await apiRequest<OfficialGrade[]>('/api/academic/grades', { cache: 'no-store' }));setError('')}catch(e){setError(e instanceof Error?e.message:'Дүн татаж чадсангүй.')}finally{setLoading(false)}},[session?.name,session?.role]);
 useEffect(()=>{void load()},[load]);
 useEffect(()=>{
  if(session?.role!=='teacher'||!courses.length) return;
  if(!courses.some(c=>c.id===courseId)) {
   const recent=rows.find(r=>courses.some(c=>c.id===r.courseId));
   setCourseId(recent?.courseId||courses[0].id);
   if(recent) setTerm(recent.term);
  }
 },[session?.role,courses,courseId,rows]);
 useEffect(()=>{
  if(session?.role==='teacher'&&courseId&&courses.some(c=>c.id===courseId)) {
   localStorage.setItem(`edura-gradebook-${session.name}`,JSON.stringify({courseId,term:term.trim()}));
  }
 },[session?.name,session?.role,courseId,term,courses]);
 useEffect(()=>{
  if(session?.role!=='student') return;
  const refresh=()=>{if(document.visibilityState==='visible')void load()};
  window.addEventListener('focus',refresh);
  document.addEventListener('visibilitychange',refresh);
  const timer=window.setInterval(refresh,15000);
  return()=>{window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);window.clearInterval(timer)};
 },[session?.role,load]);
 useEffect(()=>{if(!courseId)return;let active=true;setLoading(true);apiRequest<Student[]>(`/api/academic/roster/${courseId}`).then(data=>{if(active)setRoster(data)}).catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[courseId]);
 useEffect(()=>{setScores(Object.fromEntries(rows.filter(r=>r.courseId===courseId&&r.term===term.trim()).map(r=>[r.studentCode,String(r.score)])))},[rows,courseId,term]);
 async function save(){setBusy(true);setError('');setMessage('');try{const entries=Object.entries(scores).filter(([code,value])=>value!==''&&roster.some(s=>s.code===code)).map(([studentCode,score])=>({studentCode,score:Number(score)}));if(!entries.length)throw new Error('Оюутны оноог оруулна уу.');await apiRequest('/api/academic/grades',{method:'PUT',body:JSON.stringify({courseId,term:term.trim(),entries})});await load();setMessage('Дүн хадгалагдлаа. Оюутны дүнгийн мэдээлэлд харагдана.')}catch(e){setError(e instanceof Error?e.message:'Дүн хадгалж чадсангүй.')}finally{setBusy(false)}}
 const credits=rows.reduce((n,r)=>n+(r.course?.credits||3),0),gpa=credits?rows.reduce((n,r)=>n+(r.course?.credits||3)*Number(grade(r.score)[1]),0)/credits:0;
 return <>{error&&<p className="sg-error" role="alert">{error}</p>}{message&&<p className="sg-success" role="status">{message}</p>}{session?.role==='teacher'?<><section className="sg-panel"><div className="sg-panel-toolbar"><div><h2>Хичээлийн дүн оруулах</h2><p>Зөвхөн таны хичээлийг сонгож, админаар батлуулсан оюутнууд.</p></div></div><div className="sg-form-fields"><div className="sg-form-row"><label>Миний заадаг хичээл<select value={courseId} onChange={e=>{setCourseId(e.target.value);setMessage('');setRoster([])}}><option value="">Хичээлээ сонгоно уу</option>{courses.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label><label>Улирал<input list="gradebook-terms" maxLength={100} value={term} onChange={e=>setTerm(e.target.value)} onBlur={()=>setTerm(value=>value.trim())}/><datalist id="gradebook-terms">{[...new Set(["2026 Намар", "2027 Хавар", ...rows.map(r=>r.term)])].map(value=><option key={value} value={value}/>)}</datalist></label></div></div>{courseId&&(loading?<p className="sg-loading">Оюутнуудыг ачаалж байна…</p>:roster.length?<><div className="sg-table-scroll"><table className="sg-table"><thead><tr><th>Оюутан</th><th>Оюутны код</th><th>Оноо / 100</th><th>Үсгэн дүн</th></tr></thead><tbody>{roster.map(s=><tr key={s.id}><td>{s.lastName} {s.firstName}</td><td>{s.code}</td><td><input className="portal-score" type="number" min={0} max={100} step={0.1} aria-label={`${s.code} оноо`} value={scores[s.code]??''} onChange={e=>setScores(current=>({...current,[s.code]:e.target.value}))}/></td><td>{scores[s.code]!==undefined&&scores[s.code]!==''?grade(Number(scores[s.code]))[0]:'—'}</td></tr>)}</tbody></table></div><div className="sg-dialog-actions"><button className="sg-button sg-primary" disabled={busy||!term.trim()} onClick={()=>void save()}>{busy?'Хадгалж байна…':'Дүн хадгалах'}</button></div></>:<EmptyState icon="users" title="Баталгаажсан оюутан алга" text="Хичээл сонголтыг админ баталсны дараа оюутнууд энд харагдана."/>)}</section><section className="sg-panel"><div className="sg-panel-toolbar"><div><h2>Хадгалсан дүнгийн бүртгэл</h2><p>Таны оруулсан үнэлгээ. Хуудаснаас гараад буцаж ороход серверээс дахин уншина.</p></div><button className="sg-button sg-secondary" disabled={busy} onClick={()=>void load()}><Icon name="refresh"/>Дүн шинэчлэх</button></div>{rows.length?<div className="sg-table-scroll"><table className="sg-table"><thead><tr><th>Оюутны код</th><th>Хичээл</th><th>Улирал</th><th>Оноо</th><th>Үсгэн дүн</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.studentCode}</td><td><strong>{r.course?.title||r.courseId}</strong></td><td>{r.term}</td><td>{r.score}</td><td><span className="sg-grade-point">{grade(r.score)[0]}</span></td></tr>)}</tbody></table></div>:<p className="sg-day-empty">Хадгалсан үнэлгээ хараахан алга.</p>}</section></>:<><div className="portal-stat-grid"><article><Icon name="book"/><span>НИЙТ КРЕДИТ</span><strong>{credits}</strong></article><article><Icon name="cap"/><span>ГОЛЧ ДҮН (GPA)</span><strong>{credits?gpa.toFixed(2):'—'}</strong></article><article><Icon name="check"/><span>ҮНЭЛГЭЭТЭЙ ХИЧЭЭЛ</span><strong>{rows.length}</strong></article></div><section className="sg-panel"><div className="sg-panel-toolbar"><div><h2>Багшийн оруулсан дүн</h2><p>Таны нэвтрэх код: {session?.name}. Зөвхөн энэ кодод бүртгэсэн багшийн дүн харагдана.</p></div><button className="sg-button sg-secondary" onClick={()=>void load()}><Icon name="refresh"/>Шинэчлэх</button></div>{loading?<p className="sg-loading">Дүн ачаалж байна…</p>:rows.length?<div className="sg-table-scroll"><table className="sg-table"><thead><tr><th>Хичээлийн код</th><th>Хичээл</th><th>Улирал</th><th>Кредит</th><th>Оноо</th><th>Үнэлгээ</th><th>Багш</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td><code>{r.course?.code||'—'}</code></td><td><strong>{r.course?.title||'Хичээл'}</strong></td><td>{r.term}</td><td>{r.course?.credits||3}</td><td>{r.score}</td><td><span className="sg-grade-point">{grade(r.score)[0]}</span></td><td>{r.markedBy}</td></tr>)}</tbody></table></div>:<EmptyState icon="chart" title="Дүн хараахан ороогүй байна" text={`${session?.name} кодтой оюутанд багш дүн оруулаагүй байна. Өөр кодод оруулсан үнэлгээ тухайн оюутны бүртгэлд харагдана.`}/>}</section><section className="portal-calculator"><button className="portal-calculator-toggle" onClick={()=>setCalculator(v=>!v)} aria-expanded={calculator}><span><Icon name="chart"/>Хувийн голч тооцоолуур</span><span>{calculator?'Хаах':'Нээх'}</span></button><p>Өмнө үзсэн хичээлийн оноогоо өөрөө оруулж тооцоолно. Оруулсан мэдээлэл таны бүртгэлд хадгалагдана.</p>{calculator&&<StudentPlanner key={session?.name} courses={courses} view="grades"/>}</section></>}</>;
}
