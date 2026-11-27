"use client";

import { useState } from "react";
import type { SearchableCourse } from "./CourseSearch";

export default function CourseSelector({ courses }: { courses: SearchableCourse[] }) {
  const [selected, setSelected] = useState<SearchableCourse | null>(null);

  return (
    <section className="course-selector">
      <h2>Хичээл сонгох</h2>
      <div className="course-selector-options">
        {courses.map((course) => (
          <button
            key={course.id}
            type="button"
            className={selected?.id === course.id ? "selected" : ""}
            aria-pressed={selected?.id === course.id}
            onClick={() => setSelected(course)}
          >
            {course.name ?? course.title ?? `Course ${course.id}`}
          </button>
        ))}
      </div>
      {selected && (
        <div className="course-selector-details" aria-live="polite">
          <h3>{selected.name ?? selected.title ?? `Course ${selected.id}`}</h3>
          <p>ID: {selected.id}</p>
        </div>
      )}
    </section>
  );
}
