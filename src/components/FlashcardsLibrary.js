"use client";
import { useEffect, useState } from "react";

const LABEL_META = {
  again: { label: "Again", color: "var(--red)" },
  hard: { label: "Hard", color: "var(--amber)" },
  normal: { label: "Normal", color: "var(--purple)" },
  easy: { label: "Easy", color: "var(--green)" },
};

/* ============================================================
   Flashcards Library — every card the user has studied, with times
   studied and the latest rating. Durable record, independent of
   whatever session a card happened to be studied in.
   ============================================================ */
export default function FlashcardsLibrary({ supabase, user, topics }) {
  const [rows, setRows] = useState(null);
  const [filter, setFilter] = useState("all"); // all | again | hard | normal | easy

  useEffect(() => {
    (async () => {
      const { data: stats } = await supabase.from("flashcard_card_stats").select("*").eq("user_id", user.id).order("last_studied_at", { ascending: false });
      if (!stats || !stats.length) { setRows([]); return; }
      const ids = stats.map((s) => s.card_id);
      const { data: cards } = await supabase.from("flashcards").select("*").in("id", ids);
      const cardById = {};
      (cards || []).forEach((c) => { cardById[c.id] = c; });
      setRows(stats.map((s) => ({ ...s, card: cardById[s.card_id] })).filter((r) => r.card));
    })();
  }, [supabase, user.id]);

  function topicName(topicId) {
    return topics.find((t) => t.id === topicId)?.name || topicId;
  }

  if (rows === null) return <div style={{ color: "var(--soft)", fontSize: 13 }}>Loading…</div>;

  const filtered = filter === "all" ? rows : rows.filter((r) => r.latest_label === filter);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--amber)", fontWeight: 700, letterSpacing: 1 }}>FLASHCARDS</div>
          <h1 style={{ margin: "4px 0 0", fontSize: 24, fontWeight: 800 }}>Library</h1>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[{ key: "all", label: "All" }, ...Object.entries(LABEL_META).map(([k, v]) => ({ key: k, label: v.label }))].map((f) => (
            <button
              key={f.key}
              type="button"
              data-sound="none"
              onClick={() => setFilter(f.key)}
              style={{ fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 100, cursor: "pointer", border: `1px solid ${filter === f.key ? "var(--purple)" : "var(--panel-border)"}`, background: filter === f.key ? "var(--grad-primary)" : "var(--panel-solid)", color: filter === f.key ? "#fff" : "var(--ink)" }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ color: "var(--soft)", fontSize: 13.5 }}>{rows.length === 0 ? "No cards studied yet — start a session to build your library." : "No cards match this filter."}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((r) => {
            const meta = LABEL_META[r.latest_label] || { label: "—", color: "var(--soft)" };
            return (
              <div key={r.card_id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.card.card_type === "cloze" ? r.card.cloze_text.replace(/\{\{c::(.*?)\}\}/g, (_, g) => `[${g.split("::")[0]}]`) : r.card.front}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--soft)", marginTop: 3 }}>{topicName(r.card.topic_id)} · studied {r.times_studied}×</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: meta.color, background: `color-mix(in srgb, ${meta.color} 16%, transparent)`, padding: "3px 10px", borderRadius: 20, flexShrink: 0 }}>{meta.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
