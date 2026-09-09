"use client";
import { useEffect, useState } from "react";
import { UNITS, getUnitTopics } from "@/lib/units";
import { IconTrash } from "@/components/Icons";
import { clozeHasBlanks } from "@/lib/flashcards";

/* ============================================================
   Flashcards Manage (admin only) — import/manage the shared card bank.
   Same shared-read / admin-write pattern as QBankManage.
   ============================================================ */

function FlashcardsManageTab({ supabase, user, showToast }) {
  const [cards, setCards] = useState([]);
  const [importText, setImportText] = useState("");
  const [importStatus, setImportStatus] = useState(null);
  const [expandedKey, setExpandedKey] = useState(null);

  useEffect(() => { loadCards(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadCards() {
    const { data, error } = await supabase.from("flashcards").select("*").order("created_at", { ascending: false });
    if (!error) setCards(data || []);
  }

  function unitName(key) { return UNITS.find((u) => u.key === key)?.name || key; }

  async function handleImport() {
    let parsed;
    try {
      parsed = JSON.parse(importText);
      if (!Array.isArray(parsed)) throw new Error("Top level must be a JSON array");
    } catch (e) {
      setImportStatus({ ok: false, error: "Invalid JSON: " + e.message });
      return;
    }
    const rows = [];
    for (let i = 0; i < parsed.length; i++) {
      const c = parsed[i];
      if (!c.unit || !c.topic) {
        setImportStatus({ ok: false, error: `Card ${i + 1} is missing unit or topic.` });
        return;
      }
      const cardType = c.type === "cloze" ? "cloze" : "basic";
      if (c.type && c.type !== "basic" && c.type !== "cloze") {
        setImportStatus({ ok: false, error: `Card ${i + 1}: "type" must be "basic" or "cloze" (or omitted, defaults to basic).` });
        return;
      }
      if (cardType === "basic" && (!c.front || !c.back)) {
        setImportStatus({ ok: false, error: `Card ${i + 1}: basic cards need "front" and "back".` });
        return;
      }
      if (cardType === "cloze" && (!c.text || !clozeHasBlanks(c.text))) {
        setImportStatus({ ok: false, error: `Card ${i + 1}: cloze cards need "text" containing at least one {{c::...}} blank.` });
        return;
      }
      const unitObj = UNITS.find((u) => u.name.toLowerCase() === c.unit.trim().toLowerCase());
      if (!unitObj) {
        setImportStatus({ ok: false, error: `Card ${i + 1}: unit "${c.unit}" doesn't match any unit name. Options: ${UNITS.map((u) => u.name).join(", ")}` });
        return;
      }
      const topicObj = getUnitTopics(unitObj.key).find((t) => t.name.toLowerCase() === c.topic.trim().toLowerCase());
      if (!topicObj) {
        setImportStatus({ ok: false, error: `Card ${i + 1}: topic "${c.topic}" not found under "${unitObj.name}".` });
        return;
      }
      rows.push({
        user_id: user.id, unit_id: unitObj.key, topic_id: topicObj.id, card_type: cardType,
        front: cardType === "basic" ? c.front : null,
        back: cardType === "basic" ? c.back : null,
        cloze_text: cardType === "cloze" ? c.text : null,
      });
    }
    setImportStatus("importing");
    const { error } = await supabase.from("flashcards").insert(rows);
    if (error) { setImportStatus({ ok: false, error: error.message }); return; }
    setImportStatus({ ok: true, added: rows.length });
    setImportText("");
    showToast(`Imported ${rows.length} card${rows.length === 1 ? "" : "s"}`);
    loadCards();
  }

  async function deleteCard(id) {
    const { error } = await supabase.from("flashcards").delete().eq("id", id);
    if (!error) { setCards((cs) => cs.filter((c) => c.id !== id)); showToast("Card deleted"); }
  }

  const grouped = {};
  cards.forEach((c) => {
    grouped[c.unit_id] = grouped[c.unit_id] || {};
    grouped[c.unit_id][c.topic_id] = grouped[c.unit_id][c.topic_id] || [];
    grouped[c.unit_id][c.topic_id].push(c);
  });

  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--amber)", fontWeight: 700, letterSpacing: 1 }}>FLASHCARDS · ADMIN</div>
      <h1 style={{ margin: "4px 0 6px", fontSize: 26, fontWeight: 800 }}>Import &amp; manage cards</h1>
      <div style={{ color: "var(--soft)", fontSize: 13, marginBottom: 20 }}>Cards imported here show up for every user&apos;s Flashcards tab automatically.</div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ marginTop: 0, fontSize: 16 }}>Import cards</h2>
        <div style={{ fontSize: 12, color: "var(--soft)", marginBottom: 10 }}>
          Paste a JSON array. <code>unit</code>/<code>topic</code> are exact readable names. Basic cards: <code>front</code>/<code>back</code>. Cloze cards: <code>type: &quot;cloze&quot;</code> with <code>text</code> containing one or more <code>{"{{c::hidden}}"}</code> blanks — add an optional hint with <code>{"{{c::hidden::hint}}"}</code>, shown in place of the answer until revealed.
        </div>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder='[{"unit":"Cardio-Respiratory","topic":"Thoracic wall","type":"basic","front":"What supplies the diaphragm?","back":"Phrenic nerve"},{"unit":"Cardio-Respiratory","topic":"Thoracic wall","type":"cloze","text":"The {{c::mitral::valve type}} valve sits between {{c::LA::chamber}} and {{c::LV::chamber}}."}]'
          rows={7}
          style={{ width: "100%", fontFamily: "monospace", fontSize: 12, padding: 10, borderRadius: 8, border: "1px solid var(--panel-border)", background: "var(--panel-solid)", color: "var(--ink)", resize: "vertical" }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
          <button onClick={handleImport} disabled={!importText.trim() || importStatus === "importing"} className="btn-primary">
            {importStatus === "importing" ? "Importing…" : "Import"}
          </button>
          {importStatus && importStatus !== "importing" && (
            <span style={{ fontSize: 12.5, color: importStatus.ok ? "var(--green)" : "var(--red)" }}>
              {importStatus.ok ? `✓ Added ${importStatus.added} card${importStatus.added === 1 ? "" : "s"}` : importStatus.error}
            </span>
          )}
        </div>
      </div>

      <h2 style={{ fontSize: 16, marginBottom: 10 }}>Card bank ({cards.length})</h2>
      {cards.length === 0 && <div style={{ color: "var(--soft)", fontSize: 13 }}>No cards imported yet.</div>}
      {Object.entries(grouped).map(([unitId, topics]) => (
        <div key={unitId} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{unitName(unitId)}</div>
          {Object.entries(topics).map(([topicId, cs]) => {
            const key = unitId + "::" + topicId;
            const open = expandedKey === key;
            return (
              <div key={key} className="card" style={{ marginBottom: 8, padding: "10px 14px" }}>
                <div onClick={() => setExpandedKey(open ? null : key)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                  <span style={{ fontSize: 13, fontFamily: "monospace" }}>{topicId}</span>
                  <span style={{ fontSize: 12, color: "var(--soft)" }}>{cs.length} card{cs.length === 1 ? "" : "s"}</span>
                </div>
                {open && (
                  <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                    {cs.map((c) => (
                      <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, padding: "8px 0", borderTop: "1px solid var(--panel-border)" }}>
                        <div style={{ fontSize: 12.5 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: c.card_type === "cloze" ? "var(--purple)" : "var(--amber)", marginRight: 6 }}>{c.card_type === "cloze" ? "CLOZE" : "BASIC"}</span>
                          {c.card_type === "cloze" ? c.cloze_text.replace(/\{\{c::(.*?)\}\}/g, (_, g) => `[${g.split("::")[0]}]`) : c.front}
                        </div>
                        <button onClick={() => deleteCard(c.id)} data-sound="none" style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", flexShrink: 0 }}><IconTrash /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default FlashcardsManageTab;
