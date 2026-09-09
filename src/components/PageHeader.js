"use client";

/**
 * Shared top-of-page header (eyebrow + title + subtitle line + right-side
 * actions slot). Generalized from Study's tv-header block so Habits and
 * QBank stop hand-rolling their own inline-styled header markup.
 */
export default function PageHeader({ eyebrow, title, subtitle, right }) {
  return (
    <div className="tv-header" style={{ padding: "20px 32px 14px" }}>
      <div>
        {eyebrow && (
          <div className="eyebrow" style={{ marginBottom: 4 }}>{eyebrow}</div>
        )}
        <h1 style={{ margin: "2px 0 4px", fontSize: "clamp(28px, 4vw, 38px)", fontWeight: 800, letterSpacing: "-.055em", lineHeight: 0.95, fontFamily: "'Plus Jakarta Sans','Quicksand',sans-serif" }}>
          {title}
        </h1>
        {subtitle && <div style={{ color: "var(--soft)", fontSize: 13, fontWeight: 600, marginTop: 4 }}>{subtitle}</div>}
      </div>
      {right && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {right}
        </div>
      )}
    </div>
  );
}
