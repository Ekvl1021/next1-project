"use client";

import { memo, useCallback, useMemo, useState } from "react";

export type SearchableCourse = {
  id: string | number;
  name?: string;
  title?: string;
  teacher?: string;
  schedule?: string;
  room?: string;
};

type CourseSearchProps = {
  courses: SearchableCourse[];
};

type CourseSearchResultProps = {
  course: SearchableCourse;
  selected: boolean;
  onSelect: (course: SearchableCourse) => void;
};

function CourseSearchResult({ course, selected, onSelect }: CourseSearchResultProps) {
  return (
    <li>
      <button
        type="button"
        className={`course-search-result${selected ? " selected" : ""}`}
        aria-pressed={selected}
        onClick={() => onSelect(course)}
      >
        {course.name ?? course.title ?? `Course ${course.id}`}
      </button>
    </li>
  );
}

const MemoizedCourseSearchResult = memo(CourseSearchResult);

export default function CourseSearch({ courses }: CourseSearchProps) {
  const [keyword, setKeyword] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<SearchableCourse | null>(null);
  const handleSelect = useCallback((course: SearchableCourse) => {
    setSelectedCourse(course);
  }, []);
  const normalizedKeyword = keyword.trim().toLowerCase();
  const filteredCourses = useMemo(
    () => courses.filter((course) =>
      (course.name ?? course.title ?? "").toLowerCase().includes(normalizedKeyword),
    ),
    [courses, normalizedKeyword],
  );
  const courseName = (course: SearchableCourse) => course.name ?? course.title ?? `Course ${course.id}`;

  return (
    <section className="course-search">
      <h3>Хичээл хайх</h3>
      <div className="course-search-controls">
        <input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="Хичээлийн нэр..."
          aria-label="Хичээлийн нэрээр хайх"
        />
        <button type="button" onClick={() => setKeyword("")} disabled={!keyword}>Цэвэрлэх</button>
      </div>
      {filteredCourses.length === 0 ? (
        <p>Тохирох хичээл олдсонгүй.</p>
      ) : (
        <ul>{filteredCourses.map((course) => (
          <MemoizedCourseSearchResult
            key={course.id}
            course={course}
            selected={selectedCourse?.id === course.id}
            onSelect={handleSelect}
          />
        ))}</ul>
      )}
      {selectedCourse && (
        <div className="course-search-details" aria-live="polite">
          <h4>{courseName(selectedCourse)}</h4>
          <dl>
            <div><dt>Курсийн ID</dt><dd>{selectedCourse.id}</dd></div>
            {selectedCourse.teacher && <div><dt>Багш</dt><dd>{selectedCourse.teacher}</dd></div>}
            {selectedCourse.schedule && <div><dt>Хуваарь</dt><dd>{selectedCourse.schedule}</dd></div>}
            {selectedCourse.room && <div><dt>Өрөө</dt><dd>{selectedCourse.room}</dd></div>}
          </dl>
        </div>
      )}
    </section>
  );
}
