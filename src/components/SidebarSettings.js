"use client";
import { useEffect, useState } from "react";
import { IconDownload, IconTrash, IconArrowLeft, IconPower } from "@/components/Icons";
import { getSoundsEnabled, setSoundsEnabled, playTick } from "@/lib/sounds";

/**
 * Settings content — Night mode, UI Sounds toggle, optional
 * Swipe-to-check toggle, and Switch/Export/Reset/Log out actions.
 * Rendered inside the Settings slide-up sheet (see AppShell), so it no
 * longer manages its own open state — the sheet does that.
 *
 * The old accent-color picker (and the 18-palette system before it) was
 * removed when the app was rebuilt to match the Silent Moon reference —
 * there's one fixed look now, defined entirely in globals.css's :root /
 * html.mode-dark blocks, so there's nothing left to pick here.
 */
export default function SidebarSettings({
  supabase, userId, colorMode, onThemeChange,
  onExport, exportLabel = "Export", onReset, resetLabel = "Reset",
  onSwitch, switchLabel = "Switch",
  swipeToCheck = false, onSwipeToCheckChange,
  onLogout,
}) {
  const [soundsOn, setSoundsOn] = useState(true);

  useEffect(() => { setSoundsOn(getSoundsEnabled()); }, []);

  async function toggleColorMode() {
    playTick();
    const next = colorMode === "dark" ? "light" : "dark";
    document.documentElement.className = `mode-${next}`;
    onThemeChange?.({ colorMode: next });
    if (userId) await supabase.from("user_settings").upsert({ user_id: userId, color_mode: next }, { onConflict: "user_id" });
  }

  return (
    <div className="sidebar-settings-panel">
      <div className="sidebar-settings-label">Night mode</div>
      <button type="button" data-sound="none" onClick={toggleColorMode} className="sidebar-uisound-toggle">
        <span className={`sidebar-uisound-track ${colorMode === "dark" ? "on" : ""}`}><span className="sidebar-uisound-knob" /></span>
        Night mode {colorMode === "dark" ? "On" : "Off"}
      </button>

      <div className="sidebar-settings-label" style={{ marginTop: 14 }}>UI sounds</div>
      <button
        type="button"
        data-sound="none"
        onClick={() => setSoundsOn((v) => { const next = !v; setSoundsEnabled(next); if (next) playTick(); return next; })}
        className="sidebar-uisound-toggle"
      >
        <span className={`sidebar-uisound-track ${soundsOn ? "on" : ""}`}><span className="sidebar-uisound-knob" /></span>
        UI Sounds {soundsOn ? "On" : "Off"}
      </button>

      {onSwipeToCheckChange && (
        <>
          <div className="sidebar-settings-label" style={{ marginTop: 14 }}>Swipe to check</div>
          <button
            type="button"
            data-sound="none"
            onClick={() => onSwipeToCheckChange(!swipeToCheck)}
            className="sidebar-uisound-toggle"
          >
            <span className={`sidebar-uisound-track ${swipeToCheck ? "on" : ""}`}><span className="sidebar-uisound-knob" /></span>
            Swipe to check {swipeToCheck ? "On" : "Off"}
          </button>
        </>
      )}

      {(onExport || onReset || onSwitch || onLogout) && (
        <>
          <div className="sidebar-settings-label" style={{ marginTop: 14 }}>Actions</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
            {onSwitch && (
              <button type="button" data-sound="none" onClick={onSwitch} className="sidebar-data-btn">
                <IconArrowLeft style={{ width: 14, height: 14 }} /> {switchLabel}
              </button>
            )}
            {onExport && (
              <button type="button" data-sound="none" onClick={onExport} className="sidebar-data-btn">
                <IconDownload style={{ width: 14, height: 14 }} /> {exportLabel}
              </button>
            )}
            {onReset && (
              <button type="button" data-sound="none" onClick={onReset} className="sidebar-data-btn danger">
                <IconTrash style={{ width: 14, height: 14 }} /> {resetLabel}
              </button>
            )}
            {onLogout && (
              <button type="button" data-sound="none" onClick={onLogout} className="sidebar-data-btn">
                <IconPower style={{ width: 14, height: 14 }} /> Log out
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
