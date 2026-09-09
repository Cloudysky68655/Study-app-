"use client";
import { useEffect, useState, useRef } from "react";
import { IconArrowLeft, IconLayers, IconClock } from "@/components/Icons";
import { playTick, playSuccess, playClick } from "@/lib/sounds";
import {
  parseCloze, rateCard, nextDueCard, nextDueTime, sessionIsComplete, defaultCardEntry,
} from "@/lib/flashcards";

const RATE_BUTTONS = [
  { key: "again", label: "Again", color: "var(--red)" },
  { key: "hard", label: "Hard", color: "var(--amber)" },
  { key: "normal", label: "Normal", color: "var(--purple)" },
  { key: "easy", label: "Easy", color: "var(--green)" },
];

function fmtCountdown(ms) {
  if (ms <= 0) return "now";
  const mins = Math.ceil(ms / 60000);
  return mins <= 1 ? "1 min" : `${mins} min`;
}

/* ============================================================
   Flashcards — session hub, topic/mode picker, and the practice loop.
   One active session per topic (enforced by a DB unique index); switching
   between topics' sessions is just picking a different hub card.
   ============================================================ */
export default function FlashcardsPractice({ supabase, user, unitId, topics, unitData, showToast, initialTopicId = null, onInitialTopicConsumed, onProgressChanged }) {
  const [view, setView] = useState("hub"); // hub | setup | practice
  const [sessions, setSessions] = useState(null); // null = loading
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [setupInitialMode, setSetupInitialMode] = useState(null);
  const [cardStats, setCardStats] = useState({}); // card_id -> stats row

  const loadSessions = async () => {
    const { data } = await supabase.from("flashcard_sessions").select("*").eq("user_id", user.id).eq("status", "active").order("updated_at", { ascending: false });
    setSessions(data || []);
    return data || [];
  };
  const loadStats = async () => {
    const { data } = await supabase.from("flashcard_card_stats").select("*").eq("user_id", user.id);
    const map = {};
    (data || []).forEach((r) => { map[r.card_id] = r; });
    setCardStats(map);
  };

  useEffect(() => { loadSessions(); loadStats(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Arriving from Study's "Flashcards" tool option with a topic already
  // chosen (same "opens straight into this topic" behavior as Timer/QBank)
  // — resume that topic's session if one's active, otherwise start a
  // fresh default one (all cards, random order) and jump straight in.
  useEffect(() => {
    if (!initialTopicId) return;
    (async () => {
      const current = await loadSessions();
      const existing = current.find((s) => s.topic_id === initialTopicId);
      if (existing) {
        setActiveSessionId(existing.id);
        setView("practice");
      } else {
        const { data: cards } = await supabase.from("flashcards").select("*").eq("unit_id", unitId).eq("topic_id", initialTopicId);
        if (cards && cards.length) {
          const cardState = cards.map((c) => defaultCardEntry(c.id));
          const { data: inserted } = await supabase.from("flashcard_sessions").insert({
            user_id: user.id, unit_id: unitId, topic_id: initialTopicId, mode: "all", card_state: cardState,
          }).select().single();
          if (inserted) {
            await loadSessions();
            setActiveSessionId(inserted.id);
            setView("practice");
          } else {
            showToast("No cards available for this topic yet");
          }
        } else {
          showToast("No cards available for this topic yet");
        }
      }
      onInitialTopicConsumed?.();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTopicId]);

  function topicName(topicId) {
    return topics.find((t) => t.id === topicId)?.name || topicId;
  }

  if (sessions === null) return <div style={{ color: "var(--soft)", fontSize: 13 }}>Loading…</div>;

  if (view === "practice" && activeSessionId) {
    const session = sessions.find((s) => s.id === activeSessionId);
    if (!session) { setView("hub"); return null; }
    return (
      <PracticeLoop
        supabase={supabase}
        user={user}
        session={session}
        topicLabel={topicName(session.topic_id)}
        onExit={() => { setView("hub"); loadSessions(); loadStats(); }}
        onSessionUpdate={(updated) => { setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s))); if (updated.status === "completed") onProgressChanged?.(); }}
      />
    );
  }

  if (view === "review") {
    return (
      <WeakCardsReview
        supabase={supabase}
        user={user}
        topics={topics}
        cardStats={cardStats}
        onMarkReviewed={(cardId) => setCardStats((prev) => ({ ...prev, [cardId]: { ...prev[cardId], reviewed: true } }))}
        onBack={() => setView("hub")}
      />
    );
  }

  if (view === "setup") {
    return (
      <SessionSetup
        supabase={supabase}
        user={user}
        unitId={unitId}
        topics={topics}
        unitData={unitData}
        onBack={() => setView("hub")}
        onStarted={async (sessionId) => {
          await loadSessions();
          setActiveSessionId(sessionId);
          setView("practice");
        }}
        showToast={showToast}
        initialMode={setupInitialMode}
      />
    );
  }

  // ---- hub ----
  const weakCardCount = Object.values(cardStats).filter((s) => ["again", "hard"].includes(s.latest_label) && !s.reviewed).length;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--amber)", fontWeight: 700, letterSpacing: 1 }}>FLASHCARDS</div>
          <h1 style={{ margin: "4px 0 0", fontSize: 24, fontWeight: 800 }}>Practice sessions</h1>
        </div>
        <button className="btn-primary" onClick={() => { setSetupInitialMode(null); setView("setup"); }}>Start a session</button>
      </div>

      <button
        type="button"
        data-sound="none"
        disabled={weakCardCount === 0}
        onClick={() => setView("review")}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18, padding: "14px 18px",
          borderRadius: 14, cursor: weakCardCount === 0 ? "default" : "pointer", textAlign: "left", width: "100%",
          border: "1.5px solid var(--panel-border)", background: "var(--panel-solid)", opacity: weakCardCount === 0 ? 0.55 : 1,
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)" }}>⚠ Review Your Weak Points</div>
          <div style={{ fontSize: 12, color: "var(--soft)", marginTop: 2 }}>
            {weakCardCount > 0 ? `${weakCardCount} card${weakCardCount === 1 ? "" : "s"} last rated Again or Hard` : "No weak cards yet — they'll show up here as you practice"}
          </div>
        </div>
        {weakCardCount > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: "var(--purple)" }}>Review →</span>}
      </button>

      {sessions.length === 0 ? (
        <div className="card" style={{ padding: "40px 24px", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 10, color: "var(--purple)" }}><IconLayers style={{ width: 28, height: 28 }} /></div>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>No active sessions</div>
          <div style={{ color: "var(--soft)", fontSize: 13 }}>Pick a topic to start drilling its cards.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {sessions.map((s) => {
            const cardState = s.card_state || [];
            const activeCount = cardState.filter((c) => c.label !== "easy").length;
            const easyCount = cardState.length - activeCount;
            const due = nextDueCard(cardState);
            const soonest = nextDueTime(cardState);
            const isDueNow = !!due;
            return (
              <div key={s.id} className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap", padding: 18 }}>
                <div style={{ minWidth: 180 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{topicName(s.topic_id)}</div>
                  <div style={{ fontSize: 12, color: "var(--soft)", marginTop: 3 }}>
                    {easyCount}/{cardState.length} mastered
                    {s.mode === "mistakes" ? " · weak cards only" : ""}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 4, color: isDueNow ? "var(--green)" : "var(--soft)" }}>
                    {isDueNow ? "Ready to continue" : soonest ? `Paused — next card in ${fmtCountdown(new Date(soonest) - new Date())}` : "All cards mastered"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn-primary" onClick={() => { setActiveSessionId(s.id); setView("practice"); }}>Continue</button>
                  <button
                    onClick={async () => {
                      await supabase.from("flashcard_sessions").update({ status: "abandoned" }).eq("id", s.id).eq("user_id", user.id);
                      showToast("Session abandoned");
                      loadSessions();
                    }}
                    data-sound="none"
                    style={{ background: "var(--panel-solid)", border: "1px solid var(--panel-border)", borderRadius: 100, padding: "9px 14px", color: "var(--red)", cursor: "pointer", fontWeight: 600, fontSize: 13 }}
                  >
                    Abandon
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ==================== Session setup (topic/mode/count picker) ==================== */

function SessionSetup({ supabase, user, unitId, topics, unitData, onBack, onStarted, showToast, initialMode = null }) {
  const [selectedTopicIds, setSelectedTopicIds] = useState(() => new Set());
  const [cardTypeFilter, setCardTypeFilter] = useState("all"); // all | basic | cloze
  const [mode, setMode] = useState(initialMode || "all"); // all | mistakes
  const [strategy, setStrategy] = useState(initialMode === "mistakes" ? "weakest" : "random"); // random | unseen | weakest
  const [countChoice, setCountChoice] = useState("all"); // "all" | number
  const [starting, setStarting] = useState(false);

  function toggleTopic(id) {
    playClick();
    setSelectedTopicIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function startSessions() {
    if (!selectedTopicIds.size) return;
    setStarting(true);
    let startedFirstId = null;

    // Existing active sessions for these topics — resume rather than
    // re-create (the DB's unique index would reject a duplicate anyway).
    const { data: existing } = await supabase.from("flashcard_sessions").select("id, topic_id").eq("user_id", user.id).eq("status", "active").in("topic_id", Array.from(selectedTopicIds));
    const existingByTopic = {};
    (existing || []).forEach((s) => { existingByTopic[s.topic_id] = s.id; });

    // Card stats (for unseen/weakest strategies).
    const { data: statsRows } = await supabase.from("flashcard_card_stats").select("*").eq("user_id", user.id);
    const statsByCard = {};
    (statsRows || []).forEach((r) => { statsByCard[r.card_id] = r; });

    for (const topicId of selectedTopicIds) {
      if (existingByTopic[topicId]) { if (!startedFirstId) startedFirstId = existingByTopic[topicId]; continue; }

      let q = supabase.from("flashcards").select("*").eq("unit_id", unitId).eq("topic_id", topicId);
      if (cardTypeFilter !== "all") q = q.eq("card_type", cardTypeFilter);
      const { data: cards } = await q;
      let pool = cards || [];

      if (mode === "mistakes") {
        pool = pool.filter((c) => ["again", "hard"].includes(statsByCard[c.id]?.latest_label));
      }
      if (!pool.length) continue;

      // Ordering per strategy, then cap to the chosen count.
      if (strategy === "unseen") {
        pool = [...pool].sort((a, b) => (statsByCard[a.id]?.times_studied || 0) - (statsByCard[b.id]?.times_studied || 0));
      } else if (strategy === "weakest") {
        const weight = { again: 0, hard: 1, normal: 2, easy: 3, undefined: -1 };
        pool = [...pool].sort((a, b) => (weight[statsByCard[a.id]?.latest_label] ?? -1) - (weight[statsByCard[b.id]?.latest_label] ?? -1));
      } else {
        pool = [...pool].sort(() => Math.random() - 0.5);
      }
      const n = countChoice === "all" ? pool.length : Math.min(Number(countChoice), pool.length);
      pool = pool.slice(0, n);

      const cardState = pool.map((c) => defaultCardEntry(c.id));
      const { data: inserted } = await supabase.from("flashcard_sessions").insert({
        user_id: user.id, unit_id: unitId, topic_id: topicId, mode, card_state: cardState,
      }).select().single();
      if (inserted && !startedFirstId) startedFirstId = inserted.id;
    }

    setStarting(false);
    if (startedFirstId) { showToast("Session started"); onStarted(startedFirstId); }
    else showToast("No cards match that selection");
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--soft)", cursor: "pointer", marginBottom: 16, fontSize: 13 }}>
        <IconArrowLeft /> Back
      </button>
      <h2 style={{ margin: "0 0 4px", fontSize: 21, fontWeight: 700 }}>Start a session</h2>
      <div style={{ fontSize: 13, color: "var(--soft)", marginBottom: 20 }}>Pick one or more topics — each gets its own session.</div>

      <div style={{ marginBottom: 18 }}>
        <label className="h-field-label">Topics</label>
        <div style={{ display: "grid", gap: 16, marginTop: 8 }}>
          {unitData.map((s) => {
            const subjectTopics = topics.filter((t) => t.subjectKey === s.key);
            if (!subjectTopics.length) return null;
            return (
              <div key={s.key}>
                <div style={{ fontSize: 11, color: "var(--soft)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 700, marginBottom: 8 }}>{s.name}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {subjectTopics.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      data-sound="none"
                      onClick={() => toggleTopic(t.id)}
                      style={{
                        fontSize: 12.5, fontWeight: 600, padding: "7px 14px", borderRadius: 100, cursor: "pointer",
                        border: `1px solid ${selectedTopicIds.has(t.id) ? "var(--purple)" : "var(--panel-border)"}`,
                        background: selectedTopicIds.has(t.id) ? "var(--grad-primary)" : "var(--panel-solid)",
                        color: selectedTopicIds.has(t.id) ? "#fff" : "var(--ink)",
                      }}
                    >
                      {t.sub ? "– " : ""}{t.name}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 18 }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label className="h-field-label">Card type</label>
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            {[{ key: "all", label: "All" }, { key: "basic", label: "Basic" }, { key: "cloze", label: "Cloze" }].map((o) => (
              <button key={o.key} type="button" data-sound="none" onClick={() => setCardTypeFilter(o.key)}
                style={{ fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 100, cursor: "pointer", border: `1px solid ${cardTypeFilter === o.key ? "var(--purple)" : "var(--panel-border)"}`, background: cardTypeFilter === o.key ? "var(--grad-primary)" : "var(--panel-solid)", color: cardTypeFilter === o.key ? "#fff" : "var(--ink)" }}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label className="h-field-label">Pool</label>
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            {[{ key: "all", label: "All cards" }, { key: "mistakes", label: "Weak only" }].map((o) => (
              <button key={o.key} type="button" data-sound="none" onClick={() => setMode(o.key)}
                style={{ fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 100, cursor: "pointer", border: `1px solid ${mode === o.key ? "var(--purple)" : "var(--panel-border)"}`, background: mode === o.key ? "var(--grad-primary)" : "var(--panel-solid)", color: mode === o.key ? "#fff" : "var(--ink)" }}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 22 }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label className="h-field-label">Order</label>
          <select value={strategy} onChange={(e) => setStrategy(e.target.value)} style={{ width: "100%", marginTop: 6 }}>
            <option value="random">Random</option>
            <option value="unseen">Never studied first</option>
            <option value="weakest">Weakest first</option>
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label className="h-field-label">How many cards</label>
          <select value={countChoice} onChange={(e) => setCountChoice(e.target.value)} style={{ width: "100%", marginTop: 6 }}>
            <option value="all">All available</option>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="30">30</option>
            <option value="50">50</option>
          </select>
        </div>
      </div>

      <button className="btn-primary" onClick={startSessions} disabled={!selectedTopicIds.size || starting}>
        {starting ? "Starting…" : `Start ${selectedTopicIds.size > 1 ? `${selectedTopicIds.size} sessions` : "session"}`}
      </button>
    </div>
  );
}

/* ==================== Practice loop ==================== */

function PracticeLoop({ supabase, user, session, topicLabel, onExit, onSessionUpdate }) {
  const [cardState, setCardState] = useState(session.card_state || []);
  const [cardsById, setCardsById] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [tick, setTick] = useState(0); // forces re-check of "due now" every so often
  const [elapsedSec, setElapsedSec] = useState(session.seconds_spent || 0);
  const timerRef = useRef(null);

  useEffect(() => {
    (async () => {
      const ids = (session.card_state || []).map((c) => c.card_id);
      if (!ids.length) { setCardsById({}); return; }
      const { data } = await supabase.from("flashcards").select("*").in("id", ids);
      const map = {};
      (data || []).forEach((c) => { map[c.id] = c; });
      setCardsById(map);
    })();
  }, [session.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-check every 15s whether a previously-paused card has become due.
  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(iv);
  }, []);

  // A simple, visible, continuously-ticking timer — same pattern QBank
  // uses — instead of an idle-gap heuristic. Only pauses while the
  // session itself is paused (nothing due right now), same as it not
  // counting toward a QBank run that's explicitly paused.
  const due = nextDueCard(cardState);
  useEffect(() => {
    clearInterval(timerRef.current);
    if (due) timerRef.current = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [due?.card_id, !!due]); // eslint-disable-line react-hooks/exhaustive-deps

  async function persist(newCardState, extra = {}) {
    const payload = { card_state: newCardState, seconds_spent: elapsedSec, updated_at: new Date().toISOString(), ...extra };
    const { data } = await supabase.from("flashcard_sessions").update(payload).eq("id", session.id).eq("user_id", user.id).select().single();
    if (data) onSessionUpdate(data);
  }

  if (cardsById === null) return <div style={{ color: "var(--soft)", fontSize: 13 }}>Loading…</div>;

  const activeCount = cardState.filter((c) => c.label !== "easy").length;
  const easyCount = cardState.length - activeCount;
  const mm = String(Math.floor(elapsedSec / 60)).padStart(2, "0");
  const ss = String(elapsedSec % 60).padStart(2, "0");

  async function rate(label) {
    if (!due) return;
    playTick();
    const updatedEntry = rateCard(due, label);
    const newCardState = cardState.map((c) => (c.card_id === due.card_id ? updatedEntry : c));
    setCardState(newCardState);
    setRevealed(false);

    // Durable per-card stats, independent of session outcome. A fresh
    // Again/Hard un-dismisses it from Review Your Weak Points, even if a
    // past instance of this same weakness was already marked reviewed.
    await supabase.from("flashcard_card_stats").upsert({
      user_id: user.id, card_id: due.card_id,
      times_studied: ((await supabase.from("flashcard_card_stats").select("times_studied").eq("user_id", user.id).eq("card_id", due.card_id).maybeSingle()).data?.times_studied || 0) + 1,
      latest_label: label, last_studied_at: new Date().toISOString(),
      reviewed: false,
    }, { onConflict: "user_id,card_id" });

    if (sessionIsComplete(newCardState)) {
      playSuccess();
      clearInterval(timerRef.current);
      await persist(newCardState, { status: "completed", completed_at: new Date().toISOString() });
    } else {
      await persist(newCardState);
    }
  }

  if (sessionIsComplete(cardState)) {
    return (
      <div style={{ maxWidth: 480, margin: "40px auto", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>🎉</div>
        <h2 style={{ margin: "0 0 8px" }}>Session complete</h2>
        <div style={{ color: "var(--soft)", fontSize: 13.5, marginBottom: 20 }}>Every card in {topicLabel} reached Easy — {mm}:{ss} studied.</div>
        <button className="btn-primary" onClick={exitAndSave}>Back to sessions</button>
      </div>
    );
  }

  async function exitAndSave() {
    clearInterval(timerRef.current);
    if (elapsedSec !== (session.seconds_spent || 0)) {
      await supabase.from("flashcard_sessions").update({ seconds_spent: elapsedSec, updated_at: new Date().toISOString() }).eq("id", session.id).eq("user_id", user.id);
    }
    onExit();
  }

  const soonest = nextDueTime(cardState);

  return (
    <div style={{ minHeight: "calc(100vh - 60px)", display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 880, margin: "0 auto", width: "100%" }}>
      <button onClick={exitAndSave} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--soft)", cursor: "pointer", marginBottom: 16, fontSize: 13 }}>
        <IconArrowLeft /> Back to sessions
      </button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 19 }}>{topicLabel}</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "var(--amber)" }}><IconClock style={{ width: 15, height: 15 }} /> {mm}:{ss}</div>
          <span style={{ fontSize: 12.5, color: "var(--soft)" }}>{easyCount}/{cardState.length} mastered</span>
        </div>
      </div>

      {!due ? (
        <div className="card" style={{ padding: "40px 24px", textAlign: "center" }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Paused for now</div>
          <div style={{ color: "var(--soft)", fontSize: 13, marginBottom: 16 }}>
            {soonest ? `Next card ready in about ${fmtCountdown(new Date(soonest) - new Date())}.` : "Nothing left to review right now."}
          </div>
          <div style={{ color: "var(--soft)", fontSize: 12.5 }}>Try another session while you wait, or come back to this one shortly.</div>
          <button onClick={exitAndSave} className="btn-primary" style={{ marginTop: 18 }}>Back to sessions</button>
        </div>
      ) : (
        <CardFace key={due.card_id} card={cardsById[due.card_id]} revealed={revealed} onToggle={() => setRevealed((v) => !v)} />
      )}

      {due && (
        <div style={{ display: "flex", gap: 8, marginTop: 18, justifyContent: "center", flexWrap: "wrap" }}>
          {!revealed ? (
            <button className="btn-primary" onClick={() => setRevealed(true)}>Show answer</button>
          ) : (
            RATE_BUTTONS.map((b) => (
              <button
                key={b.key}
                onClick={() => rate(b.key)}
                data-sound="none"
                style={{ fontSize: 13, fontWeight: 700, padding: "10px 18px", borderRadius: 100, cursor: "pointer", border: `1px solid ${b.color}`, background: "var(--panel-solid)", color: b.color }}
              >
                {b.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ==================== Weak cards review (read-only) ==================== */

function WeakCardsReview({ supabase, user, topics, cardStats, onMarkReviewed, onBack }) {
  const [cardsById, setCardsById] = useState(null);
  const [dismissed, setDismissed] = useState(() => new Set());
  const [confirming, setConfirming] = useState(() => new Set());

  useEffect(() => {
    (async () => {
      const ids = Object.entries(cardStats).filter(([, s]) => ["again", "hard"].includes(s.latest_label)).map(([id]) => id);
      if (!ids.length) { setCardsById({}); return; }
      const { data } = await supabase.from("flashcards").select("*").in("id", ids);
      const map = {};
      (data || []).forEach((c) => { map[c.id] = c; });
      setCardsById(map);
    })();
  }, [supabase, cardStats]);

  function topicName(topicId) {
    return topics.find((t) => t.id === topicId)?.name || topicId;
  }

  async function markReviewed(cardId) {
    playSuccess();
    setConfirming((prev) => new Set(prev).add(cardId));
    setTimeout(() => {
      setDismissed((prev) => new Set(prev).add(cardId));
      onMarkReviewed?.(cardId);
      setConfirming((prev) => { const n = new Set(prev); n.delete(cardId); return n; });
    }, 480);
    await supabase.from("flashcard_card_stats").update({ reviewed: true }).eq("user_id", user.id).eq("card_id", cardId);
  }

  if (cardsById === null) return <div style={{ color: "var(--soft)", fontSize: 13 }}>Loading…</div>;

  const grouped = {};
  Object.entries(cardStats).forEach(([cardId, s]) => {
    if (!["again", "hard"].includes(s.latest_label) || s.reviewed || dismissed.has(cardId)) return;
    const card = cardsById[cardId];
    if (!card) return;
    (grouped[topicName(card.topic_id)] = grouped[topicName(card.topic_id)] || []).push({ card, label: s.latest_label });
  });

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--soft)", cursor: "pointer", marginBottom: 16, fontSize: 13 }}>
        <IconArrowLeft /> Back to sessions
      </button>
      <div style={{ fontSize: 11, color: "var(--amber)", fontWeight: 700, letterSpacing: 1 }}>FLASHCARDS</div>
      <h1 style={{ margin: "4px 0 6px", fontSize: 24, fontWeight: 800 }}>Review Your Weak Points</h1>
      <div style={{ color: "var(--soft)", fontSize: 13, marginBottom: 22 }}>Cards last rated Again or Hard, shown with the answer directly — no need to study through them again.</div>
      {Object.keys(grouped).length === 0 ? (
        <div style={{ color: "var(--soft)", fontSize: 13.5 }}>Nothing here right now.</div>
      ) : (
        Object.entries(grouped).map(([topicLabel, items]) => (
          <div key={topicLabel} style={{ marginBottom: 26 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>{topicLabel}</div>
            <div style={{ display: "grid", gap: 12 }}>
              {items.map(({ card, label }) => {
                const isConfirming = confirming.has(card.id);
                return (
                <div key={card.id} className="card" style={{ padding: 18, display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start", flexWrap: "wrap", opacity: isConfirming ? 0.5 : 1, transform: isConfirming ? "scale(.98)" : "scale(1)", transition: "opacity .3s ease, transform .3s ease" }}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    {card.card_type === "cloze" ? (
                      <div style={{ fontSize: 14.5, lineHeight: 1.7 }}>
                        {parseCloze(card.cloze_text).map((seg, i) =>
                          seg.blank
                            ? <span key={i} style={{ fontWeight: 700, color: "var(--purple)" }}>{seg.text}</span>
                            : <span key={i}>{seg.text}</span>
                        )}
                      </div>
                    ) : (
                      <>
                        <div style={{ fontWeight: 600, fontSize: 14.5 }}>{card.front}</div>
                        <div style={{ marginTop: 8, fontSize: 13.5, color: "var(--soft)" }}>{card.back}</div>
                      </>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: label === "again" ? "var(--red)" : "var(--amber)", background: `color-mix(in srgb, ${label === "again" ? "var(--red)" : "var(--amber)"} 16%, transparent)`, padding: "3px 10px", borderRadius: 20, textTransform: "uppercase" }}>{label}</span>
                    <button
                      type="button"
                      data-sound="none"
                      disabled={isConfirming}
                      onClick={() => markReviewed(card.id)}
                      title="Mark as reviewed"
                      style={{
                        display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700, padding: "7px 14px", borderRadius: 100,
                        cursor: isConfirming ? "default" : "pointer", whiteSpace: "nowrap",
                        border: `1.5px solid ${isConfirming ? "var(--green)" : "var(--panel-border)"}`,
                        background: isConfirming ? "var(--green)" : "var(--panel-solid)",
                        color: isConfirming ? "#fff" : "var(--soft)",
                        transform: isConfirming ? "scale(1.08)" : "scale(1)",
                        transition: "transform .18s cubic-bezier(.34,1.56,.64,1), background .18s ease, border-color .18s ease, color .18s ease",
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 12 9 17 20 6" /></svg>
                      {isConfirming ? "Reviewed ✓" : "Reviewed"}
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function CardFace({ card, revealed, onToggle }) {
  if (!card) return null;
  const isCloze = card.card_type === "cloze";
  return (
    <div className="flip-card-scene" style={{ minHeight: "min(52vh, 440px)" }} onClick={onToggle}>
      <div className={`flip-card-inner${revealed ? " is-flipped" : ""}`} style={{ minHeight: "min(52vh, 440px)", cursor: "pointer" }}>
        {/* Front face: the question / masked cloze */}
        <div className="card flip-card-face">
          {isCloze ? (
            <div style={{ fontSize: 22, lineHeight: 1.9, maxWidth: 640 }}>
              {parseCloze(card.cloze_text).map((seg, i) =>
                seg.blank ? (
                  <span key={i} style={{ display: "inline-block", minWidth: 40, borderBottom: "2px solid var(--purple)", color: seg.hint ? "var(--soft)" : "transparent", fontWeight: 500, fontStyle: seg.hint ? "italic" : "normal" }}>
                    {seg.hint ? `[${seg.hint}]` : "\u00A0\u00A0\u00A0\u00A0\u00A0"}
                  </span>
                ) : (
                  <span key={i}>{seg.text}</span>
                )
              )}
            </div>
          ) : (
            <div style={{ fontSize: 22, fontWeight: 600, maxWidth: 640 }}>{card.front}</div>
          )}
        </div>

        {/* Back face: the answer / revealed cloze */}
        <div className="card flip-card-face back">
          {isCloze ? (
            <div style={{ fontSize: 22, lineHeight: 1.9, maxWidth: 640 }}>
              {parseCloze(card.cloze_text).map((seg, i) =>
                seg.blank ? (
                  <span key={i} style={{ display: "inline-block", minWidth: 40, borderBottom: "2px solid var(--purple)", color: "var(--purple)", fontWeight: 700 }}>{seg.text}</span>
                ) : (
                  <span key={i}>{seg.text}</span>
                )
              )}
            </div>
          ) : (
            <div style={{ maxWidth: 640 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--soft)" }}>{card.front}</div>
              <div style={{ height: 1, background: "var(--panel-border)", margin: "18px 0" }} />
              <div style={{ fontSize: 21, fontWeight: 600 }}>{card.back}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
