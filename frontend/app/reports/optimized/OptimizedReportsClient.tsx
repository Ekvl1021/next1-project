"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { useUser } from "../../../context/UserContext";
import CourseBanner from "../../../components/CourseBanner";

const Report = dynamic(() => import("../../../components/Report"), {
  loading: () => <p role="status">Тайлан ачаалж байна…</p>,
});

export default function OptimizedReportsClient() {
  const { session, ready } = useUser();
  const [showReport, setShowReport] = useState(false);

  if (!ready) {
    return <main className="page-content reports-page"><p role="status">Хэрэглэгчийн мэдээлэл ачаалж байна…</p></main>;
  }

  if (!session) {
    return (
      <main className="page-content reports-page">
        <h1>Туршилтын B · Оновчилсон хувилбар</h1>
        <p>Тайлан үзэхийн тулд системд нэвтэрнэ үү.</p>
        <Link href="/login?next=%2Freports%2Foptimized">Нэвтрэх</Link>
      </main>
    );
  }

  return (
    <main className="page-content reports-page baseline-report-page">
      <Link href="/reports">← Тайлангийн туршилтууд руу буцах</Link>
      <h1>Туршилтын B · Оновчилсон хувилбар</h1>
      <p>Тайлан dynamic import-оор товч дарахад ачаална; banner-д next/image ашиглана.</p>
      <CourseBanner />
      <button className="reports-toggle" type="button" onClick={() => setShowReport(true)}>
        Тайлан нээх
      </button>
      {showReport && <div className="reports-content"><Report /></div>}
    </main>
  );
}
