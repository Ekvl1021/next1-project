import type { CSSProperties } from "react";
export type IconName = "book" | "users" | "calendar" | "chart" | "plus" | "search" | "close" | "refresh" | "logout" | "check" | "edit" | "trash" | "menu" | "clock" | "cap" | "eye";
const paths: Record<IconName, React.ReactNode> = {
  book: <><path d="M4 4h6a3 3 0 0 1 3 3v14a4 4 0 0 0-4-3H4z"/><path d="M20 4h-4a3 3 0 0 0-3 3v14a4 4 0 0 1 4-3h3z"/></>,
  users: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 4v2"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18M7 15h2m4 0h2m2 3h-2"/></>,
  chart: <><path d="M4 3v17h17M8 15v-4m5 4V7m5 8v-6"/></>,
  plus: <path d="M12 5v14M5 12h14"/>, search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
  close: <path d="m6 6 12 12M6 18 18 6"/>, refresh: <><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1"/></>,
  logout: <><path d="M9 4H4v16h5m5-12 4 4-4 4m-5-4h12"/></>, check: <path d="m5 12 4 4L19 6"/>,
  edit: <><path d="m14 5 5 5M4 20l5-1L20 8a2 2 0 0 0-5-5L4 14z"/></>, trash: <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/></>,
  menu: <path d="M4 6h16M4 12h16M4 18h16"/>, clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  cap: <><path d="m2 9 10-5 10 5-10 5zM6 11v6q6 5 12 0v-6M22 9v8"/></>, eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12"/><circle cx="12" cy="12" r="3"/></>,
};
export default function Icon({ name, size = 20, style }: { name: IconName; size?: number; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>{paths[name]}</svg>;
}
