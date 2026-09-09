"use client";
import { useEffect, useState } from "react";
import { UNITS } from "@/lib/units";
import { IconTrash, IconCheck } from "@/components/Icons";

/* ============================================================
   Access Codes (admin only) — in-app replacement for manually running
   INSERT statements in the Supabase SQL Editor to generate premium
   redeem codes. Everything here goes through three security-definer
   Postgres functions (migration 015) that re-check the caller's email
   server-side before touching access_codes — that table itself still
   has zero RLS policies, so this UI is genuinely the only door in, not
   a new hole opened in the existing lockdown.
   ============================================================ */

const PREMIUM_UNITS = UNITS.filter((u) => u.premium);

export default function AccessCodesManage({ supabase, showToast }) {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("unused"); // unused | used | all

  const [genUnit, setGenUnit] = useState(PREMIUM_UNITS[0]?.key || "all");
  const [genCount, setGenCount] = useState(1);
  const [genLabel, setGenLabel] = useState("");
  const [generating, setGenerating] = useState(false);
  const [justGenerated, setJustGenerated] = useState([]);
  const [genError, setGenError] = useState(null);
  const [deletingCode, setDeletingCode] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);

  async function loadCodes() {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_list_access_codes");
    if (!error) setCodes(data || []);
    setLoading(false);
  }

  useEffect(() => { loadCodes(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function unitName(key) {
    if (key === "all") return "All premium units";
    return UNITS.find((u) => u.key === key)?.name || key;
  }

  async function handleGenerate() {
    setGenerating(true);
    setGenError(null);
    setJustGenerated([]);
    const { data, error } = await supabase.rpc("admin_generate_access_codes", {
      p_unit_id: genUnit,
      p_count: Number(genCount) || 1,
      p_label: genLabel.trim() || null,
    });
    setGenerating(false);
    if (error) { setGenError(error.message); return; }
    setJustGenerated(data || []);
    showToast(`Generated ${(data || []).length} code${(data || []).length === 1 ? "" : "s"}`);
    loadCodes();
  }

  async function handleDelete(code) {
    setDeletingCode(code);
    const { data, error } = await supabase.rpc("admin_delete_access_code", { p_code: code });
    setDeletingCode(null);
    if (error) { showToast("Couldn't delete: " + error.message); return; }
    if (data) {
      setCodes((prev) => prev.filter((c) => c.code !== code));
      showToast("Code revoked");
    } else {
      showToast("That code was already redeemed — left in place as a record");
    }
  }

  function copyCode(code) {
    try { navigator.clipboard.writeText(code); } catch (e) { /* ignore */ }
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1400);
  }
  function copyAllGenerated() {
    try { navigator.clipboard.writeText(justGenerated.join("\n")); } catch (e) { /* ignore */ }
    showToast("Copied all codes");
  }

  const filteredCodes = codes.filter((c) => {
    if (filter === "unused") return !c.used;
    if (filter === "used") return c.used;
    return true;
  });
  const unusedCount = codes.filter((c) => !c.used).length;
  const usedCount = codes.filter((c) => c.used).length;

  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--amber)", fontWeight: 700, letterSpacing: 1 }}>ACCESS CODES · ADMIN</div>
      <h1 style={{ margin: "4px 0 6px", fontSize: 26, fontWeight: 800 }}>Generate &amp; manage redeem codes</h1>
      <div style={{ color: "var(--soft)", fontSize: 13, marginBottom: 20 }}>
        Codes are single-use and tied to one premium unit (or every premium unit at once). Hand them out however you sell access — the buyer redeems theirs from the unit picker (Switch → &quot;Have an access code?&quot;).
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ marginTop: 0, fontSize: 16 }}>Generate codes</h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <div style={{ flex: "1 1 180px", minWidth: 160 }}>
            <label className="h-field-label">Unit</label>
            <select value={genUnit} onChange={(e) => setGenUnit(e.target.value)} style={{ width: "100%" }}>
              {PREMIUM_UNITS.map((u) => <option key={u.key} value={u.key}>{u.name}</option>)}
              <option value="all">All premium units</option>
            </select>
          </div>
          <div style={{ flex: "0 1 110px", minWidth: 90 }}>
            <label className="h-field-label">How many</label>
            <input type="number" min={1} max={200} value={genCount} onChange={(e) => setGenCount(e.target.value)} style={{ width: "100%" }} />
          </div>
          <div style={{ flex: "1 1 200px", minWidth: 160 }}>
            <label className="h-field-label">Label (optional)</label>
            <input type="text" maxLength={60} placeholder="e.g. Batch for June sales" value={genLabel} onChange={(e) => setGenLabel(e.target.value)} style={{ width: "100%" }} />
          </div>
        </div>
        <button onClick={handleGenerate} disabled={generating} className="btn-primary">
          {generating ? "Generating…" : `Generate ${genCount || 1} code${Number(genCount) === 1 ? "" : "s"}`}
        </button>
        {genError && <div style={{ color: "var(--red)", fontSize: 12.5, marginTop: 8 }}>{genError}</div>}

        {justGenerated.length > 0 && (
          <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: "var(--panel-solid)", border: "1px solid var(--panel-border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700 }}>New codes — copy these now</span>
              <button onClick={copyAllGenerated} data-sound="none" className="h-groupby-btn" style={{ padding: "4px 10px" }}>Copy all</button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {justGenerated.map((c) => (
                <button
                  key={c} onClick={() => copyCode(c)} data-sound="none"
                  style={{ fontFamily: "monospace", fontSize: 13, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--panel-border)", background: "var(--panel)", color: "var(--ink)", cursor: "pointer" }}
                >
                  {copiedCode === c ? "✓ Copied" : c}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>All codes ({codes.length})</h2>
        <div className="h-groupby-switch">
          <button className={`h-groupby-btn${filter === "unused" ? " active" : ""}`} onClick={() => setFilter("unused")} data-sound="none">Unused ({unusedCount})</button>
          <button className={`h-groupby-btn${filter === "used" ? " active" : ""}`} onClick={() => setFilter("used")} data-sound="none">Redeemed ({usedCount})</button>
          <button className={`h-groupby-btn${filter === "all" ? " active" : ""}`} onClick={() => setFilter("all")} data-sound="none">All</button>
        </div>
      </div>

      {loading ? (
        <div style={{ color: "var(--soft)", fontSize: 13 }}>Loading…</div>
      ) : filteredCodes.length === 0 ? (
        <div style={{ color: "var(--soft)", fontSize: 13 }}>Nothing here yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {filteredCodes.map((c) => (
            <div key={c.code} className="card" style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontFamily: "monospace", fontSize: 13.5, fontWeight: 700, minWidth: 92 }}>{c.code}</span>
              <span style={{ fontSize: 12.5, color: "var(--soft)", flex: "1 1 140px" }}>{unitName(c.unit_id)}</span>
              {c.label && <span style={{ fontSize: 11.5, color: "var(--soft)", fontStyle: "italic" }}>{c.label}</span>}
              <span
                style={{
                  fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 100,
                  background: c.used ? "color-mix(in srgb, var(--green) 18%, transparent)" : "color-mix(in srgb, var(--purple) 16%, transparent)",
                  color: c.used ? "var(--green)" : "var(--purple)",
                }}
              >
                {c.used ? "REDEEMED" : "UNUSED"}
              </span>
              <span style={{ fontSize: 11, color: "var(--soft)" }}>
                {c.used ? `on ${new Date(c.used_at).toLocaleDateString()}` : `made ${new Date(c.created_at).toLocaleDateString()}`}
              </span>
              <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
                <button onClick={() => copyCode(c.code)} data-sound="none" title="Copy code" style={{ background: "none", border: "1px solid var(--panel-border)", borderRadius: 8, padding: "5px 9px", cursor: "pointer", color: "var(--ink)" }}>
                  {copiedCode === c.code ? <IconCheck style={{ width: 13, height: 13 }} /> : "Copy"}
                </button>
                {!c.used && (
                  <button onClick={() => handleDelete(c.code)} disabled={deletingCode === c.code} data-sound="none" title="Revoke this code" style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", display: "flex", alignItems: "center" }}>
                    <IconTrash style={{ width: 15, height: 15 }} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
