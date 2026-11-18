"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

const Report = dynamic(() => import("./Report"), {
  loading: () => <p role="status">Тайлан ачаалж байна…</p>,
});

export default function DynamicReportPanel() {
  const [reportLoaded, setReportLoaded] = useState(false);
  const [showReport, setShowReport] = useState(false);

  function toggleReport() {
    if (!reportLoaded) setReportLoaded(true);
    setShowReport((visible) => !visible);
  }

  return (
    <section className="report-method-panel">
      <h2>Next.js next/dynamic</h2>
      <p>Next.js-тэй уялдсан loading fallback болон нэмэлт SSR тохиргоотой.</p>
      <button className="reports-toggle" type="button" onClick={toggleReport}>
        {showReport ? "Тайлан нуух" : reportLoaded ? "Тайлан харуулах" : "Тайлан нээх"}
      </button>
      {reportLoaded && (
        <div className="reports-content" hidden={!showReport}>
          <Report />
        </div>
      )}
    </section>
  );
}
