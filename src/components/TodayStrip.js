"use client";

/**
 * Slim row of cross-module status pills (e.g. QBank practiced today).
 */
export default function TodayStrip({ data, showPractice = true }) {
  if (!data) return null;
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "0 0 18px" }}>
      {showPractice && (
        <span className="tv-badge" style={{ fontSize: 12, padding: "6px 12px", fontWeight: 600 }}>
          {data.practicedToday ? "Practiced QBank today ✓" : "No QBank practice yet today"}
        </span>
      )}
    </div>
  );
}
