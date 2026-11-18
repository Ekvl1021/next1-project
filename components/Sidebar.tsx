"use client";

import Link from "next/link";
import { useUser } from "../context/UserContext";
import UserInfo from "./UserInfo";
import type { Course, DashboardSection } from "../lib/types";

type SidebarProps = {
  section: DashboardSection;
  studentCount: number;
  courses: Course[];
  onAddStudent: () => void;
  onSignOut: () => void;
};

export default function Sidebar({ section, studentCount, courses, onAddStudent, onSignOut }: SidebarProps) {
  const { session } = useUser();
  if (!session) return null;

  const canManage = session.role !== "student";
  return <aside className="sidebar">
    <Link className="brand" href="/dashboard"><span className="brand-mark">s</span><span>surgaal<span className="brand-dot">.</span><small>СУРГАЛТЫН СИСТЕМ</small></span></Link>
    <div className="side-label">ҮНДСЭН ЦЭС</div>
    <nav className="nav-list">
      <Link href="/dashboard" className={`nav-link ${section === "overview" ? "active" : ""}`}><span className="nav-icon">▦</span>Хяналтын самбар</Link>
      {canManage && <Link href="/students" className={`nav-link ${section === "students" ? "active" : ""}`}><span className="nav-icon">♙</span>Оюутнууд<span className="nav-count">{studentCount}</span></Link>}
      {canManage && <Link href="/courses" className={`nav-link ${section === "courses" ? "active" : ""}`}><span className="nav-icon">▤</span>Хичээлүүд<span className="nav-count">{courses.length}</span></Link>}
      {canManage && <Link href="/reports" className="nav-link"><span className="nav-icon">▥</span>Тайлан</Link>}
    </nav>
    <div className="sidebar-bottom"><div className="help-card"><span className="help-spark">✦</span><strong>Сургалтын систем</strong><p>Оюутан, багш, хичээлийн мэдээллээ удирдаарай.</p>{session.role === "admin" && <button onClick={onAddStudent}>＋ Бүртгэл нэмэх</button>}</div><div className="profile"><UserInfo variant="profile" /><button className="profile-logout" onClick={onSignOut}>Гарах</button></div></div>
  </aside>;
}
