"use client";
// Practice score history — lifted from the old standalone /qbank route.
import { useEffect, useState } from "react";

export default function HistoryTab({ supabase, user }) {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.from("practice_history").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(200);
      if (active) setRows(data || []);
    })();
    return () => { active = false; };
  }, [supabase, user]);

  if (rows === null) return <div style={{ color: "var(--soft)", fontSize: 13 }}>Loading…</div>;

  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--amber)", fontWeight: 700, letterSpacing: 1 }}>PRACTICE</div>
      <h1 style={{ margin: "4px 0 16px", fontSize: 26, fontWeight: 800 }}>Score history <span style={{ fontSize: 14, color: "var(--soft)", fontWeight: 600 }}>({rows.length})</span></h1>
      {rows.length === 0 ? (
        <div style={{ color: "var(--soft)", fontSize: 13.5 }}>No practice runs completed yet — your results will show up here.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((h) => {
            const d = new Date(h.created_at);
            const cls = h.pct >= 80 ? "var(--green)" : h.pct >= 50 ? "var(--amber)" : "var(--red)";
            return (
              <div key={h.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{h.scope_label}</div>
                  <div style={{ fontSize: 11.5, color: "var(--soft)" }}>{d.toLocaleDateString()} · {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{h.minutes_spent ? ` · ${h.minutes_spent} min` : ""}</div>
                </div>
                <div style={{ fontWeight: 800, color: cls, fontSize: 15 }}>{h.correct}/{h.total} · {h.pct}%</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
