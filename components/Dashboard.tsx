"use client";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useUser } from "../context/UserContext";
import { apiRequest } from "../lib/api";
import { normalizeStudents } from "../lib/student-data";
import type { Course, DashboardSection, Student, TeacherProfile } from "../lib/types";
import Sidebar from "./Sidebar";
import { navigation } from "../lib/navigation";
import AcademicHome from "./AcademicHome";
import Curriculum from "./Curriculum";
import TeacherDirectory from "./TeacherDirectory";
import ScheduleBoard from "./ScheduleBoard";
import Gradebook from "./Gradebook";
import AssessmentManager from "./AssessmentManager";
import CourseList from "./CourseList";
import Icon from "./Icon";
import Modal from "./Modal";
import EmptyState from "./EmptyState";
const Report = dynamic(() => import("./Report"), { loading: () => <p role="status">Тайлан ачаалж байна…</p> });
const Attendance = dynamic(() => import("./AttendanceManager"), { loading: () => <p role="status">Ирц ачаалж байна…</p> });
const CourseSelection = dynamic(() => import("./CourseSelectionManager"), { loading: () => <p className="sg-loading" role="status">Хичээл сонголт ачаалж байна…</p> });
type Dialog = { type: "course"; course?: Course } | { type: "student" } | { type: "detail"; course: Course } | { type: "delete"; kind: "course" | "student"; id: string; title: string } | null;
const info = {
  assignments: { title: "Даалгавар", description: "Хичээлийн даалгавар, материал болон илгээсэн хариу." },
  exams: { title: "Шалгалт", description: "Шалгалтын заавар, хугацаа болон хариу илгээх хэсэг." },
  overview: { title: "Нүүр хуудас", description: "Таны сургалтын мэдээлэл, хүсэлт, суралцах ахиц." },
  teachers: { title: "Багш нарын мэдээлэл", description: "Багшийн танилцуулга болон заадаг хичээлүүд." },
  courses: { title: "Хичээлүүд", description: "Хичээл, багш, хуваарийн мэдээллээ нэг дороос." },
  students: { title: "Оюутнууд", description: "Оюутны бүртгэл болон сонгосон хичээлүүд." },
  planner: { title: "Санал болгох төлөвлөгөө", description: "Курс, улирал бүрт судлах хичээлүүдийн дараалал." },
  selection: { title: "Хичээл сонголт", description: "Хичээл сонгоод администраторын зөвшөөрөл аваарай." },
  schedule: { title: "Миний хуваарь", description: "Админаар баталгаажсан хичээлүүдийн долоо хоногийн хуваарь." },
  grades: { title: "Дүн", description: "Өмнө үзсэн хичээлийн дүн болон голчоо тооцоолоорой." },
  reports: { title: "Сургалтын тайлан", description: "Бүртгэлтэй хичээл, оюутан, багшийн ерөнхий мэдээлэл." },
  attendance: { title: "Ирц бүртгэх", description: "Өөрийн хичээлийн баталгаажсан оюутнуудын ирцийг өдрөөр бүртгэнэ." },
};
export default function Dashboard({ section: requested = "courses" }: { section?: DashboardSection }) {
  const section = requested;
  const router = useRouter();
  const { session, ready, signOut } = useUser();
  const [courses, setCourses] = useState<Course[]>([]);
  const [teacherProfiles, setTeacherProfiles] = useState<TeacherProfile[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [mongoStudents, setMongoStudents] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [teacher, setTeacher] = useState("");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const canManage = session?.role === "admin" || session?.role === "teacher";
  const isAdmin = session?.role === "admin";
  const load = useCallback(async () => {
    setRefreshing(true); setError("");
    try {
      const courseRows = await apiRequest<Course[]>("/courses");
      const studentResult = canManage
        ? await apiRequest<Student[] | { data: Student[] }>(session?.role === "teacher" ? "/api/academic/students" : "/students?limit=100")
        : [];
      const studentRows = Array.isArray(studentResult) ? studentResult : studentResult.data;
      setCourses(courseRows);
      setStudents(normalizeStudents(studentRows));
      setMongoStudents(!Array.isArray(studentResult));
      setLoaded(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Өгөгдөл татаж чадсангүй."); }
    finally { setRefreshing(false); }
  }, [canManage, session?.role]);
  useEffect(() => {
    if (!session) return;
    let active = true;
    apiRequest<TeacherProfile[]>('/api/teachers').then(rows => { if (active) setTeacherProfiles(rows); }).catch(() => {});
    return () => { active = false; };
  }, [session]);
  useEffect(() => { if (ready && !session) router.replace("/login"); }, [ready, session, router]);
  useEffect(() => {
    if (!ready || !session) return;
    let active = true;
    Promise.all([
      apiRequest<Course[]>("/courses"),
      canManage ? apiRequest<Student[] | { data: Student[] }>(session?.role === "teacher" ? "/api/academic/students" : "/students?limit=100") : Promise.resolve([]),
    ])
      .then(([courseRows, studentResult]) => {
        if (active) {
          setCourses(courseRows);
          setStudents(normalizeStudents(Array.isArray(studentResult) ? studentResult : studentResult.data));
          setMongoStudents(!Array.isArray(studentResult));
          setLoaded(true);
          setError("");
        }
      })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : "Өгөгдөл татаж чадсангүй."); });
    return () => { active = false; };
  }, [ready, session, canManage]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(""), 4500); return () => clearTimeout(timer); }, [notice]);
  const keyword = query.trim().toLocaleLowerCase("mn");
  const filteredCourses = useMemo(() => courses.filter(course => `${course.title} ${course.teacher} ${course.room}`.toLocaleLowerCase("mn").includes(keyword) && (!teacher || course.teacher === teacher)), [courses, keyword, teacher]);
  const studentName = (student: Student) => `${student.lastName} ${student.firstName}`.trim();
  const filteredStudents = useMemo(() => students.filter(student => `${student.lastName} ${student.firstName} ${student.code} ${student.email} ${student.program}`.toLocaleLowerCase("mn").includes(keyword)), [students, keyword]);
  const teachers = useMemo(() => [...new Set(courses.map(course => course.teacher))].sort(), [courses]);
  const enrollmentCount = useCallback((id: string) => students.filter(student => student.selectedCourses?.some(course => course.id === id && course.status === "approved")).length, [students]);
  const openCourse = useCallback((course: Course) => { setFormError(""); setDialog({ type: "detail", course }); }, []);
  const editCourse = useCallback((course: Course) => { setFormError(""); setDialog({ type: "course", course }); }, []);
  const deleteCourse = useCallback((id: string) => { const course = courses.find(item => item.id === id); if (course) { setFormError(""); setDialog({ type: "delete", kind: "course", id, title: course.title }); } }, [courses]);
  function open(next: Dialog) { setFormError(""); setDialog(next); }
  async function saveForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!dialog || busy) return;
    const form = new FormData(event.currentTarget); setBusy(true); setFormError("");
    try {
      if (dialog.type === "course") {
        const body = { ...Object.fromEntries(["title", "teacher", "schedule", "room", "code"].map(key => [key, String(form.get(key) || "").trim()])), credits:Number(form.get("credits")||3), year:Number(form.get("year")||1), semester:Number(form.get("semester")||1) };
        const course = await apiRequest<Course>(dialog.course ? `/courses/${dialog.course.id}` : "/courses", { method: dialog.course ? "PUT" : "POST", body: JSON.stringify(body) });
        setCourses(current => dialog.course ? current.map(item => item.id === course.id ? course : item) : [...current, course]);
        setNotice(dialog.course ? "Хичээлийн мэдээлэл шинэчлэгдлээ." : "Хичээл нэмэгдлээ.");
      } else if (dialog.type === "student") {
        const body = Object.fromEntries(["code", "firstName", "lastName", "email", "program"].map(key => [key, String(form.get(key) || "").trim()]));
        const result = await apiRequest<{ data: Student }>("/students", { method: "POST", body: JSON.stringify(body) });
        setStudents(current => [...current, result.data]); setNotice("Оюутан бүртгэгдлээ.");
      } else if (dialog.type === "delete") {
        await apiRequest(`/${dialog.kind === "course" ? "courses" : "students"}/${dialog.id}`, { method: "DELETE" });
        if (dialog.kind === "course") setCourses(current => current.filter(item => item.id !== dialog.id));
        else setStudents(current => current.filter(item => String(item.id) !== dialog.id));
        setNotice("Бичлэг устгагдлаа.");
      }
      setDialog(null);
    } catch (cause) { setFormError(cause instanceof Error ? cause.message : "Хадгалж чадсангүй."); }
    finally { setBusy(false); }
  }
  if (!ready || !session) return <main className="sg-auth-loading"><span className="sg-spinner" /><p>Сургалтын орчин ачаалж байна…</p></main>;
  const allowed = navigation(session.role).some(link => link.key === section);
  const page = section === "courses" && session.role === "teacher" ? { title: "Миний заадаг хичээлүүд", description: "Танд хуваарилсан хичээлүүд болон сургалтын мэдээлэл." }
    : section === "students" && session.role === "teacher" ? { title: "Миний оюутнууд", description: "Таны хичээлд админаар баталгаажсан оюутнуудын мэдээлэл." }
    : section === "schedule" && session.role === "admin" ? { title: "Хуваарь зохицуулах", description: "Хичээлийн өдөр, цаг, өрөөг тохируулж давхцлыг шалгана." }
    : section === "selection" && session.role === "admin" ? { title: "Сонголтын хүсэлтүүд", description: "Оюутны хүсэлтүүдийг хянаж баталгаажуулна." }
    : section === "grades" && session.role === "teacher" ? { title: "Дүн оруулах", description: "Өөрийн хичээлийн оюутнуудад үнэлгээ оруулах." } : info[section];
  const dialogTitle = dialog?.type === "course" ? dialog.course ? "Хичээл засах" : "Шинэ хичээл" : dialog?.type === "student" ? "Оюутан бүртгэх" : dialog?.type === "delete" ? "Бичлэг устгах" : dialog?.type === "detail" ? dialog.course.title : "";
  return <div className="sg-workspace">
    <Sidebar section={section} open={navOpen} onClose={() => setNavOpen(false)} onSignOut={() => { signOut(); router.replace("/login"); }} />
    <div className="sg-workspace-body">
      <header className="sg-topbar"><div className="sg-topbar-left"><button className="sg-icon-button sg-mobile-menu" onClick={() => setNavOpen(true)} aria-label="Цэс нээх" aria-expanded={navOpen} aria-controls="app-sidebar"><Icon name="menu" /></button><span className="sg-breadcrumb">Миний орчин <span>/</span> <strong>{page.title}</strong></span></div><div className="sg-topbar-user"><span className="sg-role-tag">{session.role === "admin" ? "Админ" : session.role === "teacher" ? "Багш" : "Оюутан"}</span><span className="sg-avatar sg-avatar-light">{session.name.charAt(0).toUpperCase()}</span><strong>{session.name}</strong>{session.role === "student" && <button className="sg-button sg-secondary sg-topbar-signout" onClick={() => { signOut(); router.replace("/login"); }}><Icon name="logout" size={16} /><span>Гарах</span></button>}</div></header>
      <main className="sg-content"><div className="sg-page-heading"><div><span className="sg-eyebrow">EDURA · СУРГАЛТЫН СИСТЕМ</span><h1>{page.title}</h1><p>{page.description}</p></div><div className="sg-heading-actions">{section !== "planner" && <button className="sg-button sg-secondary" onClick={() => void load()} disabled={refreshing}><Icon name="refresh" /><span>{refreshing ? "Шинэчилж байна" : "Шинэчлэх"}</span></button>}{(section === "courses" && isAdmin || section === "students" && isAdmin) && <button className="sg-button sg-primary" onClick={() => open(section === "courses" ? { type: "course" } : { type: "student" })}><Icon name="plus" />{section === "courses" ? "Хичээл нэмэх" : "Оюутан бүртгэх"}</button>}</div></div>
      {notice && <div className="sg-success" role="status"><Icon name="check" />{notice}</div>}
      {error && <div className="sg-error" role="alert">{error}<button onClick={() => void load()}>Дахин оролдох</button></div>}
      {!allowed ? <EmptyState title="Энэ хэсэгт хандах эрхгүй" text="Өөрийн сургалтын орчны цэсээс тохирох хэсгийг сонгоно уу." />
        : section === "overview" ? <AcademicHome courses={courses} students={students} />
        : section === "teachers" ? <TeacherDirectory />
        : section === "planner" ? <Curriculum courses={courses} />
        : section === "assignments" || section === "exams" ? <AssessmentManager key={`${session.name}-${section}`} kind={section === "exams" ? "exam" : "assignment"} />
        : section === "grades" ? <Gradebook courses={courses} />
        : section === "schedule" ? <ScheduleBoard onSaved={() => void load()} />
        : section === "selection" ? <CourseSelection courses={courses} mode="requests" />
        : !loaded && !error ? <div className="sg-skeleton" role="status" aria-label="Өгөгдөл ачаалж байна"><i /><i /><i /></div> : !loaded ? null : <>
        {section === "courses" && <><div className="sg-overview-strip"><div><span className="sg-stat-icon"><Icon name="book" /></span><div><strong>{courses.length}</strong><span>Нийт хичээл</span></div></div><div><span className="sg-stat-icon sg-stat-blue"><Icon name="users" /></span><div><strong>{teachers.length}</strong><span>Хичээл зааж буй багш</span></div></div><div><span className="sg-stat-icon sg-stat-orange"><Icon name="calendar" /></span><div><strong>{new Set(courses.map(course => course.room)).size}</strong><span>Ашиглаж буй өрөө</span></div></div></div><section className="sg-panel"><div className="sg-panel-toolbar"><div><h2>Хичээлийн жагсаалт <span className="sg-count">{filteredCourses.length}</span></h2><p>Нэр дээр дарж дэлгэрэнгүй мэдээллийг хараарай.</p></div><div className="sg-filters"><label className="sg-search"><Icon name="search" /><input aria-label="Хичээл хайх" placeholder="Хичээл, багш, өрөөгөөр хайх" value={query} onChange={e => setQuery(e.target.value)} />{query && <button onClick={() => setQuery("")} aria-label="Хайлт цэвэрлэх"><Icon name="close" size={16} /></button>}</label><select aria-label="Багшаар шүүх" value={teacher} onChange={e => setTeacher(e.target.value)}><option value="">Бүх багш</option>{teachers.map(name => <option key={name}>{name}</option>)}</select></div></div>{filteredCourses.length ? <div className="sg-course-table"><CourseList courses={filteredCourses} enrollmentCount={enrollmentCount} canEdit={isAdmin} canDelete={isAdmin} onOpen={openCourse} onEdit={editCourse} onDelete={deleteCourse} /></div> : <EmptyState title={courses.length ? "Хайлттай тохирох хичээл алга" : "Эхний хичээлээ нэмээрэй"} text={courses.length ? "Өөр нэрээр хайх эсвэл багшийн шүүлтүүрээ цэвэрлээрэй." : "Хичээл нэмснээр нэр, багш, хуваарь нь энд харагдана."} action={courses.length ? "Шүүлтүүр цэвэрлэх" : isAdmin ? "Хичээл нэмэх" : undefined} onAction={() => courses.length ? (setQuery(""), setTeacher("")) : open({ type: "course" })} />}</section></>}
        {section === "students" && (canManage ? <section className="sg-panel"><div className="sg-panel-toolbar"><div><h2>Оюутны бүртгэл <span className="sg-count">{students.length}</span></h2><p>Бүртгэлийн мэдээлэл болон сонгосон хичээл.</p></div><label className="sg-search"><Icon name="search" /><input placeholder="Нэр, имэйл, хөтөлбөрөөр хайх" aria-label="Оюутан хайх" value={query} onChange={e => setQuery(e.target.value)} /></label></div>{filteredStudents.length ? <div className="sg-table-scroll"><table className="sg-table"><thead><tr><th>Оюутан</th><th>Хөтөлбөр</th><th>Сонгосон хичээл</th>{isAdmin && <th><span className="sg-sr-only">Үйлдэл</span></th>}</tr></thead><tbody>{filteredStudents.map(student => <tr key={student.id}><td><div className="sg-person"><span className="sg-avatar sg-avatar-light">{studentName(student).charAt(0)}</span><div><strong>{studentName(student)}</strong><small>{student.code} · {student.email}</small></div></div></td><td>{student.program || "—"}</td><td>{student.selectedCourses?.length ? student.selectedCourses.map(course => `${course.title} (${course.status === "approved" ? "зөвшөөрсөн" : course.status === "rejected" ? "татгалзсан" : "хүлээгдэж буй"})`).join(", ") : "Сонгоогүй"}</td>{isAdmin && <td><button className="sg-icon-button sg-danger-icon" aria-label={`${studentName(student)} устгах`} onClick={() => open({ type: "delete", kind: "student", id: String(student.id), title: studentName(student) })}><Icon name="trash" size={18} /></button></td>}</tr>)}</tbody></table></div> : <EmptyState icon="users" title={students.length ? "Тохирох оюутан олдсонгүй" : session.role === "teacher" ? "Таны хичээлд баталгаажсан оюутан алга" : "Оюутан хараахан бүртгэгдээгүй"} text={students.length ? "Хайлтын утгаа өөрчлөөд дахин хайгаарай." : session.role === "teacher" ? "Админ хичээл сонголтыг баталсны дараа оюутны мэдээлэл энд харагдана. Дараа нь Шинэчлэх товчийг дарна уу." : "Эхний оюутнаа бүртгэж, хичээлтэй нь холбоорой."} action={students.length && isAdmin ? "Хайлтыг цэвэрлэх" : !students.length && isAdmin ? "Оюутан бүртгэх" : undefined} onAction={() => students.length ? setQuery("") : open({ type: "student" })} />}</section> : <EmptyState title="Энэ хэсэгт эрх хүрэхгүй байна" text="Оюутны бүртгэлийг багш болон администратор удирдана." />)}
        {section === "attendance" && <Attendance courses={courses} students={students} />}
        {section === "reports" && <section className="sg-panel sg-report-panel">{reportOpen ? <Report /> : <EmptyState icon="chart" title="Бүртгэлийн ерөнхий тайлан" text="Хичээл, оюутан, багшийн хамгийн сүүлийн бүртгэлийн тоог харна." action="Тайлан харах" onAction={() => setReportOpen(true)} />}</section>}
      </>}
      <footer className="sg-footer"><span>EDURA · Сургалтын орчин</span><span>Хичээлдээ төвлөр. Бусдыг цэгцэл.</span></footer></main>
    </div>
    <Modal open={!!dialog} title={dialogTitle} busy={busy} onClose={() => setDialog(null)}>
      {dialog?.type === "detail" ? <><div className="sg-course-detail"><span className="sg-detail-emblem"><Icon name="book" size={32} /></span><p>Хичээлийн мэдээлэл</p><dl><div><dt>Багш</dt><dd>{dialog.course.teacher}</dd></div><div><dt>Хуваарь</dt><dd>{dialog.course.schedule}</dd></div><div><dt>Өрөө</dt><dd>{dialog.course.room}</dd></div><div><dt>Зөвшөөрсөн оюутан</dt><dd>{enrollmentCount(dialog.course.id)}</dd></div></dl></div><div className="sg-dialog-actions"><button className="sg-button sg-secondary" onClick={() => setDialog(null)}>Хаах</button>{session.role === "student" && <button className="sg-button sg-primary" onClick={() => { setDialog(null); router.push("/course-selection"); }}>Хичээл сонгох</button>}{isAdmin && <button className="sg-button sg-primary" onClick={() => editCourse(dialog.course)}>Мэдээлэл засах</button>}</div></> : <form onSubmit={saveForm} key={dialog?.type === "course" ? dialog.course?.id || "new" : dialog?.type}>
        {dialog?.type === "course" && <div className="sg-form-fields"><div className="sg-form-row"><label>Хичээлийн код<input name="code" maxLength={120} defaultValue={dialog.course?.code} placeholder="M.SW322" /></label><label>Кредит<input name="credits" type="number" min="0.5" max="30" step="0.5" required defaultValue={dialog.course?.credits||3} /></label></div><div className="sg-form-row"><label>Курс<select name="year" defaultValue={dialog.course?.year||1}>{[1,2,3,4].map(y=><option key={y} value={y}>{y}-р курс</option>)}</select></label><label>Улирал<select name="semester" defaultValue={dialog.course?.semester||1}>{[1,2,3,4,5,6,7,8].map(y=><option key={y} value={y}>{y}-р улирал</option>)}</select></label></div><label>Хичээлийн нэр<input name="title" required maxLength={120} defaultValue={dialog.course?.title} placeholder="Жишээ: Веб систем ба технологи" /></label><label>Багш<select name="teacher" required defaultValue={dialog.course?.teacher||''}><option value="">Багш сонгох</option>{teacherProfiles.map(t=><option key={t.id} value={t.username}>{t.displayName} ({t.username})</option>)}</select></label><div className="sg-form-row"><label>Хуваарь<input name="schedule" required readOnly={!!dialog.course} defaultValue={dialog.course?.schedule} placeholder="Даваа, 09:00–10:30" /></label><label>Өрөө<input name="room" required readOnly={!!dialog.course} defaultValue={dialog.course?.room} placeholder="A-205" /></label></div></div>}
        {dialog?.type === "student" && <div className="sg-form-fields"><label>Оюутны код<input name="code" required placeholder="ST2026001" /></label><div className="sg-form-row"><label>Овог<input name="lastName" required placeholder="Бат" /></label><label>Нэр<input name="firstName" required placeholder="Номин" /></label></div><label>Имэйл<input name="email" type="email" required placeholder="student@example.com" /></label><label>Хөтөлбөр<input name="program" required={!mongoStudents} placeholder="Программ хангамж" /></label></div>}
        {dialog?.type === "delete" && <p className="sg-delete-description"><strong>{dialog.title}</strong> бичлэгийг устгах уу? Энэ үйлдлийг буцаах боломжгүй.</p>}
        {formError && <p role="alert" className="sg-form-error">{formError}</p>}
        <div className="sg-dialog-actions"><button type="button" className="sg-button sg-secondary" onClick={() => setDialog(null)} disabled={busy}>Болих</button><button type="submit" disabled={busy} className={`sg-button ${dialog?.type === "delete" ? "sg-danger" : "sg-primary"}`}>{busy ? "Хадгалж байна…" : dialog?.type === "delete" ? "Устгах" : "Хадгалах"}</button></div>
      </form>}
    </Modal>
  </div>;
}
