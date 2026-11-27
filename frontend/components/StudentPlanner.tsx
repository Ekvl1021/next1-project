"use client";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { apiRequest } from "../lib/api";
import type { Course, GradeEntry, PlannerData, PlannerTask, ScheduleEntry } from "../lib/types";
import Icon from "./Icon";
import Modal from "./Modal";
import EmptyState from "./EmptyState";
type Tab = "schedule" | "tasks" | "grades";
type EditKind = Tab;
type Entry = ScheduleEntry | PlannerTask | GradeEntry;
type Edit = { kind: EditKind; record?: Entry; day?: number; remove?: boolean; course?: Course } | null;
const days = ["Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба", "Ням"];
const priorities = { low: "Бага", normal: "Энгийн", high: "Чухал" };
const kinds = { assignment: "Даалгавар", exam: "Шалгалт", personal: "Хувийн ажил" };
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ulaanbaatar" });
const dateLabel = (value: string) => new Date(value + "T00:00:00Z").toLocaleDateString("mn-MN", { month: "short", day: "numeric", timeZone: "UTC" });
const gradeForScore = (score: number) => {
  if (score >= 95) return { letter: "A+", point: 4 };
  if (score >= 90) return { letter: "A", point: 3.7 };
  if (score >= 85) return { letter: "B+", point: 3.3 };
  if (score >= 80) return { letter: "B", point: 3 };
  if (score >= 75) return { letter: "C+", point: 2.7 };
  if (score >= 70) return { letter: "C", point: 2.3 };
  if (score >= 65) return { letter: "D+", point: 2 };
  if (score >= 60) return { letter: "D", point: 1.7 };
  return { letter: "F", point: 0 };
};
export default function StudentPlanner({ courses, view = "tasks" }: { courses: Course[]; view?: Tab }) {
  const tab = view;
  const [data, setData] = useState<PlannerData>({ schedule: [], tasks: [], grades: [] });
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [edit, setEdit] = useState<Edit>(null);
  const [taskFilter, setTaskFilter] = useState("pending");
  const [term, setTerm] = useState("");
  useEffect(() => {
    let active = true;
    apiRequest<PlannerData>("/api/planner").then(value => { if (active) setData(value); }).catch(cause => { if (active) { setError(cause.message); setFailed(true); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  async function reload() {
    setLoading(true); setError("");
    try { setData(await apiRequest<PlannerData>("/api/planner")); setFailed(false); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Төлөвлөгөө татаж чадсангүй."); setFailed(true); }
    finally { setLoading(false); }
  }
  async function persist(next: PlannerData) {
    setSaving(true); setError(""); setMessage("");
    try { setData(await apiRequest<PlannerData>("/api/planner", { method: "PATCH", body: JSON.stringify({ [tab === "grades" ? "grades" : tab === "tasks" ? "tasks" : "schedule"]: next[tab === "grades" ? "grades" : tab === "tasks" ? "tasks" : "schedule"] }) })); setTerm(current => next.grades.some(grade => grade.term === current) ? current : ""); setMessage("Өөрчлөлт хадгалагдлаа."); return true; }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Хадгалж чадсангүй."); return false; }
    finally { setSaving(false); }
  }
  function open(kind: EditKind, record?: Entry, day?: number, remove = false) { setError(""); setMessage(""); setEdit({ kind, record, day, remove }); }
  function addSuggestedCourse(course: Course) {
    setError("");
    setMessage("");
    setEdit({ kind: "schedule", course });
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!edit || saving) return;
    const form = new FormData(event.currentTarget);
    const value = (key: string) => String(form.get(key) || "").trim();
    if (edit.remove) {
      const next = { ...data, [edit.kind]: data[edit.kind].filter(row => row.id !== edit.record?.id) };
      if (await persist(next)) setEdit(null); return;
    }
    const id = edit.record?.id || crypto.randomUUID();
    let record: Entry;
    if (edit.kind === "schedule") {
      record = { id, title: value("title"), day: Number(value("day")), start: value("start"), end: value("end"), room: value("room") };
      if (record.end <= record.start) { setError("Дуусах цаг нь эхлэх цагаас хойш байх ёстой."); return; }
      const collision = data.schedule.find(row => row.id !== id && row.day === (record as ScheduleEntry).day && row.start < (record as ScheduleEntry).end && row.end > (record as ScheduleEntry).start);
      if (collision) { setError(`“${collision.title}” хичээлийн ${collision.start}–${collision.end} цагтай давхцаж байна.`); return; }
    } else if (edit.kind === "tasks") {
      record = { id, title: value("title"), due: value("due"), priority: value("priority") as PlannerTask["priority"], kind: value("kind") as PlannerTask["kind"], done: (edit.record as PlannerTask | undefined)?.done || false };
    } else {
      const score = Number(value("score"));
      record = { id, title: value("title"), credits: Number(value("credits")), score, ...gradeForScore(score), term: value("term") };
    }
    const list = data[edit.kind] as Entry[];
    const next = { ...data, [edit.kind]: edit.record ? list.map(row => row.id === id ? record : row) : [...list, record] };
    if (await persist(next as PlannerData)) setEdit(null);
  }
  const filteredTasks = useMemo(() => data.tasks.filter(task => taskFilter === "all" || (taskFilter === "done" ? task.done : !task.done)).sort((a, b) => a.due.localeCompare(b.due)), [data.tasks, taskFilter]);
  const completed = data.tasks.filter(task => task.done).length;
  const pending = data.tasks.length - completed;
  const terms = [...new Set(data.grades.map(grade => grade.term))];
  const grades = data.grades.filter(grade => !term || grade.term === term);
  const credits = grades.reduce((sum, grade) => sum + grade.credits, 0);
  const gpa = credits ? grades.reduce((sum, grade) => sum + grade.credits * grade.point, 0) / credits : null;
  const suggestedCourses = courses;
  const currentSchedule = edit?.kind === "schedule" ? edit.record as ScheduleEntry | undefined : undefined;
  const currentTask = edit?.kind === "tasks" ? edit.record as PlannerTask | undefined : undefined;
  const currentGrade = edit?.kind === "grades" ? edit.record as GradeEntry | undefined : undefined;
  function fillCourse(event: React.ChangeEvent<HTMLSelectElement>) {
    const course = courses.find(item => item.id === event.target.value);
    if (!course) return;
    const form = event.currentTarget.form;
    const title = form?.elements.namedItem("title") as HTMLInputElement | null;
    const room = form?.elements.namedItem("room") as HTMLInputElement | null;
    if (title) title.value = course.title;
    if (room) room.value = course.room;
  }
  if (loading) return <div className="sg-skeleton" role="status" aria-label="Төлөвлөгөө ачаалж байна"><i /><i /><i /></div>;
  if (failed) return <div className="sg-panel"><EmptyState icon="calendar" title="Төлөвлөгөө ачаалж чадсангүй" text={error} action="Дахин оролдох" onAction={() => void reload()} /></div>;
  const title = edit?.remove ? "Бичлэг устгах" : edit?.kind === "schedule" ? currentSchedule ? "Хуваарь засах" : "Хуваарь нэмэх" : edit?.kind === "tasks" ? currentTask ? "Төлөвлөгөө засах" : "Шинэ төлөвлөгөө" : currentGrade ? "Үнэлгээ засах" : "Үнэлгээ нэмэх";
  return <div className="sg-planner">
    <div className="sg-planner-intro"><div><span className="sg-planner-intro-icon"><Icon name={tab === "schedule" ? "calendar" : tab === "grades" ? "chart" : "book"} size={28} /></span><div><h2>{tab === "schedule" ? "Миний хуваарь" : tab === "grades" ? "Дүнгийн мэдээлэл" : "Санал болгох төлөвлөгөө"}</h2><p>{tab === "schedule" ? "Хичээл болон хувийн ажлын долоо хоногийн хуваарь." : tab === "grades" ? "Өмнө үзсэн хичээлийн дүн болон голчоо хараарай." : "Даалгавар болон суралцах ажлаа төлөвлөөрэй."}</p></div></div><span className="sg-save-status" role="status">{saving ? "Хадгалж байна…" : message || "Таны бүртгэлд хадгалагдана"}</span></div>
    {error && !edit && <p className="sg-error" role="alert">{error}</p>}
    <section>
      {tab === "schedule" && <><div className="sg-section-bar"><div><h2>Долоо хоногийн хуваарь</h2><p>Хичээлийн цаг давхцахаас сэргийлж төлөвлөөрэй.</p></div><button className="sg-button sg-primary" onClick={() => open("schedule")}><Icon name="plus" />Хуваарь нэмэх</button></div><div className="sg-panel"><div className="sg-panel-toolbar"><div><h2>Санал болгох хичээлүүд</h2><p>Хичээлээ сонгоод хувийн хуваарьтаа төлөвлөөрэй.</p></div></div>{suggestedCourses.length ? <ul className="sg-task-list">{suggestedCourses.map(course => <li key={course.id}><div className="sg-task-body"><strong>{course.title}</strong><div><span>{course.schedule || "Хуваарийн мэдээлэл оруулаагүй"}</span><span>{course.room}</span></div></div><button className="sg-button sg-secondary" onClick={() => addSuggestedCourse(course)}>Хуваарьт нэмэх</button></li>)}</ul> : <p className="sg-day-empty">Санал болгох хичээл алга.</p>}</div><div className="sg-week-scroll"><div className="sg-week-grid">{days.map((day, index) => <div className="sg-day" key={day}><div className="sg-day-header"><h3>{day}</h3><button className="sg-icon-button" aria-label={`${day} хуваарь нэмэх`} onClick={() => open("schedule", undefined, index)}><Icon name="plus" size={17} /></button></div><div className="sg-day-events">{data.schedule.filter(entry => entry.day === index).sort((a, b) => a.start.localeCompare(b.start)).map((entry, n) => <article className={`sg-event sg-event-tone-${n % 3}`} key={entry.id}><button className="sg-event-main" onClick={() => open("schedule", entry)}><span><Icon name="clock" size={13} />{entry.start}–{entry.end}</span><strong>{entry.title}</strong><small>{entry.room || "Өрөө оруулаагүй"}</small></button><button className="sg-event-remove" aria-label={`${entry.title} хуваарь устгах`} onClick={() => open("schedule", entry, undefined, true)}><Icon name="trash" size={14} /></button></article>)}{!data.schedule.some(entry => entry.day === index) && <p className="sg-day-empty">Хуваарьгүй</p>}</div></div>)}</div></div></>}
      {tab === "tasks" && <><div className="sg-section-bar"><div><h2>Хийх ажлуудаа цэгцэлье</h2><p>{data.tasks.length ? `${data.tasks.length} ажлаас ${completed} нь дууссан` : "Даалгавар, шалгалт болон хувийн ажлаа нэмээрэй."}</p></div><button className="sg-button sg-primary" onClick={() => open("tasks")}><Icon name="plus" />Төлөвлөгөө нэмэх</button></div>{data.tasks.length > 0 && <div className="sg-progress-track" role="progressbar" aria-label="Гүйцэтгэсэн ажлын хувь" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(completed / data.tasks.length * 100)}><span style={{ width: `${completed / data.tasks.length * 100}%` }} /></div>}<div className="sg-task-filters" role="group" aria-label="Ажлын төлөвөөр шүүх">{[["pending", "Хийх", pending], ["done", "Дууссан", completed], ["all", "Бүгд", data.tasks.length]].map(([value, label, count]) => <button key={value} className={taskFilter === value ? "is-active" : ""} onClick={() => setTaskFilter(String(value))}>{label} <span>{count}</span></button>)}</div><div className="sg-panel">{filteredTasks.length ? <ul className="sg-task-list">{filteredTasks.map(task => <li key={task.id} className={task.done ? "is-done" : ""}><input type="checkbox" checked={task.done} disabled={saving} aria-label={`${task.title} ${task.done ? "хийхээр тэмдэглэх" : "дууссанаар тэмдэглэх"}`} onChange={() => void persist({ ...data, tasks: data.tasks.map(row => row.id === task.id ? { ...row, done: !row.done } : row) })} /><div className="sg-task-body"><button onClick={() => open("tasks", task)}>{task.title}</button><div><span>{kinds[task.kind]}</span><span className={!task.done && task.due < today() ? "sg-overdue" : ""}>{dateLabel(task.due)}{!task.done && task.due < today() ? " · Хугацаа өнгөрсөн" : ""}</span></div></div><span className={`sg-priority sg-priority-${task.priority}`}>{priorities[task.priority]}</span><button className="sg-icon-button" onClick={() => open("tasks", task)} aria-label={`${task.title} засах`}><Icon name="edit" size={17} /></button><button className="sg-icon-button sg-danger-icon" onClick={() => open("tasks", task, undefined, true)} aria-label={`${task.title} устгах`}><Icon name="trash" size={17} /></button></li>)}</ul> : <EmptyState icon="check" title={taskFilter === "done" ? "Дууссан ажил хараахан алга" : taskFilter === "pending" && completed ? "Бүх ажлаа дуусгалаа" : "Эхний төлөвлөгөөгөө нэмээрэй"} text="Хийх зүйлээ бичээд, дууссан үед нь тэмдэглээрэй." action="Төлөвлөгөө нэмэх" onAction={() => open("tasks")} />}</div></>}
      {tab === "grades" && <><div className="sg-section-bar"><div><h2>Кредитээр жигнэсэн голч</h2><p>Өмнө үзсэн хичээлийн хувийн оноог оруулж, үсгэн дүн болон голчоо автоматаар бодоорой.</p></div><button className="sg-button sg-primary" onClick={() => open("grades")}><Icon name="plus" />Үнэлгээ нэмэх</button></div><div className="sg-gpa-summary"><div className="sg-gpa-main"><span>ГОЛЧ ДҮН</span><strong>{gpa === null ? "—" : gpa.toFixed(2)}<small>/ 4.00</small></strong><p>{term || "Бүх улирлын дүн"}</p></div><div><span>НИЙТ КРЕДИТ</span><strong>{credits}</strong><p>Сонгосон хичээлүүдийн нийлбэр</p></div><div><span>ХИЧЭЭЛИЙН ТОО</span><strong>{grades.length}</strong><p>Үнэлгээ оруулсан хичээл</p></div></div><section className="sg-panel"><div className="sg-panel-toolbar"><div><h2>Хичээлийн үнэлгээнүүд</h2><p>Зөвхөн таны оруулсан үнэлгээгээр тооцно.</p></div><select aria-label="Улирлаар шүүх" value={term} onChange={event => setTerm(event.target.value)}><option value="">Бүх улирал</option>{terms.map(value => <option key={value}>{value}</option>)}</select></div>{grades.length ? <div className="sg-table-scroll"><table className="sg-table"><thead><tr><th>Хичээл</th><th>Улирал</th><th>Кредит</th><th>Оноо / үсгэн дүн</th><th><span className="sg-sr-only">Үйлдэл</span></th></tr></thead><tbody>{grades.map(grade => <tr key={grade.id}><td><strong>{grade.title}</strong></td><td>{grade.term}</td><td>{grade.credits}</td><td><span className="sg-grade-point">{grade.score}% · {grade.letter} ({grade.point.toFixed(1)})</span></td><td><div className="sg-row-actions"><button className="sg-icon-button" onClick={() => open("grades", grade)} aria-label={`${grade.title} үнэлгээ засах`}><Icon name="edit" size={17} /></button><button className="sg-icon-button sg-danger-icon" onClick={() => open("grades", grade, undefined, true)} aria-label={`${grade.title} үнэлгээ устгах`}><Icon name="trash" size={17} /></button></div></td></tr>)}</tbody></table></div> : <EmptyState icon="cap" title="Үнэлгээгээ оруулаад эхэлье" text="Оноогоо оруулмагц үсгэн дүн болон кредитийн жинтэй голч автоматаар бодогдоно." action="Үнэлгээ нэмэх" onAction={() => open("grades")} />}</section><details className="sg-formula"><summary>Оноо хэрхэн хөрвүүлж, голч бодох вэ?</summary><p>A+ 95–100 = 4.0; A 90–94 = 3.7; B+ 85–89 = 3.3; B 80–84 = 3.0; C+ 75–79 = 2.7; C 70–74 = 2.3; D+ 65–69 = 2.0; D 60–64 = 1.7; F 0–59 = 0.0. Голч = Σ (кредит × онооны дүйцүүлэлт) ÷ нийт кредит.</p></details></>}
    </section>
    <Modal open={!!edit} title={title} busy={saving} onClose={() => setEdit(null)}><form onSubmit={submit} key={`${edit?.kind}-${edit?.record?.id || "new"}-${edit?.day ?? ""}-${edit?.remove}`}>
      {edit?.remove ? <p className="sg-delete-description"><strong>{edit.record?.title}</strong> бичлэгийг устгах уу?</p> : <div className="sg-form-fields">
        {courses.length > 0 && edit?.kind !== "tasks" && <label>Бүртгэлтэй хичээлээс сонгох <span className="sg-optional">заавал биш</span><select defaultValue={edit?.course?.id || ""} onChange={fillCourse}><option value="">Гараар нэр оруулах</option>{courses.map(course => <option value={course.id} key={course.id}>{course.title}</option>)}</select></label>}
        <label>{edit?.kind === "tasks" ? "Ажлын нэр" : "Хичээлийн нэр"}<input name="title" required maxLength={200} defaultValue={edit?.course?.title || edit?.record?.title} placeholder={edit?.kind === "tasks" ? "Жишээ: Лабораторийн тайлан бичих" : "Жишээ: Веб систем ба технологи"} /></label>
        {edit?.kind === "schedule" && <><label>Өдөр<select name="day" defaultValue={currentSchedule?.day ?? edit.day ?? 0}>{days.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label><div className="sg-form-row"><label>Эхлэх цаг<input name="start" type="time" required defaultValue={currentSchedule?.start || "09:00"} /></label><label>Дуусах цаг<input name="end" type="time" required defaultValue={currentSchedule?.end || "10:30"} /></label></div><label>Өрөө <span className="sg-optional">заавал биш</span><input name="room" maxLength={100} defaultValue={currentSchedule?.room} placeholder="A-205 эсвэл Онлайн" /></label></>}
        {edit?.kind === "tasks" && <><div className="sg-form-row"><label>Төрөл<select name="kind" defaultValue={currentTask?.kind || "assignment"}>{Object.entries(kinds).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label><label>Дуусгах огноо<input name="due" type="date" required defaultValue={currentTask?.due || today()} /></label></div><label>Чухал байдал<select name="priority" defaultValue={currentTask?.priority || "normal"}>{Object.entries(priorities).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label></>}
        {edit?.kind === "grades" && <><div className="sg-form-row"><label>Кредит<input name="credits" type="number" min="0.5" max="30" step="0.5" required defaultValue={currentGrade?.credits ?? 3} /></label><label>Хувийн оноо (0–100)<input name="score" type="number" min="0" max="100" step="1" required defaultValue={currentGrade?.score ?? 90} /></label></div><label>Улирал<input name="term" required maxLength={200} defaultValue={currentGrade?.term || term || `${new Date().getFullYear()} ${new Date().getMonth() < 6 ? "Хавар" : "Намар"}`} placeholder="2026 Намар" /></label></>}
      </div>}
      {error && <p className="sg-form-error" role="alert">{error}</p>}
      <div className="sg-dialog-actions"><button type="button" className="sg-button sg-secondary" disabled={saving} onClick={() => setEdit(null)}>Болих</button><button className={`sg-button ${edit?.remove ? "sg-danger" : "sg-primary"}`} type="submit" disabled={saving}>{saving ? "Хадгалж байна…" : edit?.remove ? "Устгах" : "Хадгалах"}</button></div>
    </form></Modal>
  </div>;
}
