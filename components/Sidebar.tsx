"use client";
import Link from "next/link";
import { useUser } from "../context/UserContext";
import type { DashboardSection } from "../lib/types";
import Icon from "./Icon";
import { navigation } from "../lib/navigation";
const roles = { admin: "Администратор", teacher: "Багш", student: "Оюутан" };
export default function Sidebar({ section, open, onClose, onSignOut }: { section: DashboardSection; open: boolean; onClose: () => void; onSignOut: () => void }) {
  const { session } = useUser();
  if (!session) return null;
  const links = navigation(session.role);
  return <>
    {open && <button className="sg-nav-backdrop" onClick={onClose} aria-label="Цэс хаах" />}
    <aside id="app-sidebar" className={`sg-sidebar ${open ? "is-open" : ""}`}>
      <Link href="/dashboard" className="sg-brand" onClick={onClose}><span className="sg-brand-icon"><Icon name="cap" size={26} /></span><span>EDURA<span className="sg-brand-period">.</span><small>СУРГАЛТЫН ОРЧИН</small></span></Link>
      <div className="sg-side-label">МИНИЙ ОРЧИН</div>
      <nav aria-label="Үндсэн цэс">{links.map(link => <Link key={link.key} href={link.href} onClick={onClose} aria-current={section === link.key ? "page" : undefined} className={section === link.key ? "is-active" : ""}><Icon name={link.icon} /><span>{link.text}</span>{section === link.key && <i />}</Link>)}</nav>
      <div className="sg-side-note"><span className="sg-note-symbol"><Icon name="cap" /></span><strong>2026–2027 · Намрын улирал</strong><p>{session.role === 'student' ? 'Сонголтоо илгээж, баталгаажсан хуваариа хараарай.' : session.role === 'teacher' ? 'Таны хичээл, оюутан, үнэлгээ нэг дор.' : 'Сургалтын үйл ажиллагааны удирдлага.'}</p><Link href="/dashboard" onClick={onClose}>Сургалтын орчин</Link></div>
      <div className="sg-side-user"><span className="sg-avatar">{session.name.charAt(0).toUpperCase()}</span><div><strong>{session.name}</strong><small>{roles[session.role]}</small></div><button onClick={onSignOut} aria-label="Системээс гарах" title="Гарах"><Icon name="logout" size={18} /><span>Гарах</span></button></div>
    </aside>
  </>;
}
