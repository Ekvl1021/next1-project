"use client";

import { lazy, Suspense, useState } from "react";

const Report = lazy(() => import("./Report"));

export default function LazyReportPanel() {
  const [reportLoaded, setReportLoaded] = useState(false);
  const [showReport, setShowReport] = useState(false);

  function toggleReport() {
    if (!reportLoaded) setReportLoaded(true);
    setShowReport((visible) => !visible);
  }

  return (
    <section className="report-method-panel">
      <h2>React.lazy + Suspense</h2>
      <p>React-ийн ерөнхий lazy loading; loading UI-г Suspense fallback-аар тодорхойлно.</p>
      <button className="reports-toggle" type="button" onClick={toggleReport}>
        {showReport ? "Тайлан нуух" : reportLoaded ? "Тайлан харуулах" : "Тайлан нээх"}
      </button>
      {reportLoaded && (
        <div className="reports-content" hidden={!showReport}>
          <Suspense fallback={<p role="status">Тайлан ачаалж байна…</p>}>
            <Report />
          </Suspense>
        </div>
      )}
    </section>
  );
}
