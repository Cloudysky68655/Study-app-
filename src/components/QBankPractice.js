"use client";
import { useEffect, useState, useRef } from "react";
import { UNITS, getUnitTopics } from "@/lib/units";
import { IconCheck, IconClock, IconPause, IconPlay, IconArrowLeft } from "@/components/Icons";
import { playCorrect, playIncorrect, playClick, playSuccess } from "@/lib/sounds";
import { calibrationDelta, clampCalibration, calcMastery } from "@/lib/topicData";

// Strips a leading "[Sub-topic]" review label from a question's stem —
// that label is only for filtering/review in the Manage tab and should
// never be shown to the person actually answering the question.
function displayQuestion(text) {
  return (text || "").replace(/^\s*\[[^\]]*\]\s*/, "");
}

// Splits a "format A" question (stem + numbered propositions 1-5) into its
// stem and an array of { num, text } items, regardless of what separator
// (or none) sits between them in the source data. Returns items:null when
// the text doesn't look like a numbered-proposition question, so callers
// can fall back to plain text rendering.
function splitPropositions(text) {
  const re = /(?:^|[\s\u2028\u2029])([1-5])[.)]\s+/g;
  const hits = [];
  let m;
  while ((m = re.exec(text))) {
    hits.push({ num: m[1], numIdx: m.index + m[0].indexOf(m[1]), afterIdx: re.lastIndex });
  }
  if (hits.length < 3) return { stem: text, items: null };
  const nums = hits.map((h) => h.num);
  const isSequential = nums.every((n, i) => Number(n) === i + 1);
  if (!isSequential) return { stem: text, items: null };
  const stem = text.slice(0, hits[0].numIdx).trim();
  const items = hits.map((h, i) => {
    const end = i + 1 < hits.length ? hits[i + 1].numIdx : text.length;
    return { num: h.num, text: text.slice(h.afterIdx, end).trim() };
  });
  return { stem, items };
}

function QuestionText({ text, style }) {
  const clean = displayQuestion(text);
  const { stem, items } = splitPropositions(clean);
  if (!items) return <div style={style}>{clean}</div>;
  return (
    <div style={style}>
      {stem && <div style={{ marginBottom: 10 }}>{stem}</div>}
      <div style={{ display: "grid", gap: 6, fontWeight: 500, fontSize: "0.82em" }}>
        {items.map((it) => (
          <div key={it.num} style={{ display: "flex", gap: 8 }}>
            <span style={{ flex: "none", opacity: 0.6 }}>{it.num}.</span>
            <span>{it.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   QBank Practice — extracted from the old standalone /qbank route so it
   can be embedded directly as Study's QBank tab (no page navigation,
   same as Tracker/Stats/History/Plan). LogPassPopup is used internally
   by PracticeTab to log a pass right after finishing a run.
   ============================================================ */

const CONFIDENCE_LEVELS = [
  { key: "low", label: "Low" },
  { key: "normal", label: "Normal" },
  { key: "high", label: "High" },
];

const LETTERS = "ABCDEFGH";
const SESSION_KEY = "qbank_practice_session_v1";

/* ==================== PRACTICE ==================== */

function PracticeTab({ supabase, user, showToast, activeUnitId, onProgressChanged }) {
  const [phase, setPhase] = useState("setup"); // setup | running | result | reviewWeak
  const [allQuestions, setAllQuestions] = useState([]);
  const [loadingQs, setLoadingQs] = useState(true);

  const [unitFilter, setUnitFilter] = useState(activeUnitId || "");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [topicFilter, setTopicFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [mistakesOnly, setMistakesOnly] = useState(false);
  const [latestAttemptByQuestion, setLatestAttemptByQuestion] = useState({});
  const [justReviewedIds, setJustReviewedIds] = useState(() => new Set());
  const [count, setCount] = useState(10);
  const [order, setOrder] = useState("random");
  const [feedback, setFeedback] = useState("instant");
  const [practiceMode, setPracticeMode] = useState("mcq"); // "mcq" | "recall" | "exam"
  const [examDuration, setExamDuration] = useState(30); // minutes, exam mode only

  const [exam, setExam] = useState(null); // { questions, answers, locked, current, scope }
  const [elapsedSec, setElapsedSec] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [tapAnim, setTapAnim] = useState(null); // { index, correct } — transient animation on the tapped option
  const timerRef = useRef(null);
  const finishingRef = useRef(false); // guards against a duplicate finishExam() call (manual submit + auto-timeout firing together)

  const [showPassPopup, setShowPassPopup] = useState(false);
  const [passSaving, setPassSaving] = useState(false);
  const [passLogged, setPassLogged] = useState(false);
  const [lastMinutes, setLastMinutes] = useState(1);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase.from("qbank_questions").select("*");
      if (active && !error) setAllQuestions(data || []);
      if (active) setLoadingQs(false);
    })();
    return () => { active = false; };
  }, [supabase]);

  // Latest attempt per question, for "Review Your Weak Points" — only the
  // most recent attempt matters, so a question the person has since
  // nailed with normal/high confidence drops out automatically.
  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.from("qbank_attempts").select("*").eq("user_id", user.id).order("answered_at", { ascending: false });
      if (!active) return;
      const latest = {};
      (data || []).forEach((a) => { if (!latest[a.question_id]) latest[a.question_id] = a; });
      setLatestAttemptByQuestion(latest);
    })();
    return () => { active = false; };
  }, [supabase, user.id]);

  // No "All units" option anymore — a unit is always required. If the
  // active unit has no questions yet (or none was set), fall back to
  // whichever unit actually has questions, so the picker is never stuck
  // on an empty pool.
  useEffect(() => {
    if (loadingQs || !allQuestions.length) return;
    const hasCurrent = allQuestions.some((q) => q.unit_id === unitFilter);
    if (!hasCurrent) {
      const fallback = [...new Set(allQuestions.map((q) => q.unit_id))][0];
      if (fallback) setUnitFilter(fallback);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingQs, allQuestions]);

  const restoredRef = useRef(false);

  // Restore an in-progress (or just-finished) practice run once, right
  // after mount. This whole page unmounts when the person navigates to
  // another tab (Study/Habits) — without this, that would silently wipe
  // out a quiz in progress. Normally comes back paused, since time spent
  // away on another tab shouldn't quietly count toward minutes studied —
  // except exam mode, which can never be paused, so it keeps ticking
  // straight through a refresh/return instead of getting stuck with no
  // way to resume (there's no pause button to un-pause it with).
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!saved || (saved.phase !== "running" && saved.phase !== "result")) return;
      const restoredMode = saved.practiceMode || "mcq";
      setUnitFilter(saved.unitFilter || activeUnitId || "");
      setSubjectFilter(saved.subjectFilter || "");
      setTopicFilter(saved.topicFilter || "");
      setTypeFilter(saved.typeFilter || "");
      setCount(saved.count || 10);
      setOrder(saved.order || "random");
      setFeedback(saved.feedback || "instant");
      setPracticeMode(restoredMode);
      setExamDuration(saved.examDuration || 30);
      setExam(saved.exam || null);
      setElapsedSec(saved.elapsedSec || 0);
      setPassLogged(saved.passLogged || false);
      setPhase(saved.phase);
      if (restoredMode === "exam" && saved.phase === "running") {
        setPaused(false);
        timerRef.current = setInterval(() => setElapsedSec((s) => s + 1), 1000);
      } else {
        setPaused(true);
      }
    } catch (e) { /* corrupt/unavailable storage — just skip restoring */ }
  }, []);

  // Persist whenever anything meaningful changes, so a route change
  // (which unmounts this page) doesn't lose the run.
  useEffect(() => {
    try {
      if (phase === "setup") { sessionStorage.removeItem(SESSION_KEY); return; }
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        phase, exam, elapsedSec, paused, passLogged,
        unitFilter, subjectFilter, topicFilter, typeFilter, count, order, feedback, practiceMode, examDuration,
      }));
    } catch (e) { /* storage full/unavailable — non-critical */ }
  }, [phase, exam, elapsedSec, paused, passLogged, unitFilter, subjectFilter, topicFilter, typeFilter, count, order, feedback, practiceMode, examDuration]);

  // Stop any live timer interval if the page unmounts mid-quiz (e.g. the
  // person navigates to Study/Habits) — restoring always comes back
  // paused anyway, so there's no reason for the old interval to keep
  // silently ticking in the background.
  useEffect(() => {
    return () => { clearInterval(timerRef.current); };
  }, []);

  function metaFor(q) {
    const unit = UNITS.find((u) => u.key === q.unit_id);
    const topic = unit ? getUnitTopics(unit.key).find((t) => t.id === q.topic_id) : null;
    return { unitName: unit?.name || q.unit_id, subjectName: topic?.subject || "—", topicName: topic?.name || q.topic_id };
  }

  const unitsWithQuestions = [...new Set(allQuestions.map((q) => q.unit_id))]
    .map((key) => UNITS.find((u) => u.key === key))
    .filter(Boolean);

  const subjectsAvailable = [...new Set(
    allQuestions.filter((q) => !unitFilter || q.unit_id === unitFilter).map((q) => metaFor(q).subjectName)
  )].sort();

  const topicsAvailable = [...new Set(
    allQuestions
      .filter((q) => (!unitFilter || q.unit_id === unitFilter) && (!subjectFilter || metaFor(q).subjectName === subjectFilter))
      .map((q) => q.topic_id)
  )].map((id) => {
    const q = allQuestions.find((qq) => qq.topic_id === id);
    return { id, name: metaFor(q).topicName };
  }).sort((a, b) => a.name.localeCompare(b.name));

  function isWeak(questionId) {
    const a = latestAttemptByQuestion[questionId];
    if (!a) return false;
    return !a.correct || a.confidence === "low";
  }

  // Attempts eligible for the read-only "Review Your Weak Points" list —
  // same weak criteria as isWeak(), minus anything already dismissed.
  function weakUnreviewedAttempts() {
    return Object.values(latestAttemptByQuestion).filter((a) => (!a.correct || a.confidence === "low") && !a.reviewed);
  }

  async function markAttemptReviewed(attemptId, questionId) {
    playSuccess();
    setJustReviewedIds((prev) => new Set(prev).add(attemptId));
    setTimeout(() => {
      setLatestAttemptByQuestion((prev) => ({ ...prev, [questionId]: { ...prev[questionId], reviewed: true } }));
      setJustReviewedIds((prev) => { const n = new Set(prev); n.delete(attemptId); return n; });
    }, 480);
    await supabase.from("qbank_attempts").update({ reviewed: true }).eq("id", attemptId);
  }

  const pool = allQuestions.filter((q) =>
    (!unitFilter || q.unit_id === unitFilter) &&
    (!subjectFilter || metaFor(q).subjectName === subjectFilter) &&
    (!topicFilter || q.topic_id === topicFilter) &&
    (!typeFilter || q.question_type === typeFilter) &&
    (!mistakesOnly || isWeak(q.id))
  );

  const isExamMode = practiceMode === "exam";
  const revealInstant = feedback === "instant" && !isExamMode;

  function startExam() {
    if (!pool.length) return;
    // Defensive: guarantee no leftover timer or finish-guard state from a
    // previous run can bleed into this new one.
    clearInterval(timerRef.current);
    finishingRef.current = false;
    let selected = [...pool];
    if (order === "random") selected.sort(() => Math.random() - 0.5);
    const n = Math.min(Math.max(parseInt(count, 10) || 1, 1), selected.length);
    selected = selected.slice(0, n);

    // Figure out the real scope from the questions that actually ended up
    // in the quiz — not just what was picked in the dropdowns. If every
    // question happens to share the same topic (even under "All topics"),
    // that still counts as a single-topic run for the pass popup.
    const uniqueTopicIds = [...new Set(selected.map((q) => q.topic_id))];
    const singleTopicId = uniqueTopicIds.length === 1 ? uniqueTopicIds[0] : null;
    const singleUnitId = singleTopicId ? selected[0].unit_id : null;

    const scopeParts = [
      UNITS.find((u) => u.key === unitFilter)?.name,
      subjectFilter || null,
      singleTopicId ? metaFor(selected[0]).topicName : null,
    ].filter(Boolean);
    setExam({
      questions: selected,
      answers: new Array(selected.length).fill(null),
      locked: new Array(selected.length).fill(false),
      revealed: new Array(selected.length).fill(practiceMode !== "recall"),
      confidences: new Array(selected.length).fill(null),
      current: 0,
      scope: scopeParts.join(" → "),
      singleTopicId, singleUnitId,
      examTotalSec: isExamMode ? Math.max(1, Math.round(Number(examDuration) || 30)) * 60 : null,
    });
    setElapsedSec(0);
    setTapAnim(null);
    setPaused(false);
    timerRef.current = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    setPhase("running");
  }

  // Grades the current question (colors, sound, lock) — for instant-feedback
  // mode this is deliberately NOT called from pickOption anymore. It only
  // fires once a confidence level has been set, so the confidence choice
  // always happens after picking an answer but before the correct/incorrect
  // reveal — otherwise it's too easy to skip past it on reflex.
  function gradeCurrent() {
    const q = exam.questions[exam.current];
    const i = exam.answers[exam.current];
    if (i === null || i === undefined) return;
    const isCorrect = i === q.options.findIndex((o) => o.correct);
    if (isCorrect) playCorrect(); else playIncorrect();
    setTapAnim({ index: i, correct: isCorrect });
    setPending(true);
    setTimeout(() => {
      setExam((ex) => {
        const locked = [...ex.locked]; locked[ex.current] = true;
        return { ...ex, locked };
      });
      setPending(false);
      setTapAnim(null);
    }, 260);
  }

  function setConfidence(level) {
    playClick();
    setExam((ex) => {
      const confidences = [...(ex.confidences || new Array(ex.questions.length).fill(null))];
      confidences[ex.current] = level;
      return { ...ex, confidences };
    });
    // Instant-feedback grading was deferred until confidence is set (see
    // pickOption) — trigger it now that it has been.
    if (revealInstant && exam.answers[exam.current] !== null && !exam.locked[exam.current]) {
      gradeCurrent();
    }
  }

  function revealChoices() {
    setExam((ex) => {
      const revealed = [...ex.revealed];
      revealed[ex.current] = true;
      return { ...ex, revealed };
    });
  }

  function togglePause() {
    if (isExamMode) return; // exam mode can't be paused
    if (paused) {
      timerRef.current = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    setPaused((p) => !p);
  }

  // Exam mode auto-submits the moment the chosen duration runs out.
  useEffect(() => {
    if (phase === "running" && exam?.examTotalSec != null && elapsedSec >= exam.examTotalSec) {
      finishExam();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedSec]);

  function pickOption(i) {
    if (pending) return;
    if (revealInstant) {
      // Just select the option — grading (colors/sound/lock) is deferred
      // until a confidence level is chosen, via gradeCurrent() above.
      if (exam.locked[exam.current]) return;
      playClick();
      setExam((ex) => {
        const answers = [...ex.answers]; answers[ex.current] = i;
        return { ...ex, answers };
      });
    } else {
      // Feedback is deferred to the end (or this is exam mode) — a
      // distinct correct/incorrect sound or animation here would leak
      // the answer, so this is a neutral tap only.
      playClick();
      setExam((ex) => {
        const answers = [...ex.answers]; answers[ex.current] = i;
        return { ...ex, answers };
      });
    }
  }

  function goNext() {
    setTapAnim(null);
    if (exam.current < exam.questions.length - 1) {
      setExam((ex) => ({ ...ex, current: ex.current + 1 }));
    } else {
      finishExam();
    }
  }
  function goPrev() {
    setTapAnim(null);
    if (exam.current > 0) setExam((ex) => ({ ...ex, current: ex.current - 1 }));
  }

  // Groups this run's answered questions by topic and folds each one's
  // confidence-vs-correctness result into that topic's running
  // calibration_adj (+ review_flag) on topic_progress — see
  // calibrationDelta() in lib/topicData.js for the actual rule. Unanswered
  // questions and "normal" confidence (the default when nothing was
  // tapped) contribute nothing, by design.
  async function applyCalibration() {
    const byTopic = {};
    exam.questions.forEach((q, i) => {
      const ans = exam.answers[i];
      if (ans === null || ans === undefined) return;
      const confidence = exam.confidences?.[i] || "normal";
      const isCorrect = ans === q.options.findIndex((o) => o.correct);
      const { delta, flagged } = calibrationDelta(confidence, isCorrect);
      if (!delta && !flagged) return;
      const key = `${q.unit_id}::${q.topic_id}`;
      if (!byTopic[key]) byTopic[key] = { unitId: q.unit_id, topicId: q.topic_id, delta: 0, flagged: false };
      byTopic[key].delta += delta;
      byTopic[key].flagged = byTopic[key].flagged || flagged;
    });
    const entries = Object.values(byTopic);
    if (!entries.length) return;
    await Promise.all(entries.map(async ({ unitId, topicId, delta, flagged }) => {
      const { data: current } = await supabase.from("topic_progress").select("*").eq("user_id", user.id).eq("unit_id", unitId).eq("topic_id", topicId).maybeSingle();
      const newAdj = clampCalibration((current?.calibration_adj || 0) + delta);
      const payload = {
        user_id: user.id, unit_id: unitId, topic_id: topicId,
        understanding: current?.understanding ?? null, qcm: current?.qcm ?? null,
        confidence: current?.confidence || 3, note: current?.note || "",
        passes: current?.passes || 0, entries: current?.entries || [], history: current?.history || [],
        calibration_adj: newAdj,
        review_flag: flagged ? true : (current?.review_flag || false),
      };
      await supabase.from("topic_progress").upsert(payload, { onConflict: "user_id,unit_id,topic_id" });
    }));
  }

  async function finishExam() {
    if (finishingRef.current) return; // already finishing this exam — ignore a duplicate trigger
    finishingRef.current = true;
    clearInterval(timerRef.current);
    const correct = exam.questions.reduce((acc, q, i) => acc + (exam.answers[i] === q.options.findIndex((o) => o.correct) ? 1 : 0), 0);
    const pct = Math.round((correct / exam.questions.length) * 100);
    const minutes = Math.max(1, Math.round(elapsedSec / 60));

    // Per-question attempt log — powers "Review Your Weak Points". Only
    // questions that were actually answered get logged (skipped ones
    // don't count as an attempt either way).
    const attemptRows = exam.questions
      .map((q, i) => ({ q, i }))
      .filter(({ i }) => exam.answers[i] !== null && exam.answers[i] !== undefined)
      .map(({ q, i }) => ({
        user_id: user.id,
        question_id: q.id,
        unit_id: q.unit_id,
        topic_id: q.topic_id,
        correct: exam.answers[i] === q.options.findIndex((o) => o.correct),
        confidence: exam.confidences?.[i] || null,
        selected_index: exam.answers[i],
      }));
    if (attemptRows.length) await supabase.from("qbank_attempts").insert(attemptRows);

    await supabase.from("practice_history").insert({
      user_id: user.id,
      scope_label: exam.scope,
      unit_id: exam.singleUnitId || null,
      topic_id: exam.singleTopicId || null,
      total: exam.questions.length,
      correct, pct,
      minutes_spent: minutes,
      status: "completed",
    });
    await applyCalibration();
    onProgressChanged?.();

    setExam((ex) => ({ ...ex, correct, pct, minutes }));
    setLastMinutes(minutes);
    setPassLogged(false);
    setPhase("result");
    if (exam.singleTopicId) setShowPassPopup(true);
  }

  // Ends the run early without a result screen — logs it as abandoned so
  // it's still visible in History (as "abandoned", never counted as
  // completed), and still records whatever per-question attempts were
  // actually answered so far, so "Review Your Weak Points" isn't blind to
  // questions the person did answer before bailing.
  async function abandonExam() {
    clearInterval(timerRef.current);
    finishingRef.current = true;
    const attemptRows = exam.questions
      .map((q, i) => ({ q, i }))
      .filter(({ i }) => exam.answers[i] !== null && exam.answers[i] !== undefined)
      .map(({ q, i }) => ({
        user_id: user.id,
        question_id: q.id,
        unit_id: q.unit_id,
        topic_id: q.topic_id,
        correct: exam.answers[i] === q.options.findIndex((o) => o.correct),
        confidence: exam.confidences?.[i] || null,
        selected_index: exam.answers[i],
      }));
    if (attemptRows.length) await supabase.from("qbank_attempts").insert(attemptRows);

    const answeredCount = exam.answers.filter((a) => a !== null && a !== undefined).length;
    const correctSoFar = exam.questions.reduce((acc, q, i) => acc + (exam.answers[i] === q.options.findIndex((o) => o.correct) ? 1 : 0), 0);
    await supabase.from("practice_history").insert({
      user_id: user.id,
      scope_label: exam.scope,
      unit_id: exam.singleUnitId || null,
      topic_id: exam.singleTopicId || null,
      total: exam.questions.length,
      correct: correctSoFar,
      pct: answeredCount ? Math.round((correctSoFar / answeredCount) * 100) : 0,
      minutes_spent: Math.max(1, Math.round(elapsedSec / 60)),
      status: "abandoned",
    });
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
    showToast("Session abandoned");
    onProgressChanged?.();
    newExam();
  }

  function newExam() {
    clearInterval(timerRef.current);
    finishingRef.current = false;
    setExam(null);
    setElapsedSec(0);
    setReviewOpen(false);
    setPassLogged(false);
    setPhase("setup");
  }

  if (loadingQs) return <div style={{ color: "var(--soft)", fontSize: 13 }}>Loading…</div>;

  if (phase === "reviewWeak") {
    const weakAttempts = weakUnreviewedAttempts();
    const grouped = {};
    weakAttempts.forEach((a) => {
      const q = allQuestions.find((qq) => qq.id === a.question_id);
      if (!q) return;
      const meta = metaFor(q);
      const key = meta.topicName;
      (grouped[key] = grouped[key] || []).push({ q, a });
    });
    return (
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <button onClick={() => setPhase("setup")} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--soft)", cursor: "pointer", marginBottom: 16, fontSize: 13 }}>
          <IconArrowLeft /> Back
        </button>
        <div style={{ fontSize: 11, color: "var(--amber)", fontWeight: 700, letterSpacing: 1 }}>QBANK</div>
        <h1 style={{ margin: "4px 0 6px", fontSize: 24, fontWeight: 800 }}>Review Your Weak Points</h1>
        <div style={{ color: "var(--soft)", fontSize: 13, marginBottom: 22 }}>Questions you got wrong or answered with low confidence, with the correct answer and what you picked shown directly — no need to answer again.</div>
        {weakAttempts.length === 0 ? (
          <div style={{ color: "var(--soft)", fontSize: 13.5 }}>Nothing here yet — once you answer a question wrong (or right with low confidence), it&apos;ll show up here.</div>
        ) : (
          Object.entries(grouped).map(([topicName, items]) => (
            <div key={topicName} style={{ marginBottom: 26 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>{topicName}</div>
              <div style={{ display: "grid", gap: 12 }}>
                {items.map(({ q, a }) => {
                  const isConfirming = justReviewedIds.has(a.id);
                  return (
                  <div key={q.id} className="card" style={{ padding: 18, opacity: isConfirming ? 0.5 : 1, transform: isConfirming ? "scale(.98)" : "scale(1)", transition: "opacity .3s ease, transform .3s ease" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                      <QuestionText text={q.question} style={{ fontWeight: 600, fontSize: 14.5 }} />
                      <button
                        type="button"
                        data-sound="none"
                        disabled={isConfirming}
                        onClick={() => markAttemptReviewed(a.id, q.id)}
                        title="Mark as reviewed"
                        className="weak-review-btn"
                        style={{
                          display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700, padding: "7px 14px", borderRadius: 100,
                          cursor: isConfirming ? "default" : "pointer", flexShrink: 0, whiteSpace: "nowrap",
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
                    <div style={{ display: "grid", gap: 6 }}>
                      {q.options.map((o, oi) => {
                        const isCorrect = o.correct;
                        const isChosen = a.selected_index === oi;
                        let style = { padding: "8px 12px", borderRadius: 8, fontSize: 13, border: "1px solid var(--panel-border)" };
                        if (isCorrect) style = { ...style, background: "color-mix(in srgb, var(--green) 14%, transparent)", border: "1px solid var(--green)", color: "var(--green)", fontWeight: 600 };
                        else if (isChosen) style = { ...style, background: "color-mix(in srgb, var(--red) 14%, transparent)", border: "1px solid var(--red)", color: "var(--red)", fontWeight: 600 };
                        return (
                          <div key={oi} style={style}>
                            <div>
                              {o.text}
                              {isCorrect && " ✓ Correct answer"}
                              {isChosen && !isCorrect && " ✗ Your answer"}
                              {isChosen && isCorrect && a.confidence === "low" && " (answered correctly, low confidence)"}
                            </div>
                            {o.explanation && <div style={{ marginTop: 4, fontSize: 12, fontWeight: 400, opacity: 0.85 }}>{o.explanation}</div>}
                          </div>
                        );
                      })}
                    </div>
                    {q.explanation && <div style={{ marginTop: 10, fontSize: 12.5, color: "var(--soft)" }}>{q.explanation}</div>}
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

  if (phase === "setup") {
    const weakCount = weakUnreviewedAttempts().length;
    return (
      <div style={{ minHeight: "calc(100vh - 60px)", display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 860, margin: "0 auto", width: "100%" }}>
        <div style={{ fontSize: 11, color: "var(--amber)", fontWeight: 700, letterSpacing: 1 }}>QBANK</div>
        <h1 style={{ margin: "4px 0 16px", fontSize: 26, fontWeight: 800 }}>Practice</h1>
        <button
          type="button"
          data-sound="none"
          disabled={weakCount === 0}
          onClick={() => setPhase("reviewWeak")}
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18, padding: "14px 18px",
            borderRadius: 14, cursor: weakCount === 0 ? "default" : "pointer", textAlign: "left", width: "100%",
            border: "1.5px solid var(--panel-border)", background: "var(--panel-solid)", opacity: weakCount === 0 ? 0.55 : 1,
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)" }}>⚠ Review Your Weak Points</div>
            <div style={{ fontSize: 12, color: "var(--soft)", marginTop: 2 }}>
              {weakCount > 0 ? `${weakCount} question${weakCount === 1 ? "" : "s"} you got wrong or answered with low confidence` : "No weak questions yet — they'll show up here as you practice"}
            </div>
          </div>
          {weakCount > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: "var(--purple)" }}>Review →</span>}
        </button>
        {allQuestions.length === 0 ? (
          <div style={{ color: "var(--soft)", fontSize: 13.5 }}>No practice questions available yet — check back once some are added.</div>
        ) : (
          <div className="card">
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: "var(--soft)", display: "block", marginBottom: 6 }}>Practice mode</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button" onClick={() => setPracticeMode("mcq")} data-sound="none"
                  style={{ flex: "1 1 150px", padding: "12px 14px", borderRadius: 10, textAlign: "left", cursor: "pointer",
                    border: `1.5px solid ${practiceMode === "mcq" ? "var(--purple)" : "var(--panel-border)"}`,
                    background: practiceMode === "mcq" ? "var(--panel)" : "var(--panel-solid)", color: "var(--ink)" }}
                >
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>Multiple choice</div>
                  <div style={{ fontSize: 11.5, color: "var(--soft)", marginTop: 2 }}>Options visible right away, as usual.</div>
                </button>
                <button
                  type="button" onClick={() => setPracticeMode("recall")} data-sound="none"
                  style={{ flex: "1 1 150px", padding: "12px 14px", borderRadius: 10, textAlign: "left", cursor: "pointer",
                    border: `1.5px solid ${practiceMode === "recall" ? "var(--purple)" : "var(--panel-border)"}`,
                    background: practiceMode === "recall" ? "var(--panel)" : "var(--panel-solid)", color: "var(--ink)" }}
                >
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>Active recall</div>
                  <div style={{ fontSize: 11.5, color: "var(--soft)", marginTop: 2 }}>Choices stay hidden — recall the answer first, then reveal.</div>
                </button>
                <button
                  type="button" onClick={() => setPracticeMode("exam")} data-sound="none"
                  style={{ flex: "1 1 150px", padding: "12px 14px", borderRadius: 10, textAlign: "left", cursor: "pointer",
                    border: `1.5px solid ${practiceMode === "exam" ? "var(--purple)" : "var(--panel-border)"}`,
                    background: practiceMode === "exam" ? "var(--panel)" : "var(--panel-solid)", color: "var(--ink)" }}
                >
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>Exam mode</div>
                  <div style={{ fontSize: 11.5, color: "var(--soft)", marginTop: 2 }}>Timed, can&apos;t be paused. Answers reveal only at the end.</div>
                </button>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: "var(--soft)", display: "block", marginBottom: 4 }}>Unit</label>
                <select value={unitFilter} onChange={(e) => { setUnitFilter(e.target.value); setSubjectFilter(""); setTopicFilter(""); }} style={{ width: "100%", padding: 8, borderRadius: 7 }}>
                  {unitsWithQuestions.map((u) => <option key={u.key} value={u.key}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--soft)", display: "block", marginBottom: 4 }}>Subject</label>
                <select value={subjectFilter} onChange={(e) => { setSubjectFilter(e.target.value); setTopicFilter(""); }} style={{ width: "100%", padding: 8, borderRadius: 7 }}>
                  <option value="">All subjects</option>
                  {subjectsAvailable.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--soft)", display: "block", marginBottom: 4 }}>Topic</label>
                <select value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 7 }}>
                  <option value="">All topics</option>
                  {topicsAvailable.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--soft)", display: "block", marginBottom: 4 }}>Question type</label>
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 7 }}>
                  <option value="">All types</option>
                  <option value="exam_like">Exam-like</option>
                  <option value="official_exam">Official exam</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--soft)", display: "block", marginBottom: 4 }}>Question pool</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {[{ key: false, label: "All questions" }, { key: true, label: "Weak only" }].map((o) => (
                    <button
                      key={String(o.key)}
                      type="button"
                      data-sound="none"
                      onClick={() => setMistakesOnly(o.key)}
                      style={{
                        flex: 1, fontSize: 12, fontWeight: 600, padding: "8px 10px", borderRadius: 7, cursor: "pointer",
                        border: `1px solid ${mistakesOnly === o.key ? "var(--purple)" : "var(--panel-border)"}`,
                        background: mistakesOnly === o.key ? "var(--grad-primary)" : "var(--panel-solid)",
                        color: mistakesOnly === o.key ? "#fff" : "var(--ink)",
                      }}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--soft)", display: "block", marginBottom: 4 }}>Number of questions</label>
                <input type="number" min="1" max={pool.length || 1} value={count} onChange={(e) => setCount(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 7 }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--soft)", display: "block", marginBottom: 4 }}>Order</label>
                <select value={order} onChange={(e) => setOrder(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 7 }}>
                  <option value="random">Shuffled</option>
                  <option value="inorder">As added</option>
                </select>
              </div>
              {isExamMode ? (
                <div>
                  <label style={{ fontSize: 11, color: "var(--soft)", display: "block", marginBottom: 4 }}>Exam duration (minutes)</label>
                  <input type="number" min="1" value={examDuration} onChange={(e) => setExamDuration(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 7 }} />
                </div>
              ) : (
                <div>
                  <label style={{ fontSize: 11, color: "var(--soft)", display: "block", marginBottom: 4 }}>Feedback</label>
                  <select value={feedback} onChange={(e) => setFeedback(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 7 }}>
                    <option value="instant">Instant, per question</option>
                    <option value="end">Only at the end</option>
                  </select>
                </div>
              )}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--soft)", marginBottom: 12 }}>
              {pool.length} question{pool.length === 1 ? "" : "s"} match this scope.
              {topicFilter && <span> Finishing a single-topic practice run will offer to log a pass.</span>}
            </div>
            <button onClick={startExam} disabled={!pool.length} className="btn-primary" style={{ opacity: pool.length ? 1 : 0.5 }}>Start Practice</button>
          </div>
        )}
      </div>
    );
  }

  if (phase === "running") {
    const q = exam.questions[exam.current];
    const answered = exam.answers[exam.current] !== null;
    const locked = revealInstant && exam.locked[exam.current];
    const correctIdx = q.options.findIndex((o) => o.correct);
    const isRevealed = exam.revealed[exam.current];
    // Once an answer is picked, a confidence level is required before
    // moving on — this is what actually enforces "don't skip the
    // confidence step", not just the UI ordering.
    const hasConfidence = !!exam.confidences?.[exam.current];
    const blockedOnConfidence = answered && !hasConfidence;
    const displaySec = isExamMode ? Math.max(0, exam.examTotalSec - elapsedSec) : elapsedSec;
    const mm = String(Math.floor(displaySec / 60)).padStart(2, "0");
    const ss = String(displaySec % 60).padStart(2, "0");
    const timeLow = isExamMode && displaySec <= 60;

    return (
      <div style={{ minHeight: "calc(100vh - 60px)", display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 880, margin: "0 auto", width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 15, color: "var(--soft)", fontWeight: 600 }}>Question {exam.current + 1} of {exam.questions.length}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 15, fontWeight: 700, color: timeLow ? "var(--red)" : "var(--amber)" }}><IconClock style={{ width: 17, height: 17 }} /> {mm}:{ss}</div>
            {!isExamMode && (
              <button onClick={togglePause} data-sound="none" title={paused ? "Resume" : "Pause"} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: "50%", border: "1px solid var(--panel-border)", background: "var(--panel-solid)", color: "var(--ink)", cursor: "pointer" }}>
                {paused ? <IconPlay style={{ width: 12, height: 12 }} /> : <IconPause style={{ width: 12, height: 12 }} />}
              </button>
            )}
            <button
              onClick={() => { if (confirm("Abandon this practice run? It'll be logged as abandoned, not completed.")) abandonExam(); }}
              data-sound="none"
              title="Abandon session"
              style={{ fontSize: 11.5, fontWeight: 600, padding: "6px 12px", borderRadius: 100, border: "1px solid var(--panel-border)", background: "var(--panel-solid)", color: "var(--red)", cursor: "pointer" }}
            >
              Abandon
            </button>
          </div>
        </div>
        {paused && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--soft)", fontSize: 14 }}>
            Paused — timer stopped. Hit resume to keep going.
          </div>
        )}
        <div style={{ height: 6, background: "var(--panel)", borderRadius: 100, marginBottom: 26, overflow: "hidden", display: paused ? "none" : "block" }}>
          <div style={{ height: "100%", width: `${(exam.current / exam.questions.length) * 100}%`, background: "var(--grad-primary)" }} />
        </div>

        {isExamMode && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 18 }}>
            {exam.questions.map((_, idx) => {
              const isAnswered = exam.answers[idx] !== null;
              const isCurrent = idx === exam.current;
              return (
                <button
                  key={idx}
                  onClick={() => { setTapAnim(null); setExam((ex) => ({ ...ex, current: idx })); }}
                  data-sound="none"
                  title={`Question ${idx + 1}${isAnswered ? " — answered" : ""}`}
                  style={{
                    width: 34, height: 34, borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                    borderWidth: isCurrent ? 2 : 1.5, borderStyle: "solid",
                    borderColor: (isCurrent || isAnswered) ? "var(--purple)" : "var(--panel-border)",
                    background: isCurrent ? "var(--panel)" : "var(--panel-solid)",
                    color: "var(--ink)",
                  }}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        )}

        {!paused && !isRevealed ? (
          <div className="card" style={{ padding: "48px 54px", minHeight: "44vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
            <QuestionText text={q.question} style={{ fontSize: 22, fontWeight: 700, marginBottom: 18, lineHeight: 1.4 }} />
            <div style={{ fontSize: 13.5, color: "var(--soft)", marginBottom: 26, maxWidth: 420 }}>Try to recall the answer yourself before revealing the choices.</div>
            <button
              onClick={revealChoices}
              data-sound="none"
              style={{ padding: "9px 20px", borderRadius: 100, border: "1px solid var(--panel-border)", background: "var(--panel-solid)", color: "var(--soft)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
            >
              Show answer choices
            </button>
          </div>
        ) : (
        <div className="card" style={{ padding: "48px 54px", minHeight: "44vh", display: paused ? "none" : "block" }}>
          <QuestionText text={q.question} style={{ fontSize: 24, fontWeight: 700, marginBottom: 30, lineHeight: 1.4 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {q.options.map((o, i) => {
              const isSelected = exam.answers[exam.current] === i;
              const showCorrect = locked && i === correctIdx;
              const showWrong = locked && isSelected && i !== correctIdx;
              const animClass = tapAnim && tapAnim.index === i ? (tapAnim.correct ? "opt-correct-pop" : "opt-incorrect-shake") : "";
              return (
                <button
                  key={i}
                  onClick={() => pickOption(i)}
                  disabled={locked}
                  data-sound="none"
                  className={animClass}
                  style={{
                    display: "flex", alignItems: "center", gap: 14, textAlign: "left", padding: "20px 24px", borderRadius: 12,
                    cursor: locked ? "default" : "pointer",
                    border: `1.5px solid ${showCorrect ? "var(--green)" : showWrong ? "var(--red)" : isSelected ? "var(--purple)" : "var(--panel-border)"}`,
                    background: showCorrect ? "color-mix(in srgb, var(--green) 14%, transparent)" : showWrong ? "color-mix(in srgb, var(--red) 14%, transparent)" : isSelected ? "var(--panel)" : "var(--panel-solid)",
                    color: "var(--ink)", fontSize: 17.5,
                  }}
                >
                  <span style={{ fontWeight: 700, opacity: 0.55, fontSize: 15 }}>{LETTERS[i]}</span>
                  <span>{o.text}</span>
                </button>
              );
            })}
          </div>

          {!paused && answered && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 22, paddingTop: 20, borderTop: "1px solid var(--panel-border)", flexWrap: "wrap" }}>
              <span style={{ fontSize: 14.5, fontWeight: 600, color: "var(--soft)" }}>How confident are you?</span>
              <div style={{ display: "flex", gap: 8 }}>
                {CONFIDENCE_LEVELS.map((c) => {
                  const isSel = (exam.confidences?.[exam.current] || null) === c.key;
                  return (
                    <button
                      key={c.key}
                      type="button"
                      data-sound="none"
                      onClick={() => setConfidence(c.key)}
                      style={{
                        fontSize: 14, fontWeight: 700, padding: "8px 18px", borderRadius: 100, cursor: "pointer",
                        border: `1.5px solid ${isSel ? "var(--purple)" : "var(--panel-border)"}`,
                        background: isSel ? "var(--panel)" : "var(--panel-solid)",
                        color: isSel ? "var(--ink)" : "var(--soft)",
                      }}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {locked && (
            <div style={{ marginTop: 18, fontSize: 14.5, padding: "12px 16px", borderRadius: 10, borderLeft: `3px solid ${exam.answers[exam.current] === correctIdx ? "var(--green)" : "var(--red)"}`, background: "var(--panel)" }}>
              <strong style={{ color: exam.answers[exam.current] === correctIdx ? "var(--green)" : "var(--red)" }}>{exam.answers[exam.current] === correctIdx ? "Correct." : "Incorrect."}</strong>
              {q.options[exam.answers[exam.current]]?.explanation && (
                <div style={{ marginTop: 6, fontSize: 13, color: "var(--soft)" }}>{q.options[exam.answers[exam.current]].explanation}</div>
              )}
              {exam.answers[exam.current] !== correctIdx && q.options[correctIdx]?.explanation && (
                <div style={{ marginTop: 8, fontSize: 13, color: "var(--green)" }}>
                  <strong>{q.options[correctIdx].text}:</strong> {q.options[correctIdx].explanation}
                </div>
              )}
              {q.explanation && <div style={{ marginTop: 8, fontSize: 12.5, color: "var(--soft)" }}>{q.explanation}</div>}
              {exam.answers[exam.current] === correctIdx && exam.confidences?.[exam.current] === "low" && (
                <div style={{ marginTop: 8, fontSize: 13, color: "var(--amber)", fontWeight: 600 }}>⚠ Correct, but flagged as low confidence — this will show up under Review Your Weak Points.</div>
              )}
            </div>
          )}
        </div>
        )}
        <div style={{ display: (paused || !isRevealed) ? "none" : "flex", justifyContent: "space-between", alignItems: "center", marginTop: 22 }}>
          {isExamMode ? (
            <>
              <span style={{ fontSize: 14, color: "var(--soft)" }}>{exam.answers.filter((a) => a !== null).length} / {exam.questions.length} answered</span>
              {exam.current === exam.questions.length - 1 ? (
                <button onClick={finishExam} disabled={blockedOnConfidence} className="btn-primary" style={{ fontSize: 15, padding: "12px 26px", opacity: blockedOnConfidence ? 0.5 : 1 }}>Submit exam</button>
              ) : (
                <button
                  onClick={() => { setTapAnim(null); setExam((ex) => ({ ...ex, current: ex.current + 1 })); }}
                  disabled={blockedOnConfidence}
                  className="btn-primary" style={{ fontSize: 15, padding: "12px 26px", opacity: blockedOnConfidence ? 0.5 : 1 }}
                >
                  Next →
                </button>
              )}
            </>
          ) : (
            <>
              <button onClick={goPrev} disabled={exam.current === 0} data-sound="none" style={{ padding: "12px 22px", borderRadius: 100, border: "1px solid var(--panel-border)", background: "var(--panel-solid)", color: "var(--ink)", cursor: exam.current === 0 ? "default" : "pointer", opacity: exam.current === 0 ? 0.5 : 1, fontSize: 15 }}>← Previous</button>
              <span style={{ fontSize: 14, color: "var(--soft)" }}>{exam.answers.filter((a) => a !== null).length} / {exam.questions.length} answered</span>
              <button onClick={goNext} disabled={(revealInstant && !answered) || blockedOnConfidence} className="btn-primary" style={{ opacity: ((revealInstant && !answered) || blockedOnConfidence) ? 0.5 : 1, fontSize: 15, padding: "12px 26px" }}>
                {exam.current === exam.questions.length - 1 ? "Finish →" : "Next →"}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // phase === "result"
  return (
    <div style={{ minHeight: "calc(100vh - 60px)", display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 860, margin: "0 auto", width: "100%" }}>
      <div className="card" style={{ textAlign: "center" }}>
        <div style={{ fontSize: 12, color: "var(--soft)", textTransform: "uppercase", letterSpacing: 1 }}>{exam.scope}</div>
        <div style={{ fontSize: 42, fontWeight: 800, margin: "8px 0" }}>{exam.correct}/{exam.questions.length}</div>
        <div style={{ fontSize: 16, color: "var(--soft)", marginBottom: 6 }}>{exam.pct}% · {exam.minutes} min</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
          <button onClick={() => setReviewOpen((v) => !v)} data-sound="none" style={{ padding: "9px 16px", borderRadius: 100, border: "1px solid var(--panel-border)", background: "var(--panel-solid)", color: "var(--ink)", cursor: "pointer", fontSize: 13 }}>{reviewOpen ? "Hide review" : "Review answers"}</button>
          {exam.singleTopicId && !passLogged && (
            <button onClick={() => setShowPassPopup(true)} className="btn-primary">Log a pass for this topic</button>
          )}
          {exam.singleTopicId && passLogged && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", fontSize: 13, color: "var(--green)", fontWeight: 700 }}>✓ Pass logged</span>
          )}
          {weakUnreviewedAttempts().length > 0 && (
            <button onClick={() => setPhase("reviewWeak")} data-sound="none" style={{ padding: "9px 16px", borderRadius: 100, border: "1px solid var(--panel-border)", background: "var(--panel-solid)", color: "var(--ink)", cursor: "pointer", fontSize: 13 }}>⚠ Review Your Weak Points</button>
          )}
          <button onClick={newExam} data-sound="none" style={{ padding: "9px 16px", borderRadius: 100, border: "1px solid var(--panel-border)", background: "var(--panel-solid)", color: "var(--ink)", cursor: "pointer", fontSize: 13 }}>New practice</button>
        </div>
      </div>

      {isExamMode && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 16, justifyContent: "center" }}>
          {exam.questions.map((q, idx) => {
            const correctIdx = q.options.findIndex((o) => o.correct);
            const wasAnswered = exam.answers[idx] !== null;
            const wasCorrect = exam.answers[idx] === correctIdx;
            return (
              <button
                key={idx}
                onClick={() => setReviewOpen(true)}
                data-sound="none"
                title={`Question ${idx + 1}${wasAnswered ? (wasCorrect ? " — correct" : " — incorrect") : " — unanswered"}`}
                style={{
                  width: 34, height: 34, borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                  border: `1.5px solid ${!wasAnswered ? "var(--panel-border)" : wasCorrect ? "var(--green)" : "var(--red)"}`,
                  background: !wasAnswered ? "var(--panel-solid)" : wasCorrect ? "rgba(34,211,238,.12)" : "rgba(248,113,113,.12)",
                  color: "var(--ink)",
                }}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      )}

      {reviewOpen && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
          {exam.questions.map((q, i) => {
            const correctIdx = q.options.findIndex((o) => o.correct);
            const sel = exam.answers[i];
            return (
              <div key={i} className="card">
                <div style={{ fontSize: 11, color: "var(--soft)", marginBottom: 4 }}>Q{i + 1}</div>
                <QuestionText text={q.question} style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }} />
                {q.options.map((o, j) => (
                  <div key={j} style={{
                    padding: "7px 12px", borderRadius: 7, marginBottom: 5, fontSize: 13,
                    border: `1px solid ${j === correctIdx ? "var(--green)" : j === sel ? "var(--red)" : "var(--panel-border)"}`,
                    background: j === correctIdx ? "color-mix(in srgb, var(--green) 12%, transparent)" : j === sel ? "color-mix(in srgb, var(--red) 12%, transparent)" : "var(--panel-solid)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                      <span style={{ fontWeight: 700, opacity: 0.6, marginRight: 8 }}>{LETTERS[j]}</span>
                      <span style={{ flex: 1 }}>{o.text}</span>
                      {j === correctIdx && <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--green)", flexShrink: 0 }}>✓ Correct</span>}
                      {j === sel && j !== correctIdx && <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--red)", flexShrink: 0 }}>✗ Your answer</span>}
                    </div>
                    {(j === correctIdx || j === sel) && o.explanation && (
                      <div style={{ fontSize: 12, color: "var(--soft)", marginTop: 4, paddingLeft: 20 }}>{o.explanation}</div>
                    )}
                  </div>
                ))}
                {q.explanation && <div style={{ fontSize: 12, color: "var(--soft)", marginTop: 6 }}>{q.explanation}</div>}
              </div>
            );
          })}
        </div>
      )}

      {showPassPopup && (
        <LogPassPopup
          supabase={supabase}
          user={user}
          unitId={exam.singleUnitId}
          topicId={exam.singleTopicId}
          pct={exam.pct}
          minutes={lastMinutes}
          saving={passSaving}
          setSaving={setPassSaving}
          onClose={() => setShowPassPopup(false)}
          onSaved={() => { setShowPassPopup(false); setPassLogged(true); showToast("Pass logged in Study ✓"); onProgressChanged?.(); }}
        />
      )}
    </div>
  );
}

/* ==================== LOG A PASS POPUP ==================== */

function LogPassPopup({ supabase, user, unitId, topicId, pct, minutes, saving, setSaving, onClose, onSaved }) {
  async function save() {
    setSaving(true);
    const { data: current } = await supabase.from("topic_progress").select("*").eq("user_id", user.id).eq("unit_id", unitId).eq("topic_id", topicId).maybeSingle();
    const newPasses = (current?.passes || 0) + 1;
    const entry = {
      date: new Date().toISOString(),
      understanding: current?.understanding ?? null,
      confidence: current?.confidence || 3,
      qcm: pct,
      minutes: minutes || null,
      note: "", types: ["qcm"],
    };
    const newEntries = [...(current?.entries || []), entry];
    const newHistory = [
      { date: entry.date, action: "practice quiz", value: pct },
      // "study session" is the action Study Time Trends actually reads —
      // without this entry, minutes spent in QBank never showed up there.
      ...(minutes ? [{ date: entry.date, action: "study session", value: minutes }] : []),
      { date: entry.date, action: "pass", value: newPasses },
      ...(current?.history || []),
    ].slice(0, 500);
    const payload = { user_id: user.id, unit_id: unitId, topic_id: topicId, qcm: pct, passes: newPasses, entries: newEntries, history: newHistory };
    // Same rule as the Study tab's manual entry: a comfortably good score
    // clears any lingering "needs review" flag from a past miscalibration.
    const prospectiveMastery = calcMastery({ understanding: current?.understanding ?? null, qcm: pct, calibration_adj: current?.calibration_adj || 0 });
    if (prospectiveMastery != null && prospectiveMastery >= 70) payload.review_flag = false;
    const { error } = await supabase.from("topic_progress").upsert(payload, { onConflict: "user_id,unit_id,topic_id" });
    setSaving(false);
    if (!error) onSaved();
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(5,6,12,.7)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 200 }}>
      <div onClick={(e) => e.stopPropagation()} className="card modal-box" style={{ maxWidth: 380, width: "100%" }}>
        <h2 style={{ marginTop: 0, fontSize: 17 }}>Log this as a pass?</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "var(--panel)", borderRadius: 7 }}>
            <span style={{ color: "var(--soft)" }}>Type</span><span style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}><IconCheck style={{ width: 13, height: 13, color: "var(--green)" }} /> MCQs</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "var(--panel)", borderRadius: 7 }}>
            <span style={{ color: "var(--soft)" }}>Passes</span><span style={{ fontWeight: 700 }}>+1</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "var(--panel)", borderRadius: 7 }}>
            <span style={{ color: "var(--soft)" }}>QCM score</span><span style={{ fontWeight: 700 }}>{pct}%</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "var(--panel)", borderRadius: 7 }}>
            <span style={{ color: "var(--soft)" }}>Minutes studied</span><span style={{ fontWeight: 700 }}>{minutes} min</span>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <button onClick={onClose} data-sound="none" style={{ padding: "9px 16px", borderRadius: 100, border: "1px solid var(--panel-border)", background: "var(--panel-solid)", color: "var(--ink)", cursor: "pointer" }}>Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save pass"}</button>
        </div>
      </div>
    </div>
  );
}


export default PracticeTab;
