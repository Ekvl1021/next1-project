import { Suspense } from "react";
import Welcome from "../../components/Welcome";
import InteractiveCourseList from "../../components/InteractiveCourseList";
import CourseBanner from "../../components/CourseBanner";

type Course = { id: string | number; name?: string; title?: string };

async function CourseList() {
  const apiUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
  const response = await fetch(`${apiUrl}/courses`, { cache: "no-store" });
  if (!response.ok) throw new Error("Course мэдээлэл авахад алдаа гарлаа");
  const courses: Course[] = await response.json();

  return <InteractiveCourseList courses={courses} />;
}

export default function CoursesServerPage() {
  return <main className="server-course-page">
    <div className="server-course-intro">
      <span>СУРГАЛТЫН СИСТЕМ · SERVER COMPONENT</span>
      <h1>Course жагсаалт</h1>
      <p>Нийтийн хичээлийн мэдээллийг сервер талаас татаж харуулж байна.</p>
    </div>
    <CourseBanner />
    <div className="server-course-grid">
      <section className="server-course-panel">
        <h2>Нийтэд нээлттэй хичээлүүд</h2>
        <Suspense fallback={<p role="status">Course жагсаалт ачаалж байна…</p>}>
          <CourseList />
        </Suspense>
      </section>
      <Welcome />
    </div>
  </main>;
}
