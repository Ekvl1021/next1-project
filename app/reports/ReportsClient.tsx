"use client";

import Link from "next/link";
import { useUser } from "../../context/UserContext";
import { useState } from "react";
import DynamicReportPanel from "../../components/DynamicReportPanel";
import LazyReportPanel from "../../components/LazyReportPanel";

type ReportMethod = "dynamic" | "lazy";

export default function ReportsClient() {
  const { session, ready } = useUser();
  const [method, setMethod] = useState<ReportMethod>("dynamic");

  if (!ready) {
    return <main className="page-content reports-page"><p role="status">Хэрэглэгчийн мэдээлэл ачаалж байна…</p></main>;
  }

  if (!session) {
    return (
      <main className="page-content reports-page">
        <h1>Тайлан</h1>
        <p>Тайлан үзэхийн тулд системд нэвтэрнэ үү.</p>
        <Link href="/login?next=%2Freports">Нэвтрэх</Link>
      </main>
    );
  }

  return (
    <main className="page-content reports-page">
      <h1>Тайлан</h1>
      <p>Нэг аргыг сонгоод тайланг нээж, lazy loading-ийн хоёр хувилбарыг харьцуулна уу.</p>
      <p><Link href="/reports/eager">Lazy loading ашиглаагүй хувилбарыг нээх</Link></p>
      <p><Link href="/reports/baseline">Туршилтын A · оновчлолын өмнөх хувилбар</Link></p>
      <p><Link href="/reports/optimized">Туршилтын B · оновчилсон хувилбар</Link></p>
      <div className="report-method-switch" role="group" aria-label="Lazy loading арга сонгох">
        <button
          type="button"
          className={method === "dynamic" ? "active" : ""}
          aria-pressed={method === "dynamic"}
          onClick={() => setMethod("dynamic")}
        >
          next/dynamic
        </button>
        <button
          type="button"
          className={method === "lazy" ? "active" : ""}
          aria-pressed={method === "lazy"}
          onClick={() => setMethod("lazy")}
        >
          React.lazy
        </button>
      </div>
      {method === "dynamic" ? <DynamicReportPanel /> : <LazyReportPanel />}
      <p className="report-method-note">
        Тайлан нээх хүртэл lazy хувилбарын JS болон API-г татахгүй. Lazy loading ашиглаагүй хувилбарт Report JS эхний route bundle-д орсон байна; API хүсэлт товч дарахад л хийгдэнэ.
      </p>
    </main>
  );
}
