"use client";

/**
 * Shared loading skeleton used by every page while its data/session is
 * being fetched — so Today/Study/Habits/Tasks/QBank all "launch" the same
 * way instead of some showing a blank flash and others plain text. The
 * card blocks use var(--grad-primary), which is already redefined per
 * theme in globals.css, so the skeleton's colors shift with whichever
 * theme is active without any extra logic here.
 */
export default function PageSkeleton({ cards = 5 }) {
  return (
    <div className="skeleton-page">
      <div className="skeleton" style={{ width: 220, height: 34, marginBottom: 12 }} />
      <div className="skeleton" style={{ width: 320, height: 16, marginBottom: 28 }} />
      <div className="skeleton-grad-row">
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="skeleton-grad-card">
            <div className="skeleton-on-grad" style={{ width: "60%", height: 10 }} />
            <div className="skeleton-on-grad" style={{ width: "45%", height: 26 }} />
            <div className="skeleton-on-grad" style={{ width: "100%", height: 7 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
