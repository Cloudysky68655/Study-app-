"use client";
import { useEffect, useState } from "react";
import { playSelect, playSuccess } from "@/lib/sounds";

/**
 * Fetches questions tagged to (unitId, topicId), runs a simple one-at-a-
 * time MCQ quiz, then calls onFinish(scorePercent) once done. Study's
 * dashboard owns what happens with that score (fills QCM field + logs
 * a pass) — this component only runs the quiz and hands back a number.
 */
export default function PracticeQuiz({ supabase, unitId, topicId, onFinish, onClose }) {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("qbank_questions")
        .select("*")
        .eq("unit_id", unitId)
        .eq("topic_id", topicId);
      if (!active) return;
      if (!error && data) {
        // shuffle so repeat practice isn't always in the same order
        setQuestions([...data].sort(() => Math.random() - 0.5));
      }
      setLoading(false);
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId, topicId]);

  const current = questions[index];

  function pickOption(i) {
    if (selected != null) return; // already answered this one
    setSelected(i);
    const isCorrect = !!current.options[i].correct;
    if (isCorrect) { setCorrectCount((c) => c + 1); playSuccess(); } else { playSelect(); }
  }

  function next() {
    if (index + 1 < questions.length) {
      setIndex((i) => i + 1);
      setSelected(null);
    } else {
      setDone(true);
    }
  }

  const scorePercent = questions.length ? Math.round((correctCount / questions.length) * 100) : 0;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(5,6,12,.75)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 150 }}>
      <div className="card modal-box" style={{ maxWidth: 480, width: "100%", maxHeight: "85vh", overflow: "auto" }}>
        {loading ? (
          <div style={{ padding: 20, textAlign: "center", color: "var(--soft)" }}>Loading questions…</div>
        ) : questions.length === 0 ? (
          <div style={{ padding: 10, textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>No practice questions yet</div>
            <div style={{ fontSize: 12.5, color: "var(--soft)", marginBottom: 16 }}>Import some for this topic from the QBank page — then they&apos;ll show up here.</div>
            <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 100, border: "1px solid var(--panel-border)", background: "var(--panel-solid)", color: "var(--ink)", cursor: "pointer" }}>Close</button>
          </div>
        ) : done ? (
          <div style={{ padding: 10, textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "var(--soft)", textTransform: "uppercase", letterSpacing: 1 }}>Practice complete</div>
            <div style={{ fontSize: 40, fontWeight: 800, margin: "8px 0" }}>{scorePercent}%</div>
            <div style={{ fontSize: 13, color: "var(--soft)", marginBottom: 20 }}>{correctCount} of {questions.length} correct</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={onClose} style={{ padding: "9px 16px", borderRadius: 100, border: "1px solid var(--panel-border)", background: "var(--panel-solid)", color: "var(--ink)", cursor: "pointer", fontSize: 13 }}>Discard</button>
              <button
                onClick={() => onFinish(scorePercent)}
                style={{ padding: "9px 18px", borderRadius: 100, border: "none", background: "var(--grad-primary)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 }}
              >
                Save score &amp; log pass
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 11, color: "var(--soft)", marginBottom: 8 }}>Question {index + 1} of {questions.length}</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>{current.question}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {current.options.map((o, i) => {
                const isSelected = selected === i;
                const showCorrect = selected != null && o.correct;
                const showWrong = selected != null && isSelected && !o.correct;
                return (
                  <button
                    key={i}
                    onClick={() => pickOption(i)}
                    data-sound="none"
                    style={{
                      textAlign: "left", padding: "10px 14px", borderRadius: 8, cursor: selected == null ? "pointer" : "default",
                      border: `1px solid ${showCorrect ? "var(--green)" : showWrong ? "var(--red)" : "var(--panel-border)"}`,
                      background: showCorrect ? "rgba(34,211,238,.12)" : showWrong ? "rgba(248,113,113,.12)" : "var(--panel-solid)",
                      color: "var(--ink)", fontSize: 13.5,
                    }}
                  >
                    {o.text}
                  </button>
                );
              })}
            </div>
            {selected != null && current.explanation && (
              <div style={{ marginTop: 10, fontSize: 12.5, color: "var(--soft)", background: "var(--panel)", padding: "8px 10px", borderRadius: 8 }}>{current.explanation}</div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
              <button onClick={onClose} data-sound="none" style={{ background: "none", border: "none", color: "var(--soft)", cursor: "pointer", fontSize: 12.5 }}>Cancel</button>
              {selected != null && (
                <button
                  onClick={next}
                  style={{ padding: "8px 18px", borderRadius: 100, border: "none", background: "var(--grad-primary)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 }}
                >
                  {index + 1 < questions.length ? "Next" : "Finish"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
