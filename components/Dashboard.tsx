"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getTokenExpirationMs, logoutForExpiredToken } from "../lib/auth-session";
import { useUser } from "../context/UserContext";
import { apiRequest } from "../lib/api";
import type { Course, DashboardSection as Section, Student } from "../lib/types";
import DashboardHeader from "./DashboardHeader";
import Sidebar from "./Sidebar";
import SearchBox from "./SearchBox";
import CourseList from "./CourseList";

const initialStudents: Student[] = [
  { id: "s-1", name: "Анужин Бат", email: "anujin@example.mn", program: "Программ хангамж", courseId: "c-1" },
  { id: "s-2", name: "Тэмүүлэн Ган", email: "temuulen@example.mn", program: "Мэдээллийн систем", courseId: "c-2" },
  { id: "s-3", name: "Номин Эрдэнэ", email: "nomin@example.mn", program: "Программ хангамж", courseId: "c-1" },
  { id: "s-4", name: "Билгүүн Дорж", email: "bilguun@example.mn", program: "Дизайн", courseId: "c-3" },
];
export default function Dashboard({ section = "overview" }: { section?: Section }) {
  const router = useRouter();
  const { session, ready: authChecked, setUser } = useUser();
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [ready, setReady] = useState(false);
  const [modal, setModal] = useState<Section | "edit-course" | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [query, setQuery] = useState("");
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    if (!authChecked) return;
    if (!session) router.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`);
    else if (session.role === "student" && section !== "overview") router.replace("/");
  }, [authChecked, router, section, session]);

  useEffect(() => {
    const checkExpiration = () => {
      const token = localStorage.getItem("surgaal-token");
      const expiresAt = token ? getTokenExpirationMs(token) : null;
      if (!expiresAt || Date.now() >= expiresAt) logoutForExpiredToken();
    };

    checkExpiration();
    const interval = window.setInterval(checkExpiration, 1000);
    document.addEventListener("visibilitychange", checkExpiration);
    window.addEventListener("focus", checkExpiration);
    window.addEventListener("pageshow", checkExpiration);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", checkExpiration);
      window.removeEventListener("focus", checkExpiration);
      window.removeEventListener("pageshow", checkExpiration);
    };
  }, [session]);

  useEffect(() => {
    Promise.all([apiRequest<Student[]>("/students"), apiRequest<Course[]>("/courses")])
      .then(([studentRows, courseRows]) => { setStudents(studentRows); setCourses(courseRows); })
      .catch((error: unknown) => setApiError(error instanceof Error ? error.message : "Мэдээлэл татахад алдаа гарлаа."))
      .finally(() => setReady(true));
  }, []);

  const filteredStudents = useMemo(() => students.filter((student) => `${student.name} ${student.email} ${student.program}`.toLowerCase().includes(query.toLowerCase())), [students, query]);
  const filteredCourses = useMemo(() => courses.filter((course) => `${course.title} ${course.teacher}`.toLowerCase().includes(query.toLowerCase())), [courses, query]);
  const enrollmentCount = useCallback((courseId: string) => students.filter((student) => student.courseId === courseId).length, [students]);
  const editCourse = useCallback((course: Course) => {
    setEditingCourse(course);
    setModal("edit-course");
  }, []);
  const title = section === "students" ? "Оюутнууд" : section === "courses" ? "Хичээлүүд" : "Хяналтын самбар";

  async function addStudent(formData: FormData) {
    try {
      const student = await apiRequest<Student>("/students", { method: "POST", body: JSON.stringify({ name: String(formData.get("name")).trim(), email: String(formData.get("email")).trim(), program: String(formData.get("program")).trim(), courseId: String(formData.get("courseId") || "") }) });
      setStudents((current) => [student, ...current]); setModal(null); setApiError("");
    } catch (error) { setApiError(error instanceof Error ? error.message : "Оюутан бүртгэж чадсангүй."); }
  }
  async function addCourse(formData: FormData) {
    try {
      const fields = { title: String(formData.get("title")).trim(), teacher: String(formData.get("teacher")).trim(), schedule: String(formData.get("schedule")).trim(), room: String(formData.get("room")).trim() };
      const editing = modal === "edit-course" && editingCourse;
      const course = await apiRequest<Course>(editing ? `/courses/${editing.id}` : "/courses", { method: editing ? "PUT" : "POST", body: JSON.stringify(fields) });
      setCourses((current) => editing ? current.map((item) => item.id === course.id ? course : item) : [course, ...current]); setModal(null); setEditingCourse(null); setApiError("");
    } catch (error) { setApiError(error instanceof Error ? error.message : "Хичээл нэмж чадсангүй."); }
  }
  async function removeStudent(id: string) {
    try { await apiRequest(`/students/${id}`, { method: "DELETE" }); setStudents((current) => current.filter((student) => student.id !== id)); setApiError(""); }
    catch (error) { setApiError(error instanceof Error ? error.message : "Бүртгэл устгаж чадсангүй."); }
  }
  const removeCourse = useCallback(async (id: string) => {
    try {
      await apiRequest(`/courses/${id}`, { method: "DELETE" });
      setCourses((current) => current.filter((course) => course.id !== id));
      setStudents((current) => current.map((student) => student.courseId === id ? { ...student, courseId: "" } : student)); setApiError("");
    } catch (error) { setApiError(error instanceof Error ? error.message : "Хичээл устгаж чадсангүй."); }
  }, []);

  function signOut() {
    setUser(null);
    router.replace("/login");
  }

  if (!authChecked || !session) return <div className="auth-loading">Surgaal <span>Уншиж байна…</span></div>;
  if (!ready) return <div className="auth-loading">Surgaal <span>Өгөгдөл ачаалж байна…</span></div>;
  if (section === "overview") return <ClassroomHome courses={courses} onSignOut={signOut} />;
  const isAdmin = session.role === "admin";
  const canManageCourses = session.role !== "student";

  return (
    <div className="app-shell">
      <Sidebar section={section} studentCount={students.length} courses={courses} onAddStudent={() => setModal("students")} onSignOut={signOut} />

      <main className="main-area">
        <DashboardHeader title={title} />
        <div className="page-content">
          <div className="page-heading"><div><div className="eyebrow">САЙН БАЙНА УУ, {session.name.toLocaleUpperCase("mn-MN")} 👋</div><h1>{title}</h1><p>{section === "students" ? "Оюутнуудын бүртгэл, хичээлийн сонголтыг удирдах." : "Хичээл болон багш нарын мэдээллийг удирдах."}</p></div>{(isAdmin || session.role === "teacher") && <button className="primary-button" onClick={() => setModal(section)}>＋ {section === "students" ? "Оюутан бүртгэх" : "Хичээл нэмэх"}</button>}</div>
          {apiError && <p className="login-error" role="alert">{apiError}</p>}

          {section === "students" && canManageCourses && <section className="panel list-panel"><div className="panel-heading list-heading"><div><h2>Оюутны бүртгэл</h2><p>Нийт {students.length} оюутан бүртгэлтэй байна</p></div><SearchBox value={query} onChange={setQuery} placeholder="Нэр, имэйлээр хайх" /></div><StudentTable students={filteredStudents} courses={courses} removeStudent={isAdmin ? removeStudent : undefined} /></section>}

          {section === "courses" && canManageCourses && <section className="panel list-panel"><div className="panel-heading list-heading"><div><h2>Хичээлийн жагсаалт</h2><p>Нийт {courses.length} хичээл · {new Set(courses.map((course) => course.teacher)).size} багш</p></div><SearchBox value={query} onChange={setQuery} placeholder="Хичээл, багшаар хайх" /></div><CourseList courses={filteredCourses} enrollmentCount={enrollmentCount} canEdit={canManageCourses} canDelete={isAdmin} onOpen={setEditingCourse} onEdit={editCourse} onDelete={removeCourse} /></section>}
          <footer className="footer">© 2026 Surgaal <span>Сургалтын үйл ажиллагааг илүү хялбар.</span></footer>
        </div>
      </main>

      {editingCourse && !modal && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditingCourse(null); }}><section className="modal-card"><button type="button" className="modal-close" onClick={() => setEditingCourse(null)}>×</button><div className="eyebrow">ХИЧЭЭЛИЙН МЭДЭЭЛЭЛ</div><h2>{editingCourse.title}</h2><p>Багш: {editingCourse.teacher}</p><p>Хуваарь: {editingCourse.schedule}</p><p>Өрөө: {editingCourse.room}</p><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setEditingCourse(null)}>Хаах</button></div></section></div>}
      {modal && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) { setModal(null); setEditingCourse(null); } }}><form className="modal-card" action={modal === "students" ? addStudent : addCourse}><button type="button" className="modal-close" onClick={() => { setModal(null); setEditingCourse(null); }}>×</button><div className="eyebrow">{modal === "edit-course" ? "ХИЧЭЭЛ ЗАСАХ" : "ШИНЭ БҮРТГЭЛ"}</div><h2>{modal === "students" ? "Оюутан бүртгэх" : modal === "edit-course" ? "Хичээл засах" : "Хичээл нэмэх"}</h2><p>{modal === "students" ? "Оюутны үндсэн мэдээллийг оруулна уу." : "Хичээл болон заах багшийн мэдээллийг оруулна уу."}</p>{modal === "students" ? <><label>Овог, нэр<input name="name" required placeholder="Жишээ: Бат Болд" /></label><label>Имэйл хаяг<input name="email" type="email" required placeholder="student@example.mn" /></label><label>Хөтөлбөр<input name="program" required placeholder="Жишээ: Программ хангамж" /></label><label>Сонгосон хичээл<select name="courseId" defaultValue=""><option value="">Хичээл сонгох (заавал биш)</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label></> : <><label>Хичээлийн нэр<input name="title" required defaultValue={editingCourse?.title ?? ""} placeholder="Жишээ: Веб хөгжүүлэлт" /></label><label>Багшийн нэр<input name="teacher" required defaultValue={editingCourse?.teacher ?? ""} placeholder="Жишээ: Б. Мөнхбаяр" /></label><label>Хуваарь<input name="schedule" required defaultValue={editingCourse?.schedule ?? ""} placeholder="Жишээ: Даваа, Лхагва · 10:00" /></label><label>Өрөө<input name="room" required defaultValue={editingCourse?.room ?? ""} placeholder="Жишээ: А-204" /></label></>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => { setModal(null); setEditingCourse(null); }}>Болих</button><button type="submit" className="primary-button">{modal === "students" ? "Бүртгэх" : modal === "edit-course" ? "Өөрчлөлт хадгалах" : "Хичээл хадгалах"}</button></div></form></div>}
    </div>
  );
}

function StudentTable({ students, courses, removeStudent }: { students: Student[]; courses: Course[]; removeStudent?: (id: string) => void }) {
  if (students.length === 0) return <Empty text="Оюутан олдсонгүй." />;
  return <div className="table-wrap"><table><thead><tr><th>ОЮУТАН</th><th>ХӨТӨЛБӨР</th><th>СОНГОСОН ХИЧЭЭЛ</th><th>ТӨЛӨВ</th><th /></tr></thead><tbody>{students.map((student, i) => <tr key={student.id}><td><div className="person-cell"><div className={`avatar student-avatar avatar-${i % 4}`}>{student.name.trim().charAt(0)}</div><div><strong>{student.name}</strong><span>{student.email}</span></div></div></td><td>{student.program}</td><td>{courses.find((course) => course.id === student.courseId)?.title ?? <span className="muted">Сонгоогүй</span>}</td><td><span className="status-pill"><i /> Идэвхтэй</span></td><td>{removeStudent && <button className="delete-button" onClick={() => removeStudent(student.id)} aria-label={`${student.name} бүртгэлийг устгах`} title="Устгах">⌫</button>}</td></tr>)}</tbody></table></div>;
}
function Empty({ text }: { text: string }) { return <div className="empty-state"><span>◌</span>{text}</div>; }

type AcademicProgram = { id: string; name: string; faculty: string; degree: string; color: string };
const initialPrograms: AcademicProgram[] = [
  { id: "pr-1", name: "Программ хангамж", faculty: "Мэдээллийн технологийн сургууль", degree: "Бакалавр · 4 жил", color: "cream" },
  { id: "pr-2", name: "Мэдээллийн систем", faculty: "Мэдээллийн технологийн сургууль", degree: "Бакалавр · 4 жил", color: "sea" },
  { id: "pr-3", name: "UI/UX дизайн", faculty: "Дизайн, урлагийн сургууль", degree: "Бакалавр · 4 жил", color: "cream" },
];
const weekdays = ["Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан"];
const timetable = [
  [{ time: "09:00", title: "Веб хөгжүүлэлт", teacher: "Б. Мөнхбаяр", color: "lavender" }, { time: "11:00", title: "Өгөгдлийн сан", teacher: "Д. Саруул", color: "peach" }],
  [{ time: "10:00", title: "UI/UX дизайн", teacher: "О. Энхжин", color: "mint" }, { time: "14:00", title: "Алгоритм ба өгөгдлийн бүтэц", teacher: "Б. Мөнхбаяр", color: "blue" }],
  [{ time: "09:00", title: "Өгөгдлийн сан", teacher: "Д. Саруул", color: "peach" }, { time: "13:00", title: "Веб хөгжүүлэлт", teacher: "Б. Мөнхбаяр", color: "lavender" }],
  [{ time: "10:00", title: "Системийн шинжилгээ", teacher: "Д. Саруул", color: "blue" }, { time: "14:00", title: "UI/UX дизайн", teacher: "О. Энхжин", color: "mint" }],
  [{ time: "09:00", title: "Алгоритм ба өгөгдлийн бүтэц", teacher: "Б. Мөнхбаяр", color: "lavender" }, { time: "11:00", title: "Системийн шинжилгээ", teacher: "Д. Саруул", color: "blue" }],
];

function ClassroomHome({ courses, onSignOut }: { courses: Course[]; onSignOut: () => void }) {
  const session = useUser().session!;
  const [programs, setPrograms] = useState<AcademicProgram[]>(initialPrograms);
  const [activeTab, setActiveTab] = useState<"home" | "library" | "schedule" | "grades" | "survey">("home");
  const [isDark, setIsDark] = useState(false);
  const [notice, setNotice] = useState("");
  const [year] = useState("2026–2027");
  const [modal, setModal] = useState<"add" | "enroll" | null>(null);
  const [enrolledIds, setEnrolledIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const savedPrograms = localStorage.getItem("surgaal-university-programs");
      if (savedPrograms) {
        // Browser storage is read once to hydrate this client-only demo preference.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPrograms(JSON.parse(savedPrograms) as AcademicProgram[]);
      }
      const savedEnrollments = localStorage.getItem(`surgaal-enrollments-${session.email}`);
      if (savedEnrollments) setEnrolledIds(JSON.parse(savedEnrollments) as string[]);
      else if (session.role === "student") {
        const student = initialStudents.find((item) => item.email === session.email || item.name === session.name);
        if (student?.courseId) setEnrolledIds([student.courseId]);
      } else if (session.role === "teacher") {
        setEnrolledIds(courses.filter((course) => course.teacher === session.name).map((course) => course.id));
      } else setEnrolledIds(courses.map((course) => course.id));
    } catch { setPrograms(initialPrograms); }
    setReady(true);
  }, [courses, session.email, session.name, session.role]);
  useEffect(() => { if (ready) localStorage.setItem("surgaal-university-programs", JSON.stringify(programs)); }, [programs, ready]);
  useEffect(() => { if (ready) localStorage.setItem(`surgaal-enrollments-${session.email}`, JSON.stringify(enrolledIds)); }, [enrolledIds, ready, session.email]);

  function addProgram(formData: FormData) {
    const created: AcademicProgram = { id: crypto.randomUUID(), name: String(formData.get("name")).trim(), faculty: String(formData.get("faculty")).trim(), degree: String(formData.get("degree")).trim(), color: programs.length % 2 ? "sea" : "cream" };
    setPrograms((current) => [...current, created]); setModal(null);
  }
  function enrollCourse(formData: FormData) {
    const courseId = String(formData.get("courseId") || "");
    if (courseId) setEnrolledIds((current) => current.includes(courseId) ? current : [...current, courseId]);
    setModal(null);
  }
  const displayedCourses = courses.filter((course) => enrolledIds.includes(course.id));

  const studentRecord = initialStudents.find((item) => item.email === session.email || item.name === session.name);
  const pageTitle = activeTab === "home" ? "НҮҮР ХУУДАС" : activeTab === "library" ? "ХИЧЭЭЛ СОНГОЛТ" : activeTab === "schedule" ? "МИНИЙ ХУВААРЬ" : activeTab === "grades" ? "ДҮНГИЙН МЭДЭЭЛЭЛ" : "СУДАЛГАА";
  const menuItems = [
    { id: "home" as const, icon: "⌂", label: "Нүүр хуудас" },
    { id: "library" as const, icon: "☷", label: "Хичээл сонголт" },
    { id: "schedule" as const, icon: "▣", label: "Миний хуваарь" },
    { id: "grades" as const, icon: "☆", label: "Дүн" },
    { id: "survey" as const, icon: "▤", label: "Судалгаа" },
  ];

  return <main className={`ulms-shell ${isDark ? "ulms-dark" : ""}`}>
    <aside className="ulms-sidebar">
      <Link className="ulms-side-brand" href="/dashboard"><span className="university-seal small-seal"><b>С</b></span><span>СУРГААЛ ИХ СУРГУУЛЬ<small>ИХ СУРГУУЛИЙН LMS</small></span></Link>
      <nav className="ulms-side-nav">{menuItems.map((item) => <button key={item.id} className={activeTab === item.id ? "active" : ""} onClick={() => setActiveTab(item.id)}><span>{item.icon}</span>{item.label}</button>)}{session.role !== "student" && <><div className="ulms-nav-caption">УДИРДЛАГА</div><Link href="/courses"><span>▤</span>Хичээл удирдах</Link>{session.role === "admin" && <Link href="/students"><span>♙</span>Оюутны бүртгэл</Link>}</>}</nav>
      <div className="ulms-side-bottom"><div className="ulms-side-help"><span>ⓘ</span><div><strong>Тусламж, дэмжлэг</strong><small>Систем ашиглах заавар</small></div><b>⌄</b></div><button className="ulms-signout" onClick={onSignOut}><span>↪</span>Системээс гарах</button></div>
    </aside>
    <section className="ulms-content"><header className="ulms-topbar"><div className="ulms-page-title"><button className="ulms-menu-toggle" aria-label="Цэс">☰</button><h1>{pageTitle}</h1>{session.role === "admin" && <button className="ulms-admin-add" onClick={() => setModal("add")}>＋ Хөтөлбөр</button>}</div><div className="ulms-top-actions"><span className="ulms-flag" title="Монгол хэл">🇲🇳</span><button aria-label="Дэлгэц дүүргэх" onClick={() => document.documentElement.requestFullscreen?.()}>⛶</button><button aria-label="Өнгө солих" onClick={() => setIsDark((value) => !value)}>{isDark ? "☀" : "☾"}</button><button className="ulms-bell" aria-label="Мэдэгдэл" onClick={() => setNotice("Одоогоор шинэ мэдэгдэл алга.")}>♧<i>0</i></button><div className="ulms-user-chip"><span>{session.name.slice(0, 1)}</span><div><strong>{session.name}</strong><small>{session.role === "admin" ? "Администратор" : session.role === "teacher" ? "Багш" : "Оюутан"}</small></div></div></div></header>
      <div className="ulms-main-content">
        {notice && <button className="ulms-notice" onClick={() => setNotice("")}>{notice} <b>×</b></button>}
        {activeTab === "home" && <div className="ulms-dashboard-grid">
          <div className="ulms-left-column"><section className="ulms-panel student-info"><h2>{session.role === "student" ? "ОЮУТНЫ МЭДЭЭЛЭЛ" : session.role === "teacher" ? "БАГШИЙН МЭДЭЭЛЭЛ" : "СИСТЕМИЙН МЭДЭЭЛЭЛ"}</h2><div className="ulms-info-list"><div><span>Овог/Нэр:</span><strong>{session.name}</strong></div><div><span>Эрхийн төрөл:</span><strong>{session.role === "student" ? "Оюутан" : session.role === "teacher" ? "Багш" : "Администратор"}</strong></div><div><span>Сургууль:</span><strong>{studentRecord?.program === "Дизайн" ? "ДИЗАЙН, УРЛАГИЙН СУРГУУЛЬ" : "МЭДЭЭЛЛИЙН ТЕХНОЛОГИЙН СУРГУУЛЬ"}</strong></div><div><span>Хөтөлбөр:</span><strong>{studentRecord?.program ?? (session.role === "teacher" ? "Мэдээллийн технологи" : "Сургалтын удирдлага")}</strong></div><div><span>И-мэйл:</span><strong>{session.email}</strong></div><div><span>Семестр:</span><strong>{year} · Намар</strong></div></div><button className="ulms-support-toggle" onClick={() => setNotice("Оюутны дэмжлэгийн хүсэлт илгээх хэсэг удахгүй нээгдэнэ.")}><span>ⓘ</span> Буцалтгүй тусламж, тэтгэлэг <i /> <b>⌄</b></button></section>
            <section className="ulms-panel useful-links"><h2>ХЭРЭГТЭЙ ХОЛБООСУУД <b>12</b></h2>{["Сургалтын төлөвлөгөө", "Оюутны гарын авлага", "Номын сангийн цахим каталог"].map((item, index) => <button key={item} onClick={() => setNotice(`${item}: холбоос хараахан тохируулаагүй байна.`)}><span>{["↗", "▤", "⌕"][index]}</span><strong>{item}</strong><small>{index === 0 ? "Хөтөлбөр, кредитийн мэдээлэл" : "Сургалтын үйлчилгээ"}</small><b>›</b></button>)}</section><section className="ulms-panel program-panel"><h2>СУРГАЛТЫН ХӨТӨЛБӨР</h2>{programs.map((program) => <div key={program.id}><span>▤</span><div><strong>{program.name}</strong><small>{program.faculty}</small></div></div>)}</section></div>
          <div className="ulms-right-column"><section className="ulms-live-list">{(displayedCourses.length ? displayedCourses : courses).slice(0, 5).map((course, index) => <article className="ulms-live-card" key={course.id}><span className="live-pill"><i /> LIVE</span><div className="live-course-info"><strong>{course.title} — Live хичээл эхэллээ</strong><small>{["M.SW315", "M.SW306", "M.SW213", "M.SW322", "S.EL105"][index % 5]} · Лекц · {course.teacher} · {course.room} · {course.schedule.split("·").at(-1)?.trim()}</small></div><button onClick={() => setNotice(`${course.title}: хичээлийн онлайн холбоос тохируулагдаагүй байна.`)}>▣ Live-д нэгдэх</button></article>)}</section>
            <section className="ulms-survey-card"><div className="survey-symbol">▥</div><div className="survey-copy"><span>WIFI СУДАЛГАА <small>◷ 6 хоног үлдлээ</small></span><h2>Сургуулийн WiFi сүлжээг хамтдаа сайжруулцгаая!</h2><p>Сургуулийн сүлжээний чанарын талаар санал хүсэлтээ илгээнэ үү.</p><button onClick={() => { setActiveTab("survey"); setNotice(""); }}>Үнэлгээгээ өгөх <b>→</b></button></div><div className="survey-progress"><i /><span>0 / 8</span></div><span className="survey-spark">✦</span></section>
            <section className="ulms-panel research-panel"><h2>СУДАЛГАА</h2><p>Одоогоор идэвхтэй судалгаа байхгүй байна.</p></section></div>
        </div>}
        {activeTab === "library" && <section className="ulms-page-panel"><div className="ulms-section-heading"><div><span>2026–2027 · НАМРЫН УЛИРАЛ</span><h2>Хичээл сонголт</h2><p>Судлах хичээлээ сонгож, бүртгэлээ шалгана уу.</p></div><button onClick={() => setModal("enroll")}>＋ Хичээл сонгох</button></div><div className="ulms-course-grid">{courses.map((course, index) => <article key={course.id}><span className={`course-dot tone-${index % 4}`}>{["⌘", "◉", "✳", "∑"][index % 4]}</span><small>{["M.SW315", "M.SW306", "M.SW213", "M.SW322"][index % 4]} · Лекц</small><h3>{course.title}</h3><p>{course.teacher} · {course.room}</p><div>{course.schedule}<button onClick={() => setEnrolledIds((current) => current.includes(course.id) ? current.filter((id) => id !== course.id) : [...current, course.id])}>{enrolledIds.includes(course.id) ? "Бүртгэлтэй ✓" : "Сонгох +"}</button></div></article>)}</div></section>}
        {activeTab === "schedule" && <section className="ulms-page-panel"><div className="ulms-section-heading"><div><span>{year} · НАМРЫН УЛИРАЛ</span><h2>Миний хичээлийн хуваарь</h2><p>Долоо хоногийн лекц, семинарын цаг.</p></div><button onClick={() => window.print()}>Хэвлэх ↗</button></div><div className="week-grid">{weekdays.map((day, dayIndex) => <section className={`weekday-column day-${dayIndex}`} key={day}><h2>{day}</h2><div className="weekday-lessons">{timetable[dayIndex].map((lesson, index) => <article className={`lesson-card ${lesson.color}`} key={`${lesson.title}-${index}`}><span className="lesson-time">{lesson.time}</span><strong>{lesson.title}</strong><small>{lesson.teacher}</small></article>)}</div></section>)}</div></section>}
        {activeTab === "grades" && <section className="ulms-page-panel"><div className="ulms-section-heading"><div><span>СУРГАЛТЫН АМЖИЛТ</span><h2>Дүнгийн мэдээлэл</h2><p>Багш дүн оруулсны дараа энд харагдана.</p></div></div><div className="ulms-empty-panel">▤<strong>Дүн бүртгэгдээгүй байна</strong><span>Улирлын дүнгийн мэдээллийг энд нэгтгэнэ.</span></div></section>}
        {activeTab === "survey" && <section className="ulms-page-panel"><div className="ulms-section-heading"><div><span>ОЮУТНЫ САНАЛ</span><h2>Судалгаа, санал асуулга</h2><p>Сургалтын орчныг сайжруулах судалгаанд оролцоорой.</p></div></div><button className="ulms-survey-row" onClick={() => setNotice("Судалгаа бүртгэгдлээ. Баярлалаа!")}><span>▥</span><div><strong>Сургуулийн WiFi сүлжээний судалгаа</strong><small>6 хоног үлдлээ · 8 асуулт</small></div><b>Санал өгөх →</b></button></section>}
        <footer className="ulms-footer">© 2026 Сургаал Их Сургууль <span>University Learning Management System</span></footer>
      </div>
    </section>
    {modal && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null); }}><form className="modal-card" action={modal === "add" ? addProgram : enrollCourse}><button type="button" className="modal-close" onClick={() => setModal(null)}>×</button><div className="eyebrow">ИХ СУРГУУЛИЙН СУРГАЛТЫН СИСТЕМ</div><h2>{modal === "add" ? "Сургалтын хөтөлбөр нэмэх" : "Хичээл сонгох"}</h2><p>{modal === "add" ? "Тэнхим болон хөтөлбөрийн мэдээллийг бүртгэнэ үү." : "Энэ улиралд судлах хичээлээ сонгоно уу."}</p>{modal === "add" ? <><label>Хөтөлбөрийн нэр<input name="name" required placeholder="Жишээ: Программ хангамж" /></label><label>Сургууль, тэнхим<input name="faculty" required placeholder="Жишээ: Мэдээллийн технологийн сургууль" /></label><label>Зэрэг, хугацаа<input name="degree" required placeholder="Жишээ: Бакалавр · 4 жил" /></label></> : <label>Хичээл<select name="courseId" required defaultValue=""><option value="" disabled>Хичээл сонгох</option>{courses.filter((course) => !enrolledIds.includes(course.id)).map((course) => <option key={course.id} value={course.id}>{course.title} · {course.teacher}</option>)}</select></label>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setModal(null)}>Болих</button><button type="submit" className="primary-button">{modal === "add" ? "Хөтөлбөр хадгалах" : "Хичээл бүртгүүлэх"}</button></div></form></div>}
  </main>;
}
