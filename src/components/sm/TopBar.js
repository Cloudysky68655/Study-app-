"use client";
import { useRouter } from "next/navigation";
import { IconArrowLeft } from "./Icons";

/** Simple top bar: circular back button on the left, optional title,
 * optional right-side actions. Used on non-hero screens (choose-topic,
 * reminders, sleep-music list). Screens with a big illustration hero
 * (course/track detail, player) render their own back+actions row
 * absolutely positioned over the artwork instead. */
export default function TopBar({ title, onBack, dark = false, actions }) {
  const router = useRouter();
  return (
    <div className="sm-topbar">
      <button
        type="button"
        className={`sm-icon-btn${dark ? " sm-icon-btn-dark" : ""}`}
        onClick={onBack || (() => router.back())}
        aria-label="Back"
      >
        <IconArrowLeft />
      </button>
      {title ? <span className="sm-topbar-title">{title}</span> : <span />}
      <div className="sm-topbar-actions">{actions}</div>
    </div>
  );
}
