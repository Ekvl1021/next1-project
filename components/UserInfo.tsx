"use client";

import { useUser } from "../context/UserContext";

type UserInfoProps = { variant?: "header" | "profile" };

export default function UserInfo({ variant = "header" }: UserInfoProps) {
  const { session } = useUser();

  if (!session) return <p className={`user-info-empty user-info-${variant}`}>Нэвтрээгүй байна</p>;

  const role = session.role === "admin"
    ? "Администратор"
    : session.role === "teacher"
      ? "Багш"
      : "Оюутан";

  return (
    <div className={`user-info user-info-${variant}`}>
      <span className="user-info-avatar" aria-hidden="true">{session.name.slice(0, 1)}</span>
      <div>
        <strong>{session.name}</strong>
        <small>Эрх: {role}</small>
      </div>
    </div>
  );
}
