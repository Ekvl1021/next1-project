"use client";

import { useUser } from "../context/UserContext";

export default function CourseActions() {
  const { session } = useUser();

  return (
    <div className="course-actions">
      {(session?.role === "admin" || session?.role === "teacher") && (
        <button type="button">Course нэмэх</button>
      )}
      {session?.role === "admin" && (
        <button type="button" className="danger">Course устгах</button>
      )}
    </div>
  );
}
