"use client";

import { useMemo, useState } from "react";
import { apiRequest } from "../lib/api";
import CourseSearch, { type SearchableCourse } from "./CourseSearch";

export default function InteractiveCourseList({ courses }: { courses: SearchableCourse[] }) {
  const [courseList, setCourseList] = useState(courses);
  const [teacher, setTeacher] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const teachers = useMemo(
    () => Array.from(new Set(courseList.map((course) => course.teacher).filter((value): value is string => Boolean(value)))),
    [courseList],
  );
  const filteredCourses = courseList.filter((course) => teacher === "all" || course.teacher === teacher);
  async function refreshCourses() {
    setIsLoading(true);
    setError("");
    try {
      const data = await apiRequest<SearchableCourse[] | { courses: SearchableCourse[] }>("/api/courses");
      setCourseList(Array.isArray(data) ? data : data.courses ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Хичээлүүдийг татахад алдаа гарлаа.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <div className="public-course-controls">
        <label>
          <span>Багш</span>
          <select value={teacher} onChange={(event) => setTeacher(event.target.value)}>
            <option value="all">Бүх багш</option>
            {teachers.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <button type="button" onClick={refreshCourses} disabled={isLoading}>
          {isLoading ? "Ачаалж байна…" : "Шинэчлэх"}
        </button>
        {teacher !== "all" && (
          <button type="button" onClick={() => setTeacher("all")}>Шүүлтүүр цэвэрлэх</button>
        )}
      </div>
      {error && <p className="course-list-error" role="alert">{error}</p>}
      {isLoading && <p role="status">Хичээлүүдийг шинэчилж байна…</p>}
      <CourseSearch courses={filteredCourses} />
    </>
  );
}
