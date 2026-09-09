'use client';
import { useEffect, useRef } from 'react';

/**
 * A single persistent "liquid pill" that travels between sidebar nav
 * items, instead of each item drawing its own active background.
 *
 * Physics model (all done by hand with rAF, no animation library):
 *  - Position (top) is a damped spring chasing the active item's offset.
 *  - A second, faster spring tracks the *speed* of that position spring
 *    and turns it into a vertical stretch (scaleY up, scaleX down to
 *    conserve "volume"), so the pill elongates while travelling fast and
 *    relaxes back to its resting 1:1 shape as it arrives — classic
 *    squash & stretch, which is what sells the "liquid" feel.
 *
 * itemRefs   — ref to an array of DOM nodes (one per nav item, in order)
 * activeIndex— index of the currently active item, or -1 if none (hides)
 * containerRef — the positioned ancestor the items live in
 * active     — whether the pill should be visible right now
 */
export default function NavActiveIndicator({ itemRefs, activeIndex, containerRef, active = true }) {
  const elRef = useRef(null);
  const state = useRef({
    top: 0,
    height: 40,
    velTop: 0,
    stretch: 0,
    velStretch: 0,
    targetTop: 0,
    targetHeight: 40,
    raf: null,
    initialized: false,
  });

  const measure = () => {
    const el = itemRefs.current[activeIndex];
    const container = containerRef.current;
    if (!el || !container) return null;
    return { top: el.offsetTop, height: el.offsetHeight };
  };

  useEffect(() => {
    const target = measure();
    const s = state.current;
    if (!target) return; // e.g. tab === "study": nothing to chase, hold last position

    s.targetTop = target.top;
    s.targetHeight = target.height;

    if (!s.initialized) {
      s.top = target.top;
      s.height = target.height;
      s.initialized = true;
      if (elRef.current) {
        elRef.current.style.height = `${s.height}px`;
        elRef.current.style.transform = `translate(-50%, ${s.top}px) scaleY(1) scaleX(1)`;
      }
      return;
    }

    if (s.raf) cancelAnimationFrame(s.raf);

    const STIFFNESS = 210;
    const DAMPING = 22;
    const STRETCH_STIFFNESS = 170;
    const STRETCH_DAMPING = 16;

    let last = performance.now();

    const tick = (now) => {
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;

      // Position spring — chases targetTop.
      const dx = s.targetTop - s.top;
      const accel = dx * STIFFNESS - s.velTop * DAMPING;
      s.velTop += accel * dt;
      s.top += s.velTop * dt;

      // Stretch spring — chases a target derived from current speed, so it
      // elongates mid-travel and relaxes once the position spring settles.
      const speed = Math.abs(s.velTop);
      const stretchTarget = Math.min(0.55, speed / 900);
      const dstr = stretchTarget - s.stretch;
      const accelStr = dstr * STRETCH_STIFFNESS - s.velStretch * STRETCH_DAMPING;
      s.velStretch += accelStr * dt;
      s.stretch += s.velStretch * dt;

      const scaleY = 1 + s.stretch;
      const scaleX = 1 - s.stretch * 0.5;

      if (elRef.current) {
        elRef.current.style.height = `${s.targetHeight}px`;
        elRef.current.style.transform =
          `translate(-50%, ${s.top}px) scaleY(${scaleY}) scaleX(${scaleX})`;
      }

      const atRest =
        Math.abs(dx) < 0.4 &&
        Math.abs(s.velTop) < 2 &&
        Math.abs(s.stretch) < 0.005 &&
        Math.abs(s.velStretch) < 0.01;

      if (!atRest) {
        s.raf = requestAnimationFrame(tick);
      } else {
        s.top = s.targetTop;
        s.stretch = 0;
        s.velTop = 0;
        s.velStretch = 0;
        if (elRef.current) {
          elRef.current.style.transform = `translate(-50%, ${s.top}px) scaleY(1) scaleX(1)`;
        }
        s.raf = null;
      }
    };

    s.raf = requestAnimationFrame(tick);
    return () => {
      if (s.raf) cancelAnimationFrame(s.raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  // Keep it correctly placed if the layout reflows (resize, font load, etc).
  useEffect(() => {
    const onResize = () => {
      const target = measure();
      if (!target) return;
      const s = state.current;
      s.targetTop = target.top;
      s.targetHeight = target.height;
      if (!s.raf && elRef.current) {
        s.top = target.top;
        s.height = target.height;
        elRef.current.style.height = `${s.height}px`;
        elRef.current.style.transform = `translate(-50%, ${s.top}px) scaleY(1) scaleX(1)`;
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={elRef}
      aria-hidden="true"
      className="nav-liquid-indicator"
      style={{ height: 40, opacity: active ? 1 : 0, transition: 'opacity .25s ease' }}
    />
  );
}
