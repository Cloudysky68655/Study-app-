"use client";
import { useEffect, useState } from "react";
import { UNITS, getUnitTopics } from "@/lib/units";
import { IconTrash } from "@/components/Icons";

/* ============================================================
   QBank Manage (admin only) — extracted from the old standalone /qbank
   route so it can be embedded inline within Study's QBank tab instead
   of living on its own page.
   ============================================================ */

/* ==================== MANAGE (admin only) ==================== */

function ManageTab({ supabase, user, showToast }) {
  const [questions, setQuestions] = useState([]);
  const [importText, setImportText] = useState("");
  const [importStatus, setImportStatus] = useState(null);
  const [expandedKey, setExpandedKey] = useState(null);

  useEffect(() => { loadQuestions(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadQuestions() {
    const { data, error } = await supabase.from("qbank_questions").select("*").order("created_at", { ascending: false });
    if (!error) setQuestions(data || []);
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
      const q = parsed[i];
      if (!q.unit || !q.topic || !q.question || !Array.isArray(q.options) || q.options.length < 2) {
        setImportStatus({ ok: false, error: `Question ${i + 1} is missing unit, topic, question, or at least 2 options.` });
        return;
      }
      if (!q.options.some((o) => o.correct)) {
        setImportStatus({ ok: false, error: `Question ${i + 1} has no option marked "correct": true.` });
        return;
      }
      const unitObj = UNITS.find((u) => u.name.toLowerCase() === q.unit.trim().toLowerCase());
      if (!unitObj) {
        setImportStatus({ ok: false, error: `Question ${i + 1}: unit "${q.unit}" doesn't match any unit name. Options: ${UNITS.map((u) => u.name).join(", ")}` });
        return;
      }
      const topicObj = getUnitTopics(unitObj.key).find((t) => t.name.toLowerCase() === q.topic.trim().toLowerCase());
      if (!topicObj) {
        setImportStatus({ ok: false, error: `Question ${i + 1}: topic "${q.topic}" not found under "${unitObj.name}".` });
        return;
      }
      const questionType = q.type === "official_exam" ? "official_exam" : "exam_like";
      if (q.type && q.type !== "exam_like" && q.type !== "official_exam") {
        setImportStatus({ ok: false, error: `Question ${i + 1}: "type" must be "exam_like" or "official_exam" (or omitted).` });
        return;
      }
      rows.push({ user_id: user.id, unit_id: unitObj.key, topic_id: topicObj.id, question: q.question, options: q.options, explanation: q.explanation || null, question_type: questionType });
    }
    setImportStatus("importing");
    const { error } = await supabase.from("qbank_questions").insert(rows);
    if (error) { setImportStatus({ ok: false, error: error.message }); return; }
    setImportStatus({ ok: true, added: rows.length });
    setImportText("");
    showToast(`Imported ${rows.length} question${rows.length === 1 ? "" : "s"}`);
    loadQuestions();
  }

  async function deleteQuestion(id) {
    const { error } = await supabase.from("qbank_questions").delete().eq("id", id);
    if (!error) { setQuestions((qs) => qs.filter((q) => q.id !== id)); showToast("Question deleted"); }
  }

  const grouped = {};
  questions.forEach((q) => {
    grouped[q.unit_id] = grouped[q.unit_id] || {};
    grouped[q.unit_id][q.topic_id] = grouped[q.unit_id][q.topic_id] || [];
    grouped[q.unit_id][q.topic_id].push(q);
  });

  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--amber)", fontWeight: 700, letterSpacing: 1 }}>QBANK · ADMIN</div>
      <h1 style={{ margin: "4px 0 6px", fontSize: 26, fontWeight: 800 }}>Import &amp; manage MCQs</h1>
      <div style={{ color: "var(--soft)", fontSize: 13, marginBottom: 20 }}>Questions imported here show up for every user&apos;s Practice tab automatically.</div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ marginTop: 0, fontSize: 16 }}>Import questions</h2>
        <div style={{ fontSize: 12, color: "var(--soft)", marginBottom: 10 }}>
          Paste a JSON array. <code>unit</code>/<code>topic</code> are the exact readable names shown in the app. Optionally prefix <code>question</code> with a short <code>[Sub-topic]</code> label for your own filtering. Each <code>option</code> can carry its own <code>explanation</code> (shown for correct and incorrect choices). Optional <code>type</code>: <code>&quot;exam_like&quot;</code> (default) or <code>&quot;official_exam&quot;</code>.
        </div>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder='[{"unit":"Cardio-Respiratory","topic":"Thoracic wall","type":"exam_like","question":"[Phrenic nerve] Which nerve provides motor innervation to the diaphragm?","options":[{"text":"Vagus nerve","correct":false,"explanation":"The vagus nerve supplies parasympathetic fibers to thoracic/abdominal viscera, not motor fibers to the diaphragm."},{"text":"Phrenic nerve","correct":true,"explanation":"The phrenic nerve (C3-C5) is the sole motor supply to the diaphragm."}]}]'
          rows={7}
          style={{ width: "100%", fontFamily: "monospace", fontSize: 12, padding: 10, borderRadius: 8, border: "1px solid var(--panel-border)", background: "var(--panel-solid)", color: "var(--ink)", resize: "vertical" }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
          <button onClick={handleImport} disabled={!importText.trim() || importStatus === "importing"} className="btn-primary">
            {importStatus === "importing" ? "Importing…" : "Import"}
          </button>
          {importStatus && importStatus !== "importing" && (
            <span style={{ fontSize: 12.5, color: importStatus.ok ? "var(--green)" : "var(--red)" }}>
              {importStatus.ok ? `✓ Added ${importStatus.added} question${importStatus.added === 1 ? "" : "s"}` : importStatus.error}
            </span>
          )}
        </div>
      </div>

      <h2 style={{ fontSize: 16, marginBottom: 10 }}>Question bank ({questions.length})</h2>
      {questions.length === 0 && <div style={{ color: "var(--soft)", fontSize: 13 }}>No questions imported yet.</div>}
      {Object.entries(grouped).map(([unitId, topics]) => (
        <div key={unitId} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{unitName(unitId)}</div>
          {Object.entries(topics).map(([topicId, qs]) => {
            const key = unitId + "::" + topicId;
            const open = expandedKey === key;
            return (
              <div key={key} className="card" style={{ marginBottom: 8, padding: "10px 14px" }}>
                <div onClick={() => setExpandedKey(open ? null : key)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                  <span style={{ fontSize: 13, fontFamily: "monospace" }}>{topicId}</span>
                  <span style={{ fontSize: 12, color: "var(--soft)" }}>{qs.length} question{qs.length === 1 ? "" : "s"}</span>
                </div>
                {open && (
                  <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                    {qs.map((q) => (
                      <div key={q.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, padding: "8px 0", borderTop: "1px solid var(--panel-border)" }}>
                        <div style={{ fontSize: 12.5, whiteSpace: "pre-line" }}>
                          {q.question_type === "official_exam" && <span style={{ fontSize: 10, fontWeight: 700, color: "var(--amber)", marginRight: 6 }}>OFFICIAL</span>}
                          {q.question}
                        </div>
                        <button onClick={() => deleteQuestion(q.id)} data-sound="none" style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", flexShrink: 0 }}><IconTrash /></button>
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

export default ManageTab;
