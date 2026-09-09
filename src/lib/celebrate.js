"use client";

/**
 * Full-screen radial "flood" burst from a point (the tapped checkbox),
 * used to celebrate finishing every habit scheduled for the day. Purely
 * DOM-based (not React state) so it can fire-and-forget from any page —
 * originally lived only in Habits; now shared so Today can trigger the
 * same effect when its own checkboxes complete a perfect day.
 */
export function triggerCelebration(x, y) {
  if (typeof window === "undefined") return;
  x = typeof x === "number" ? x : window.innerWidth / 2;
  y = typeof y === "number" ? y : window.innerHeight * 0.32;
  const farX = Math.max(x, window.innerWidth - x), farY = Math.max(y, window.innerHeight - y);
  const scale = (Math.sqrt(farX * farX + farY * farY) / 18) * 1.15;
  const flood = document.createElement("div");
  flood.className = "h-celebrate-flood";
  flood.style.left = x + "px"; flood.style.top = y + "px";
  flood.style.setProperty("--flood-scale", scale);
  document.body.appendChild(flood);
  setTimeout(() => { if (flood.parentNode) flood.remove(); }, 3000);
}
