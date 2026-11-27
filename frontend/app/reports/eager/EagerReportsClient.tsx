"use client";

import Link from "next/link";
import { useState } from "react";
import { useUser } from "../../../context/UserContext";
import Report from "../../../components/Report";

export default function EagerReportsClient() {
  const { session, ready } = useUser();
  const [showReport, setShowReport] = useState(false);

  if (!ready) {
    return <main className="page-content reports-page"><p role="status">Хэрэглэгчийн мэдээлэл ачаалж байна…</p></main>;
  }

  if (!session) {
    return (
      <main className="page-content reports-page">
        <h1>Тайлан · шууд ачаалалт</h1>
        <p>Тайлан үзэхийн тулд системд нэвтэрнэ үү.</p>
        <Link href="/login?next=%2Freports%2Feager">Нэвтрэх</Link>
      </main>
    );
  }

  return (
    <main className="page-content reports-page">
      <Link href="/reports">← Lazy loading-ийн харьцуулалт руу буцах</Link>
      <h1>Тайлан · шууд ачаалалт</h1>
      <p>Report компонентын JavaScript энэ route-ийн эхний bundle-д орно. API хүсэлт тайлан нээхэд хийгдэнэ.</p>
      <button className="reports-toggle" type="button" onClick={() => setShowReport(true)}>
        Тайлан нээх
      </button>
      {showReport && <div className="reports-content"><Report /></div>}
    </main>
  );
}
