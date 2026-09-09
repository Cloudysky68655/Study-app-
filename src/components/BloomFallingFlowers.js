"use client";

// Bloom theme's signature falling-flowers decoration. Purely CSS-driven
// (position:fixed, gated to html.theme-bloom in globals.css) so rendering
// it once here — instead of inside a single page — makes it show up on
// every page while Bloom is active, same fix as the background blobs.
const FALLING_FLOWERS = [
  { left: "4%", width: 22, dur: "13s", delay: "-2s", color: "var(--amber)" },
  { left: "16%", width: 16, dur: "17s", delay: "-9s", color: "var(--pink)", alt: true },
  { left: "28%", width: 26, dur: "15s", delay: "-5s", color: "var(--purple)" },
  { left: "42%", width: 18, dur: "19s", delay: "-1s", color: "var(--amber)", alt: true },
  { left: "56%", width: 24, dur: "14s", delay: "-7s", color: "var(--pink)" },
  { left: "68%", width: 20, dur: "16s", delay: "-11s", color: "var(--purple)", alt: true },
  { left: "78%", width: 15, dur: "18s", delay: "-4s", color: "var(--amber)" },
  { left: "88%", width: 23, dur: "12s", delay: "-8s", color: "var(--pink)", alt: true },
  { left: "96%", width: 17, dur: "20s", delay: "-13s", color: "var(--purple)" },
  { left: "10%", width: 19, dur: "21s", delay: "-16s", color: "var(--amber)", alt: true },
];

export default function BloomFallingFlowers() {
  return (
    <div className="decor-flowers-bloom" aria-hidden="true">
      {FALLING_FLOWERS.map((f, i) => (
        <svg
          key={i}
          className={f.alt ? "alt" : ""}
          style={{ left: f.left, width: f.width, animationDuration: f.dur, animationDelay: f.delay }}
          viewBox="0 0 24 24"
          fill={f.color}
        >
          <path d="M12 0c1 3.5-1.5 5-1.5 8.5C10.5 11 12 12 12 12s1.5-1 1.5-3.5C13.5 5 11 3.5 12 0zM12 24c-1-3.5 1.5-5 1.5-8.5C13.5 13 12 12 12 12s-1.5 1-1.5 3.5C10.5 19 13 20.5 12 24zM0 12c3.5-1 5 1.5 8.5 1.5C11 13.5 12 12 12 12s-1-1.5-3.5-1.5C5 10.5 3.5 13 0 12zM24 12c-3.5 1-5-1.5-8.5-1.5C13 10.5 12 12 12 12s1 1.5 3.5 1.5C19 13.5 20.5 11 24 12z" />
        </svg>
      ))}
    </div>
  );
}
