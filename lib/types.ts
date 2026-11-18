export type Student = { id: string; name: string; email: string; program: string; courseId: string };
export type Course = { id: string; title: string; teacher: string; schedule: string; room: string };
export type DashboardSection = "overview" | "students" | "courses";
export type SessionUser = { name: string; email: string; role: "admin" | "teacher" | "student" };
