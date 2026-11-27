"use client";

import Link from "next/link";
import { useUser } from "../../../context/UserContext";
import Report from "../../../components/Report";

export default function BaselineReportsClient() {
  const { session, ready } = useUser();

  if (!ready) {
    return <main className="page-content reports-page"><p role="status">Хэрэглэгчийн мэдээлэл ачаалж байна…</p></main>;
  }

  if (!session) {
    return (
      <main className="page-content reports-page">
        <h1>Туршилтын A · Оновчлолын өмнө</h1>
        <p>Тайлан үзэхийн тулд системд нэвтэрнэ үү.</p>
        <Link href="/login?next=%2Freports%2Fbaseline">Нэвтрэх</Link>
      </main>
    );
  }

  return (
    <main className="page-content reports-page baseline-report-page">
      <Link href="/reports">← Тайлангийн туршилтууд руу буцах</Link>
      <h1>Туршилтын A · Оновчлолын өмнө</h1>
      <p>Report шууд импортлогдоно; зурагт энгийн img хэрэглэнэ. Энэ хувилбарт lazy loading, memoization байхгүй.</p>
      {/* This unoptimized image is intentional for the before-optimization baseline. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="baseline-course-image"
        src="/images/course-banner.svg"
        alt="Course Management — сургалтын системийн хичээлийн танилцуулга"
        width={1600}
        height={520}
      />
      <Report />
    </main>
  );
}
