"use client";
import { useRef, useState } from "react";

/**
 * Wraps a Habit/Task row with an optional swipe-right-to-check gesture.
 * Disabled (renders children untouched) unless `enabled` is true — driven
 * by the user's "Swipe to check" preference in Settings.
 *
 * Uses native touch events (not Pointer Events) with a direction lock:
 * the first several pixels of movement decide whether this is a
 * horizontal swipe or a vertical scroll, and only horizontal drags call
 * preventDefault — this is the pattern that reliably beats mobile
 * Safari's own scroll gesture, which raw pointer events alone often lose
 * to.
 */
const THRESHOLD = 70;
const LOCK_DISTANCE = 8;

export default function SwipeRow({ enabled, onComplete, done, children }) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef({ x: 0, y: 0 });
  const locked = useRef(null); // null | "x" | "y"
  const active = useRef(false);

  if (!enabled) return children;

  function onTouchStart(e) {
    if (done) return;
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY };
    locked.current = null;
    active.current = true;
    setDragging(true);
  }
  function onTouchMove(e) {
    if (!active.current) return;
    const t = e.touches[0];
    const dx = t.clientX - start.current.x;
    const dy = t.clientY - start.current.y;
    if (!locked.current) {
      if (Math.abs(dx) < LOCK_DISTANCE && Math.abs(dy) < LOCK_DISTANCE) return;
      locked.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (locked.current === "y") { active.current = false; setDragging(false); return; }
    }
    if (locked.current === "x") {
      e.preventDefault();
      setDragX(Math.max(0, Math.min(dx, 120)));
    }
  }
  function endGesture() {
    if (!active.current) { setDragging(false); return; }
    active.current = false;
    setDragging(false);
    if (locked.current === "x" && dragX >= THRESHOLD) onComplete?.();
    setDragX(0);
    locked.current = null;
  }

  // Mouse fallback (desktop testing / trackpad drag) — same logic, no
  // preventDefault needed since there's no competing scroll gesture.
  function onMouseDown(e) {
    if (done) return;
    start.current = { x: e.clientX, y: e.clientY };
    locked.current = "x";
    active.current = true;
    setDragging(true);
  }
  function onMouseMove(e) {
    if (!active.current || locked.current !== "x") return;
    setDragX(Math.max(0, Math.min(e.clientX - start.current.x, 120)));
  }

  return (
    <div
      style={{ position: "relative", overflow: "hidden", borderRadius: 12, touchAction: "pan-y" }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={endGesture}
      onTouchCancel={endGesture}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={endGesture}
      onMouseLeave={endGesture}
    >
      {dragX > 4 && (
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", paddingLeft: 16,
          background: dragX >= THRESHOLD ? "var(--green)" : "rgba(34,197,94,.35)", transition: "background .15s ease",
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 12 9 17 20 6" /></svg>
        </div>
      )}
      <div style={{ transform: `translateX(${dragX}px)`, transition: dragging ? "none" : "transform .25s cubic-bezier(.2,.8,.2,1)" }}>
        {children}
      </div>
    </div>
  );
}
