"use client";
import { useCallback, useEffect, useState } from "react";
import MemoCourseItem, { CourseItem } from "../../../components/CourseItem";
import { apiRequest } from "../../../lib/api";
import type { Course } from "../../../lib/types";

export default function RenderBenchmark() {
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [counter, setCounter] = useState(0);
  const [optimized, setOptimized] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    // Hydrate the test mode from the browser URL once.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOptimized(new URLSearchParams(window.location.search).get("mode") === "optimized");
    apiRequest<Course[]>("/api/courses").then(setCourses).catch((cause) => setError(String(cause)));
  }, []);
  const noop = useCallback(() => {}, []);
  const Item = optimized ? MemoCourseItem : CourseItem;
  return <main className="page-content">
    <h1>CourseItem render туршилт</h1>
    <p>{optimized ? "React.memo болон тогтвортой callback" : "Memo ашиглаагүй ижил CourseItem"}</p>
    <button id="render-counter" onClick={() => setCounter(value => value + 1)}>Counter {counter}</button>
    <output id="render-counter-value">{counter}</output>
    {error && <p role="alert">{error}</p>}
    {courses && <table id="render-test-table"><tbody>{courses.map((course, index) =>
      <Item key={course.id} course={course} index={index} enrollmentCount={0}
        canEdit={false} canDelete={false} onOpen={noop} onEdit={noop} onDelete={noop} />
    )}</tbody></table>}
  </main>;
}
