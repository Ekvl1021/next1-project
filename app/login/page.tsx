"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { getTokenExpirationMs } from "../../lib/auth-session";
import { apiRequest } from "../../lib/api";
import { useUser } from "../../context/UserContext";

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useUser();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const data = await apiRequest<{ token: string; user: { name?: string; username: string; email?: string; role: "admin" | "teacher" | "student" } }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: username.trim(), password }),
      }, false);
      if (!data.token || !data.user) throw new Error("Серверийн нэвтрэх хариу буруу байна.");
      const expiresAt = getTokenExpirationMs(data.token);
      if (!expiresAt || expiresAt <= Date.now()) throw new Error("Серверээс ирсэн token-ийн хугацаа буруу байна.");
      const maxAge = Math.floor((expiresAt - Date.now()) / 1000);
      localStorage.setItem("surgaal-token", data.token);
      document.cookie = `surgaal-token=${encodeURIComponent(data.token)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
      setUser({
        name: data.user.name ?? data.user.username,
        email: data.user.email ?? "",
        role: data.user.role,
      });
      router.replace("/dashboard");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Сервертэй холбогдож чадсангүй.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="ulms-login-page">
    <div className="campus-skyline" aria-hidden="true"><span /><i /><b /><em /></div>
    <section className="ulms-login-card">
      <div className="ulms-login-brand"><div className="university-seal"><span>✦</span><b>С</b></div><div className="university-name">СУРГААЛ ИХ СУРГУУЛЬ<small>СУРГАЛТЫН УДИРДЛАГА</small></div><h1>СУРГАЛТЫН УДИРДЛАГА<br />МЕНЕЖМЕНТИЙН ЦАХИМ СИСТЕМ</h1><p>University Learning Management System</p></div>
      <div className="ulms-login-form-panel"><div className="login-form-wrap"><div className="login-eyebrow">ТАВТАЙ МОРИЛ</div><h2>СИСТЕМД НЭВТРЭХ</h2><form onSubmit={signIn}><label className="ulms-field"><span aria-hidden="true">♟</span><input autoComplete="username" value={username} onChange={(event) => { setUsername(event.target.value); setError(""); }} placeholder="Нэвтрэх нэр" aria-label="Нэвтрэх нэр" required /></label><label className="ulms-field"><span aria-hidden="true">▣</span><input type="password" autoComplete="current-password" value={password} onChange={(event) => { setPassword(event.target.value); setError(""); }} placeholder="Нууц үг" aria-label="Нууц үг" required /></label>{error && <div className="login-error" role="alert">{error}</div>}<div className="ulms-submit-row"><button type="submit" disabled={busy}>{busy ? "Шалгаж байна…" : <>Нэвтрэх <span>→</span></>}</button></div></form><div className="ulms-copyright">Copyright © 2026 University Learning Management</div></div></div>
    </section>
    <Link href="/" className="ulms-back-home">← Нүүр хуудас</Link>
  </main>;
}
