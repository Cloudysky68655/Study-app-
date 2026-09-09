'use client';
import { useState } from "react";
import { UNITS, isUnitLocked } from "@/lib/units";
import { playSelect } from "@/lib/sounds";
import { createClient } from "@/lib/supabaseClient";
import { IconLock, IconClock } from "@/components/Icons";
import { ROLE_CYCLE, inkFor } from "@/lib/palettes";

/**
 * allProgressRows — every topic_progress row for this user, across every
 * unit (fetched once, unfiltered). Used only to compute the small
 * "X/Y topics started" glance per card — the actual tracker re-fetches
 * nothing extra once a unit is chosen, since this data's already local.
 *
 * premiumUnits — user_settings.premium_units array (unit keys the user
 * has unlocked with a code, or ["all"]). Passed down from the dashboard
 * so this component doesn't need its own fetch.
 *
 * comingSoonUnits — app_config.coming_soon_units array (global, admin-set).
 * For non-admin users, any unit key in this list shows a plain "Coming
 * soon" card — no lock icon, no "PREMIUM" badge, no redeem-code field
 * anywhere on that card, and clicking it does nothing. Admin always sees
 * the normal locked/unlocked card, plus a small toggle to flip a unit's
 * coming-soon state for everyone else.
 *
 * isAdmin — whether the signed-in user is the admin account.
 *
 * onToggleComingSoon(unitId) — admin-only, flips a unit's coming-soon
 * state (writes to app_config; RLS only allows the real admin account
 * to succeed, so this is safe to wire up unconditionally here).
 *
 * onRedeemed(unitId) — called after a code is successfully redeemed, so
 * the dashboard can update its local premiumUnits state without a
 * full reload.
 */
export default function UnitPicker({ allProgressRows, onChoose, premiumUnits, onRedeemed, comingSoonUnits, isAdmin, onToggleComingSoon }) {
  const [supabase] = useState(() => createClient());
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState(null); // null | "checking" | "error" | "ok"
  const [errorMsg, setErrorMsg] = useState("");

  async function submitCode(e) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    setStatus("checking");
    setErrorMsg("");
    try {
      const { data, error } = await supabase.rpc("redeem_access_code", { p_code: trimmed });
      if (error || !data?.ok) {
        setStatus("error");
        const reason = data?.error;
        console.error("redeem_access_code failed:", error || data);
        setErrorMsg(
          reason === "already_used" ? "That code has already been used." :
          reason === "invalid_code" ? "That code isn't valid." :
          reason === "not_signed_in" ? "Please sign in again and retry." :
          "Something went wrong. Try again."
        );
        return;
      }
      setStatus("ok");
      playSelect();
      onRedeemed?.(data.unit_id);
      setTimeout(() => {
        setRedeemOpen(false);
        setCode("");
        setStatus(null);
      }, 900);
    } catch (err) {
      console.error("redeem_access_code threw:", err);
      setStatus("error");
      setErrorMsg("Couldn't reach the server. Check your connection and try again.");
    }
  }

  // Whether there's at least one unit this user should be able to redeem
  // a code for — i.e. locked, and not currently hidden as "coming soon".
  const anyRedeemable = UNITS.some((u) => {
    const locked = isUnitLocked(u, premiumUnits);
    const hiddenAsComingSoon = (comingSoonUnits || []).includes(u.key) && !isAdmin;
    return locked && !hiddenAsComingSoon;
  });

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, position: "relative", zIndex: 1 }}>
      <div style={{ maxWidth: 740, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div className="eyebrow" style={{ color: "var(--purple)", marginBottom: 6 }}>CHOOSE A UNIT</div>
          <h1 style={{ margin: "4px 0 8px", fontSize: "clamp(26px, 3.5vw, 36px)", fontWeight: 800, letterSpacing: "-.05em", fontFamily: "'Plus Jakarta Sans','Quicksand',sans-serif" }}>
            Which unit are you studying?
          </h1>
          <div style={{ color: "var(--soft)", fontSize: 13.5, fontWeight: 500 }}>
            You can switch units any time from the sidebar — nothing about your progress is lost when you do.
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          {UNITS.map((u, i) => {
            const rows = allProgressRows.filter((r) => r.unit_id === u.key);
            const started = rows.filter((r) => (r.entries?.length > 0) || r.passes > 0).length;
            const totalTopics = u.module.allTopics().length;
            const locked = isUnitLocked(u, premiumUnits);
            const comingSoon = (comingSoonUnits || []).includes(u.key) && !isAdmin;
            // Reference-matching colored-block card (like Silent Moon's
            // "Reduce Stress"/"Improve Performance" topic grid): each
            // unlocked unit gets its own solid palette-role color,
            // cycling evenly. Locked/coming-soon units stay a neutral
            // card so the lock state still reads clearly at a glance.
            const role = ROLE_CYCLE[i % ROLE_CYCLE.length];
            const isColored = !locked && !comingSoon;
            const cardStyle = isColored
              ? { cursor: "pointer", textAlign: "left", position: "relative", background: role, color: inkFor(role) }
              : { cursor: comingSoon ? "default" : "pointer", textAlign: "left", position: "relative", opacity: 0.75 };
            return (
              <div
                key={u.key}
                className="card"
                data-sound="none"
                onClick={() => {
                  if (comingSoon) return;
                  if (locked) { setRedeemOpen(true); return; }
                  playSelect(); onChoose(u.key);
                }}
                style={cardStyle}
              >
                {isAdmin && u.premium && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleComingSoon?.(u.key); }}
                    data-sound="none"
                    style={{ position: "absolute", top: 12, right: 12, display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 800, color: isColored ? inkFor(role) : "var(--purple)", background: isColored ? "rgba(255,255,255,.22)" : "color-mix(in srgb, var(--purple) 14%, transparent)", border: "none", borderRadius: 20, padding: "5px 10px", cursor: "pointer" }}
                    title="Admin: toggle Coming soon for this unit"
                  >
                    {(comingSoonUnits || []).includes(u.key) ? "SHOW LOCK" : "SHOW COMING SOON"}
                  </button>
                )}
                {!isAdmin && comingSoon && (
                  <div style={{ position: "absolute", top: 14, right: 14, display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "var(--soft)" }}>
                    <IconClock style={{ width: 13, height: 13 }} /> SOON
                  </div>
                )}
                {!comingSoon && locked && (
                  <div style={{ position: "absolute", top: 14, right: 14, display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "var(--soft)" }}>
                    <IconLock style={{ width: 13, height: 13 }} /> PREMIUM
                  </div>
                )}
                <div style={{ fontSize: 11, color: isColored ? inkFor(role) : "var(--purple)", opacity: isColored ? 0.85 : 1, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase" }}>{u.subtitle}</div>
                <h2 style={{ margin: "4px 0 8px", fontSize: 20, fontWeight: 800, letterSpacing: "-.04em", fontFamily: "'Plus Jakarta Sans','Quicksand',sans-serif" }}>{u.name}</h2>
                <div style={{ fontSize: 13, color: isColored ? inkFor(role) : "var(--soft)", opacity: isColored ? 0.85 : 1, fontWeight: 500 }}>
                  {comingSoon ? "Coming soon" : locked ? "Enter a code to unlock" : started > 0 ? `${started}/${totalTopics} topics started` : `${totalTopics} topics`}
                </div>
              </div>
            );
          })}
        </div>

        {anyRedeemable && (
          <div style={{ textAlign: "center", marginTop: 20 }}>
            <button
              onClick={() => setRedeemOpen(true)}
              data-sound="none"
              style={{ background: "none", border: "none", color: "var(--soft)", fontSize: 12.5, cursor: "pointer", textDecoration: "underline" }}
            >
              Have an access code?
            </button>
          </div>
        )}
      </div>

      {redeemOpen && (
        <div
          onClick={() => { if (status !== "checking") { setRedeemOpen(false); setStatus(null); setErrorMsg(""); } }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }}
        >
          <div onClick={(e) => e.stopPropagation()} className="card modal-box" style={{ maxWidth: 360, width: "100%", textAlign: "center" }}>
            <h2 style={{ marginTop: 0, marginBottom: 6, fontSize: 19, fontWeight: 800 }}>Enter access code</h2>
            <div style={{ color: "var(--soft)", fontSize: 12.5, marginBottom: 16 }}>Unlocks the premium unit tied to this code.</div>
            <form onSubmit={submitCode}>
              <input
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. A1B2C3D4"
                disabled={status === "checking" || status === "ok"}
                style={{ width: "100%", textAlign: "center", letterSpacing: 2, textTransform: "uppercase", fontWeight: 700, padding: "12px 10px", borderRadius: 8, border: "1px solid var(--panel-border)", background: "var(--panel-solid)", color: "var(--ink)", fontSize: 15, marginBottom: 12 }}
              />
              {status === "error" && <div style={{ color: "var(--red, #ef4444)", fontSize: 12.5, marginBottom: 10 }}>{errorMsg}</div>}
              {status === "ok" && <div style={{ color: "var(--green, #22c55e)", fontSize: 12.5, marginBottom: 10 }}>Unlocked ✓</div>}
              <button
                type="submit"
                disabled={status === "checking" || status === "ok" || !code.trim()}
                className="btn-primary"
                style={{ width: "100%", padding: "11px 0", fontSize: 14 }}
              >
                {status === "checking" ? "Checking…" : "Redeem"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
