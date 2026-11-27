import { Suspense } from "react";
import { cookies } from "next/headers";
import Welcome from "../../components/Welcome";
import InteractiveCourseList from "../../components/InteractiveCourseList";
import CourseBanner from "../../components/CourseBanner";

type Course = { id: string | number; name?: string; title?: string };

async function CourseList() {
  const apiUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002";
  const token = (await cookies()).get("surgaal-token")?.value;
  const response = await fetch(`${apiUrl}/api/courses`, {
    cache: "no-store",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error(response.status === 401 ? "Course үзэхийн тулд нэвтэрнэ үү." : "Course мэдээлэл авахад алдаа гарлаа");
  const courses: Course[] = await response.json();

  return <InteractiveCourseList courses={courses} />;
}

export default function CoursesServerPage() {
  return <main className="server-course-page">
    <div className="server-course-intro">
      <span>СУРГАЛТЫН СИСТЕМ · SERVER COMPONENT</span>
      <h1>Course жагсаалт</h1>
      <p>Нэвтэрсэн хэрэглэгчийн хичээлийн мэдээллийг сервер талаас татаж харуулж байна.</p>
    </div>
    <CourseBanner />
    <div className="server-course-grid">
      <section className="server-course-panel">
        <h2>Хичээлийн жагсаалт</h2>
        <Suspense fallback={<p role="status">Course жагсаалт ачаалж байна…</p>}>
          <CourseList />
        </Suspense>
      </section>
      <Welcome />
    </div>
  </main>;
}
