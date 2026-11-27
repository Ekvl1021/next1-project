export type Student = {
  id: string | number;
  code: string;
  firstName: string;
  lastName: string;
  email: string;
  program: string;
  courseId?: string;
  selectedCourses?: { id: string; title: string; status?: "pending" | "approved" | "rejected" }[];
};
export type Course = { id: string; title: string; teacher: string; schedule: string; room: string; code?: string; credits?: number; year?: number; semester?: number; category?: string; sessions?: CourseSession[]; approvedCount?: number; pendingCount?: number };
export type CourseSelection = {
  id: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  courseId: string;
  course: Course;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  reviewedAt: string | null;
};
export type DashboardSection = "assignments" | "exams" | "overview" | "students" | "courses" | "planner" | "selection" | "schedule" | "grades" | "reports" | "attendance" | "teachers";
export type SessionUser = { name: string; email: string; role: "admin" | "teacher" | "student" };

export type ScheduleEntry = { id: string; title: string; day: number; start: string; end: string; room: string };
export type PlannerTask = { id: string; title: string; due: string; priority: "low" | "normal" | "high"; done: boolean; kind: "assignment" | "exam" | "personal" };
export type GradeEntry = { id: string; title: string; credits: number; score: number; letter: string; point: number; term: string };
export type PlannerData = { schedule: ScheduleEntry[]; tasks: PlannerTask[]; grades: GradeEntry[] };
export type CourseSession = { day: number; start: string; end: string; room: string; kind: string };
export type TeacherProfile = { id: number; username: string; displayName: string; photo: string; department: string; position: string; bio: string; office: string; courses: { id: string; title: string; code?: string; credits?: number }[] };
export type OfficialGrade = { id: string; studentCode: string; courseId: string; term: string; score: number; markedBy: string; course?: Course };
