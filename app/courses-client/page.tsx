"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../../lib/api";
import CourseSearch, { type SearchableCourse } from "../../components/CourseSearch";
import CourseBanner from "../../components/CourseBanner";

async function fetchCourses() {
  return apiRequest<SearchableCourse[] | { courses: SearchableCourse[] }>("/api/courses");
}

export default function CoursesClientPage() {
  const [courses, setCourses] = useState<SearchableCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCourses = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchCourses();
      setCourses(Array.isArray(data) ? data : data.courses ?? []);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Хүсэлт амжилтгүй.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchCourses()
      .then((data) => {
        if (active) setCourses(Array.isArray(data) ? data : data.courses ?? []);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Хүсэлт амжилтгүй.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return <main className="client-course-page">
    <header className="client-course-heading">
      <span>СУРГАЛТЫН СИСТЕМ · CLIENT COMPONENT</span>
      <h1>Хичээлийн жагсаалт</h1>
      <p>Хичээлээ хайж, сонгоод мэдээлэлтэй нь танилцаарай.</p>
    </header>
    <CourseBanner />
    {loading ? (
      <div className="client-course-state" role="status"><span className="client-course-spinner" />Мэдээлэл ачаалж байна…</div>
    ) : error ? (
      <div className="client-course-state error" role="alert">
        <strong>Мэдээлэл авахад алдаа гарлаа</strong>
        <span>{error}</span>
        <button type="button" onClick={() => void loadCourses()} disabled={loading}>Дахин оролдох</button>
      </div>
    ) : courses.length === 0 ? (
      <div className="client-course-state">Хичээл олдсонгүй.</div>
    ) : (
      <div className="client-course-results">
        <div className="client-course-card-heading">
          <span>ХИЧЭЭЛИЙН ЖАГСААЛТ</span>
          <div className="client-course-heading-actions">
            <strong>{courses.length} хичээл</strong>
            <button className="course-refresh-button" type="button" onClick={() => void loadCourses()} disabled={loading}>
              {loading ? "Ачаалж байна…" : "Шинэчлэх"}
            </button>
          </div>
        </div>
        <CourseSearch courses={courses} />
      </div>
    )}
  </main>;
}
