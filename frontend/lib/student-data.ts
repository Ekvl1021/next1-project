import type { Student } from "./types";
type StudentRow = Partial<Student> & { id: string | number; name?: string };
export function normalizeStudents(rows: StudentRow[]): Student[] {
  return rows.map(row => ({
    id: row.id,
    code: row.code || "",
    firstName: row.firstName || row.name || "",
    lastName: row.lastName || "",
    email: row.email || "",
    program: row.program || "",
    courseId: row.courseId,
    selectedCourses: row.selectedCourses || [],
  }));
}
