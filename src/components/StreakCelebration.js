"use client";
import { useEffect, useState } from "react";

/**
 * Plays the fire-hand GIF for a few seconds whenever `streak` increases
 * compared to the last value we saw for this user (tracked in
 * localStorage so it only fires once per new streak day, not on every
 * page load/re-render).
 */
export default function StreakCelebration({ streak, storageKey = "today_last_seen_streak" }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof streak !== "number") return;
    let last = null;
    try { const raw = localStorage.getItem(storageKey); last = raw === null ? null : Number(raw); } catch (e) { /* ignore */ }

    if (last !== null && streak > last) {
      setShow(true);
      const t = setTimeout(() => setShow(false), 2200);
      try { localStorage.setItem(storageKey, String(streak)); } catch (e) { /* ignore */ }
      return () => clearTimeout(t);
    }
    try { localStorage.setItem(storageKey, String(streak)); } catch (e) { /* ignore */ }
  }, [streak, storageKey]);

  if (!show) return null;

  return (
    <div className="streak-celebration" aria-hidden="true">
      <img src="/animations/streak-fire.gif" alt="" />
    </div>
  );
}
