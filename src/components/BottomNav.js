"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { IconHome, IconBook, IconStar, IconGrid, IconLayers, IconCalendar, IconSettings } from "@/components/Icons";
import { playSelect } from "@/lib/sounds";

/**
 * App-wide bottom navigation bar with ungrouped individual study pages.
 */
const AREAS = [
  { key: "study", label: "Study", href: "/study", icon: IconHome },
  { key: "tracker", label: "Tracker", href: "/tracker", icon: IconBook },
  { key: "library", label: "Library", href: "/library", icon: IconLayers },
  { key: "stats", label: "Stats", href: "/stats", icon: IconStar },
  { key: "plan", label: "Plan", href: "/plan", icon: IconCalendar },
  { key: "settings", label: "Settings", href: "/settings", icon: IconSettings },
];

export default function BottomNav({ active, onTabChange }) {
  const [pressedKey, setPressedKey] = useState(null);
  const itemRefs = useRef([]);
  const trackRef = useRef(null);
  const [indicator, setIndicator] = useState(null);

  const normalized =
    active === "dashboard" || active === "log" || active === "history" ? "stats" :
    active === "schedule" ? "plan" :
    active === "qbank" || active === "flashcards" ? "library" :
    active === "settings" ? "settings" :
    active;

  const activeKey = pressedKey || normalized;

  useEffect(() => {
    const idx = AREAS.findIndex((a) => a.key === activeKey);
    const el = itemRefs.current[idx];
    const track = trackRef.current;
    if (!el || !track) { setIndicator(null); return; }
    const er = el.getBoundingClientRect(), tr = track.getBoundingClientRect();
    setIndicator({ left: er.left - tr.left, width: er.width });
  }, [activeKey]);

  return (
    <nav className="bottom-nav" ref={trackRef} aria-label="Main">
      {indicator && (
        <div className="bottom-nav-indicator" style={{ transform: `translateX(${indicator.left}px)`, width: indicator.width }} />
      )}
      {AREAS.map((a, i) => {
        const Icon = a.icon;
        const isActive = activeKey === a.key;
        return (
          <Link
            key={a.key}
            href={a.href}
            prefetch={false}
            data-sound="none"
            ref={(el) => { itemRefs.current[i] = el; }}
            className={`bottom-nav-item ${isActive ? "active" : ""}`}
            style={{ textDecoration: "none" }}
            title={a.label}
            onClick={(e) => {
              if (onTabChange) {
                e.preventDefault();
                playSelect();
                setPressedKey(a.key);
                onTabChange(a.key, a.href);
                return;
              }
              if (a.key !== activeKey) {
                playSelect();
                setPressedKey(a.key);
              } else {
                e.preventDefault();
              }
            }}
          >
            <span className="bottom-nav-icon-wrap"><Icon style={{ width: 17, height: 17 }} /></span>
            <span>{a.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
