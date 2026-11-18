"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";
import type { Course, Student } from "../lib/types";

type Teacher = { id: string | number; username: string; role: "teacher" };
type ReportData = { courses: number; students: number; teachers: number };

async function fetchReportData(): Promise<ReportData> {
  const [courses, students, teachers] = await Promise.all([
    apiRequest<Course[]>("/courses", {}, false),
    apiRequest<Student[]>("/students"),
    apiRequest<Teacher[]>("/teachers"),
  ]);
  return { courses: courses.length, students: students.length, teachers: teachers.length };
}

export default function Report() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetchReportData()
      .then((result) => {
        if (active) setData(result);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Тайлан татахад алдаа гарлаа.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function refreshReport() {
    setLoading(true);
    setError("");
    try {
      setData(await fetchReportData());
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Тайлан татахад алдаа гарлаа.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <p className="report-state" role="status">Тайлан ачаалж байна…</p>;
  if (error) {
    return (
      <div className="report-state error" role="alert">
        <p>Тайлан авахад алдаа гарлаа: {error}</p>
        <button type="button" onClick={() => void refreshReport()}>Дахин оролдох</button>
      </div>
    );
  }
  if (!data) return <p className="report-state" role="alert">Тайлангийн мэдээлэл олдсонгүй.</p>;

  return (
    <section className="report-card" aria-labelledby="course-statistics-heading">
      <div className="report-card-heading">
        <h2 id="course-statistics-heading">Course Statistics</h2>
        <button type="button" onClick={() => void refreshReport()}>Шинэчлэх</button>
      </div>
      <dl className="report-statistics">
        <div><dt>Нийт хичээл</dt><dd>{data.courses}</dd></div>
        <div><dt>Нийт оюутан</dt><dd>{data.students}</dd></div>
        <div><dt>Нийт багш</dt><dd>{data.teachers}</dd></div>
      </dl>
    </section>
  );
}
