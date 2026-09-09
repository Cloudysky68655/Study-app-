"use client";
import { playTick } from "@/lib/sounds";

/**
 * Silent-Moon design system: one fixed look, so the only user-facing
 * choice left here is day/night mode. The old 3-style picker + 18-palette
 * grid were removed per explicit request when the app was rebuilt to
 * match the Silent Moon reference — colors now live only in
 * globals.css's :root / html.mode-dark blocks.
 *
 * Kept a similar prop shape so every page that renders
 * <ThemeSwitcher {...themeProps} /> via SidebarSettings didn't need its
 * call site rewritten — theme/palette are still accepted but ignored.
 */
export default function ThemeSwitcher({ supabase, userId, colorMode, onChange }) {
  async function toggleColorMode() {
    playTick();
    const next = colorMode === "dark" ? "light" : "dark";
    document.documentElement.className = `mode-${next}`;
    onChange({ colorMode: next });
    if (userId) await supabase.from("user_settings").upsert({ user_id: userId, color_mode: next }, { onConflict: "user_id" });
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <button
        onClick={toggleColorMode}
        data-sound="none"
        title="Toggle day/night mode"
        style={{
          width: 38, height: 38, borderRadius: "50%", border: "1px solid var(--panel-border)",
          background: "var(--glass-bg)", color: "var(--soft)", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}
      >
        {colorMode === "dark" ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></svg>
        )}
      </button>
      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--soft)" }}>
        {colorMode === "dark" ? "Night mode" : "Day mode"}
      </span>
    </div>
  );
}
