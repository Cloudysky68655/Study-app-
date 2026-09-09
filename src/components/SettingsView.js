"use client";
import { useEffect, useState } from "react";
import {
  IconSettings,
  IconDownload,
  IconTrash,
  IconArrowLeft,
  IconPower,
  IconBook,
  IconCheck,
  IconCalendar,
  IconStar,
  IconClock,
} from "@/components/Icons";
import { getSoundsEnabled, setSoundsEnabled, playTick, playSelect } from "@/lib/sounds";

export default function SettingsView({
  user,
  supabase,
  colorMode,
  onThemeChange,
  activeUnitId,
  activeUnitName,
  onSwitchUnit,
  settings,
  setSettings,
  onExport,
  onReset,
  onLogout,
  onGoPlan,
  showToast,
}) {
  const [soundsOn, setSoundsOn] = useState(true);
  const [savingPasses, setSavingPasses] = useState(false);

  useEffect(() => {
    setSoundsOn(getSoundsEnabled());
  }, []);

  async function toggleColorMode() {
    playTick();
    const next = colorMode === "dark" ? "light" : "dark";
    document.documentElement.className = `mode-${next}`;
    onThemeChange?.({ colorMode: next });
    if (user?.id) {
      await supabase
        .from("user_settings")
        .upsert({ user_id: user.id, color_mode: next }, { onConflict: "user_id" });
    }
  }

  function handleToggleSounds() {
    const next = !soundsOn;
    setSoundsEnabled(next);
    setSoundsOn(next);
    if (next) playTick();
  }

  function testSound() {
    playTick();
    showToast?.("Played sound effect");
  }

  const currentPasses = settings?.target_passes || 5;

  async function updateTargetPasses(newPasses) {
    if (newPasses < 1 || newPasses > 15 || savingPasses) return;
    playSelect();
    setSavingPasses(true);
    setSettings?.((s) => ({ ...s, target_passes: newPasses }));
    if (user?.id) {
      await supabase
        .from("user_settings")
        .upsert({ user_id: user.id, target_passes: newPasses }, { onConflict: "user_id" });
    }
    setSavingPasses(false);
    showToast?.(`Target set to ${newPasses} passes`);
  }

  return (
    <div style={{ maxWidth: 840, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24, paddingBottom: 60 }}>
      {/* 1. Appearance & Theme Card */}
      <section className="card" style={{ padding: "22px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "color-mix(in srgb, var(--purple) 16%, transparent)",
              color: "var(--purple)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconSettings style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--ink)" }}>Appearance & Theme</h2>
            <div style={{ fontSize: 12, color: "var(--soft)" }}>Customize display modes and visual styling</div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            background: "var(--panel-solid)",
            borderRadius: 14,
            border: "1px solid var(--panel-border)",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>
              Night Mode ({colorMode === "dark" ? "Dark Mode" : "Light Mode"})
            </div>
            <div style={{ fontSize: 12, color: "var(--soft)", marginTop: 2 }}>
              {colorMode === "dark"
                ? "Reduced glare optimized for evening review"
                : "Standard high-contrast light theme"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, background: "var(--panel)", padding: 4, borderRadius: 100, border: "1px solid var(--panel-border)" }}>
            <button
              type="button"
              onClick={() => { if (colorMode === "dark") toggleColorMode(); }}
              style={{
                border: "none",
                borderRadius: 100,
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                background: colorMode !== "dark" ? "var(--panel-solid)" : "transparent",
                color: colorMode !== "dark" ? "var(--ink)" : "var(--soft)",
                boxShadow: colorMode !== "dark" ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              Light
            </button>
            <button
              type="button"
              onClick={() => { if (colorMode !== "dark") toggleColorMode(); }}
              style={{
                border: "none",
                borderRadius: 100,
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                background: colorMode === "dark" ? "var(--purple)" : "transparent",
                color: colorMode === "dark" ? "#fff" : "var(--soft)",
                boxShadow: colorMode === "dark" ? "0 2px 8px rgba(143,140,243,0.3)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              Night (Dark)
            </button>
          </div>
        </div>
      </section>

      {/* 2. Sound & Feedback Card */}
      <section className="card" style={{ padding: "22px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "color-mix(in srgb, var(--green) 16%, transparent)",
              color: "var(--green)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconClock style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--ink)" }}>Audio & Feedback</h2>
            <div style={{ fontSize: 12, color: "var(--soft)" }}>Haptic audio clicks and completion cues</div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            background: "var(--panel-solid)",
            borderRadius: 14,
            border: "1px solid var(--panel-border)",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>
              UI Sound Effects
            </div>
            <div style={{ fontSize: 12, color: "var(--soft)", marginTop: 2 }}>
              Subtle audio ticks on navigation, quiz choices, and study timer alerts
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {soundsOn && (
              <button
                type="button"
                onClick={testSound}
                style={{
                  background: "transparent",
                  border: "1px solid var(--panel-border)",
                  borderRadius: 100,
                  padding: "5px 12px",
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: "var(--soft)",
                  cursor: "pointer",
                }}
              >
                Test Sound
              </button>
            )}
            <button
              type="button"
              onClick={handleToggleSounds}
              className="sidebar-uisound-toggle"
              style={{ margin: 0 }}
            >
              <span className={`sidebar-uisound-track ${soundsOn ? "on" : ""}`}>
                <span className="sidebar-uisound-knob" />
              </span>
              <span>{soundsOn ? "Enabled" : "Muted"}</span>
            </button>
          </div>
        </div>
      </section>

      {/* 3. Curriculum & Goal Preferences */}
      <section className="card" style={{ padding: "22px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "color-mix(in srgb, var(--orange) 16%, transparent)",
              color: "var(--orange)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconBook style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--ink)" }}>Curriculum & Study Goals</h2>
            <div style={{ fontSize: 12, color: "var(--soft)" }}>Active subject and spaced repetition target passes</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Active Unit Row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 16px",
              background: "var(--panel-solid)",
              borderRadius: 14,
              border: "1px solid var(--panel-border)",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 700, color: "var(--soft)" }}>
                Current Subject
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "var(--ink)", marginTop: 2 }}>
                {activeUnitName || "Cardiology & Respiratory"}
              </div>
            </div>
            {onSwitchUnit && (
              <button
                type="button"
                onClick={onSwitchUnit}
                className="sidebar-data-btn"
                style={{ width: "auto", padding: "8px 16px" }}
              >
                <IconArrowLeft style={{ width: 14, height: 14 }} /> Switch Subject
              </button>
            )}
          </div>

          {/* Target Passes Goal */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 16px",
              background: "var(--panel-solid)",
              borderRadius: 14,
              border: "1px solid var(--panel-border)",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>
                Target Review Passes ({currentPasses} passes)
              </div>
              <div style={{ fontSize: 12, color: "var(--soft)", marginTop: 2 }}>
                Number of spaced repetition passes required to mark each topic fully mastered
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {[3, 5, 7, 10].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => updateTargetPasses(num)}
                  style={{
                    border: "1px solid var(--panel-border)",
                    borderRadius: 100,
                    padding: "5px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    background: currentPasses === num ? "var(--purple)" : "var(--panel)",
                    color: currentPasses === num ? "#fff" : "var(--ink)",
                    transition: "all 0.15s ease",
                  }}
                >
                  {num} passes
                </button>
              ))}
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 4 }}>
                <button
                  type="button"
                  onClick={() => updateTargetPasses(currentPasses - 1)}
                  disabled={currentPasses <= 1}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    border: "1px solid var(--panel-border)",
                    background: "var(--panel)",
                    color: "var(--ink)",
                    cursor: currentPasses <= 1 ? "not-allowed" : "pointer",
                    fontWeight: 700,
                    opacity: currentPasses <= 1 ? 0.4 : 1,
                  }}
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => updateTargetPasses(currentPasses + 1)}
                  disabled={currentPasses >= 15}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    border: "1px solid var(--panel-border)",
                    background: "var(--panel)",
                    color: "var(--ink)",
                    cursor: currentPasses >= 15 ? "not-allowed" : "pointer",
                    fontWeight: 700,
                    opacity: currentPasses >= 15 ? 0.4 : 1,
                  }}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Study Planner Link */}
          {onGoPlan && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px",
                background: "var(--panel-solid)",
                borderRadius: 14,
                border: "1px solid var(--panel-border)",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>
                  Daily Plan Limits & Schedule
                </div>
                <div style={{ fontSize: 12, color: "var(--soft)", marginTop: 2 }}>
                  Set daily topic limits, weekly duration, and exam target dates
                </div>
              </div>
              <button
                type="button"
                onClick={onGoPlan}
                className="sidebar-data-btn"
                style={{ width: "auto", padding: "8px 16px" }}
              >
                <IconCalendar style={{ width: 14, height: 14 }} /> Open Planner
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 4. Data Management & Backups */}
      <section className="card" style={{ padding: "22px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "color-mix(in srgb, var(--cyan, #06b6d4) 16%, transparent)",
              color: "var(--cyan, #06b6d4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconDownload style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--ink)" }}>Data & Backups</h2>
            <div style={{ fontSize: 12, color: "var(--soft)" }}>Export study records or reset curriculum progress</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
          {/* Export card */}
          <div
            style={{
              padding: "16px",
              background: "var(--panel-solid)",
              borderRadius: 14,
              border: "1px solid var(--panel-border)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>Export Study Records</div>
              <div style={{ fontSize: 12, color: "var(--soft)", marginTop: 4 }}>
                Download a complete JSON backup containing all topic passes, quiz scores, and schedule settings.
              </div>
            </div>
            {onExport && (
              <button
                type="button"
                onClick={onExport}
                className="sidebar-data-btn"
                style={{ width: "fit-content", padding: "8px 16px" }}
              >
                <IconDownload style={{ width: 14, height: 14 }} /> Export JSON Backup
              </button>
            )}
          </div>

          {/* Reset card */}
          <div
            style={{
              padding: "16px",
              background: "var(--panel-solid)",
              borderRadius: 14,
              border: "1px solid var(--panel-border)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: "var(--red)" }}>Reset Tracker Progress</div>
              <div style={{ fontSize: 12, color: "var(--soft)", marginTop: 4 }}>
                Permanently clear pass records and quiz attempts for the active curriculum unit.
              </div>
            </div>
            {onReset && (
              <button
                type="button"
                onClick={onReset}
                className="sidebar-data-btn danger"
                style={{ width: "fit-content", padding: "8px 16px" }}
              >
                <IconTrash style={{ width: 14, height: 14 }} /> Reset Unit Progress
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 5. Account & Session */}
      <section className="card" style={{ padding: "22px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "color-mix(in srgb, var(--soft) 20%, transparent)",
              color: "var(--ink)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconPower style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--ink)" }}>Account & Session</h2>
            <div style={{ fontSize: 12, color: "var(--soft)" }}>Active credentials and session management</div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            background: "var(--panel-solid)",
            borderRadius: 14,
            border: "1px solid var(--panel-border)",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>
              {user?.email || "Student Account"}
            </div>
            <div style={{ fontSize: 12, color: "var(--soft)", marginTop: 2 }}>
              Signed in · Local progress synced with cloud storage
            </div>
          </div>
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="sidebar-data-btn"
              style={{ width: "auto", padding: "8px 18px", color: "var(--red)" }}
            >
              <IconPower style={{ width: 14, height: 14 }} /> Log Out
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
