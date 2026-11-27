"use client";

import Link from "next/link";
import Icon from "../../components/Icon";
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
  const [showPassword, setShowPassword] = useState(false);

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

  return <main className="sg-login">
    <section className="sg-login-story"><Link href="/" className="sg-brand"><span className="sg-brand-icon"><Icon name="cap" size={28} /></span><span>EDURA<span className="sg-brand-period">.</span><small>СУРГАЛТЫН ОРЧИН</small></span></Link><div className="sg-login-message"><span className="sg-login-kicker">СУРАЛЦАХАД ТӨВЛӨРСӨН ОРЧИН</span><h1>Өдөр бүрийг<br />арай цэгцтэй.</h1><p>Хичээл, төлөвлөгөө, суралцах ахицаа<br />нэг дороос удирдаарай.</p><div className="sg-login-features"><span><Icon name="book" />Хичээлийн мэдээлэл</span><span><Icon name="calendar" />Хичээл сонголт ба хуваарь</span><span><Icon name="chart" />Кредитээр жигнэсэн голч</span></div></div><small className="sg-login-copyright">EDURA · Сургалтын удирдлагын систем</small></section>
    <section className="sg-login-form-section"><div className="sg-login-form"><span className="sg-eyebrow">ТАВТАЙ МОРИЛ</span><h2>Дахин уулзахад таатай байна.</h2><p>Өөрийн бүртгэлээр сургалтын орчиндоо нэвтэрнэ үү.</p><form onSubmit={signIn}><label>Нэвтрэх нэр<input autoComplete="username" value={username} onChange={event => { setUsername(event.target.value); setError(""); }} placeholder="Таны нэвтрэх нэр" required /></label><label>Нууц үг<span className="sg-password"><input type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={event => { setPassword(event.target.value); setError(""); }} placeholder="Нууц үгээ оруулна уу" required /><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Нууц үг нуух" : "Нууц үг харуулах"} aria-pressed={showPassword}><Icon name="eye" size={19} /></button></span></label>{error && <p className="sg-login-error" role="alert">{error}</p>}<button className="sg-button sg-primary sg-login-submit" type="submit" disabled={busy}>{busy ? "Нэвтэрч байна…" : "Нэвтрэх"}</button></form><Link href="/" className="sg-login-home">Нүүр хуудас руу буцах</Link></div></section>
  </main>;
}
