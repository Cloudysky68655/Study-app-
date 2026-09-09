// Your fixed subject/course list, ported exactly from the original file.
export const DATA = [
  { key: "anatomy", name: "Anatomy", col: 0,
    courses: [
      "Thoracic wall", "Mediastinum", "External and internal heart configuration",
      "Structure of the heart and pericardium", "Heart vascularization and innervation",
      "Aorta", "Cave and azygos system", "Larynx", "Trachea and bronchi",
      "Lungs and pleura", "Pulmonary pedicles and thoracic lymphatic drainage", "Diaphragm"
    ]
  },
  { key: "histology", name: "Histology", col: 0,
    courses: [
      "Cardio-vascular system", "Respiratory system",
      { name: "Hematopoietic organs", subs: ["Thymus", "Spleen"] }
    ]
  },
  { key: "biophysics", name: "Biophysics", col: 1,
    courses: ["Hemodynamics", "Vascular biophysics", "Cardiac biophysics"]
  },
  { key: "physiology", name: "Physiology", col: 1,
    courses: [
      "Cardio-vascular electrophysiology", "Cardiac cycle", "Cardiac output",
      "Arterial pressure regulation", "Low-pressure system", "Coronary circulation",
      "Blood physiology", "Introduction to respiratory physiology + ventilatory mechanics",
      "Pulmonary and systemic gas exchanges", "Blood gas transport", "Respiration regulation",
      "ECG (Electrocardiogram)", "Spirometry"
    ]
  }
];

function rowsFor(course) {
  if (typeof course === "string") return [{ name: course, sub: false }];
  return [{ name: course.name, sub: false }, ...course.subs.map((x) => ({ name: x, sub: true }))];
}

export function makeId(subjectKey, courseIdx, rowIdx) {
  return `${subjectKey}-${courseIdx}-${rowIdx}`;
}

// Flat list of every topic row, each tagged with its generated id and subject.
export function allTopics() {
  const out = [];
  DATA.forEach((s) =>
    s.courses.forEach((c, ci) =>
      rowsFor(c).forEach((r, ri) =>
        out.push({ ...r, id: makeId(s.key, ci, ri), subject: s.name, subjectKey: s.key })
      )
    )
  );
  return out;
}

export function calcMastery(t) {
  const vals = [];
  // understanding is now rated 1-10 by the person; scale to a 0-100
  // percentage so it's directly comparable with the QCM score (0-100).
  if (t?.understanding != null) vals.push(t.understanding * 10);
  if (t?.qcm != null) vals.push(t.qcm);
  if (!vals.length) return null;
  const base = vals.reduce((a, b) => a + b, 0) / vals.length;
  // calibration_adj is a running, clamped nudge built from QBank's
  // per-question High/Normal/Low confidence tags vs actual correctness
  // — see calibrationDelta() below. Only applied once there's already a
  // base score to adjust, so it never invents mastery out of thin air.
  const adj = t?.calibration_adj || 0;
  return Math.round(Math.max(0, Math.min(100, base + adj)));
}

export const CALIBRATION_MIN = -20;
export const CALIBRATION_MAX = 20;

// Per-question calibration effect: compares the confidence level the
// person tagged an answer with (High/Normal/Low bias) against whether
// they actually got it right.
//   - High confidence + correct  -> well-calibrated, small mastery boost.
//   - High confidence + wrong, or Low confidence + correct -> miscalibrated
//     (overconfident on a wrong answer, or a right answer that wasn't
//     really "known"), small mastery penalty + a "needs review" flag.
//   - Everything else (Normal confidence, or Low + wrong) is left neutral
//     — not enough signal to be worth scoring.
export function calibrationDelta(confidence, isCorrect) {
  if (confidence === "high" && isCorrect) return { delta: 2, flagged: false };
  if (confidence === "high" && !isCorrect) return { delta: -3, flagged: true };
  if (confidence === "low" && isCorrect) return { delta: -3, flagged: true };
  return { delta: 0, flagged: false };
}

export function clampCalibration(v) {
  return Math.max(CALIBRATION_MIN, Math.min(CALIBRATION_MAX, v));
}

export function masteryColor(v) {
  if (v == null) return "var(--soft)";
  if (v >= 80) return "var(--green)";
  if (v >= 60) return "var(--yellow)";
  return "var(--red)";
}

export function dayKey(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

export function daysSinceLast(row) {
  const h = row?.history || [];
  if (!h.length) return 999;
  return Math.floor((Date.now() - new Date(h[0].date)) / 86400000);
}

// A topic's "due date" grows with each pass, the same escalating spacing
// used by the schedule builder (each pass roughly 1.6x further out than
// the last) — this is what "overdue" is actually based on now, instead of
// a flat 7-day cutoff. A topic with no passes yet has no due date (it's
// "untouched", a separate status).
export function spacingIntervalDays(passes) {
  if (!passes || passes < 1) return null;
  let gap = 1;
  for (let p = 2; p <= passes; p++) gap *= 1.6;
  return Math.max(1, Math.round(gap));
}

export function isTopicOverdue(row) {
  const passes = row?.passes || 0;
  if (passes < 1) return false;
  const interval = spacingIntervalDays(passes);
  return daysSinceLast(row) > interval;
}

// ---------- Weekly smart schedule ----------
// Plans one week at a time (Mon–Sun starting from `weekStart`), recomputed
// fresh against live progress every time it's viewed — no fixed end date,
// no persisted multi-week plan. A topic's status decides how it's queued:
//   - overdue / flagged "needs review"  -> backlog, placed ASAP (earliest
//     open review slot), ahead of everything else.
//   - already has passes, not yet due   -> its real projected due date is
//     computed from its last-studied date; if that date falls inside this
//     week, it's queued as a review for that day.
//   - never touched                     -> queued as new material.
// Crucially, placing a NEW lesson (or any review) also projects that
// topic's *next* review inside the same week (chainNext) — otherwise a
// freshly-generated plan would only ever contain new lessons, since
// nothing would be real-overdue yet on the day the plan is built.
//
// subjectsConfig: { [subjectKey]: { newPerDay, reviewsPerDay } } — only
// subjects present here are scheduled at all.
// todayIdx: today's day-in-week index (0=weekStart..6) — nothing is ever
// backfilled onto days before this, since those days had no plan on them
// yet; without this, generating a plan on any day other than Monday would
// immediately paint the earlier days of the week as "overdue".
export function buildWeekPlan(weekStart, subjectsConfig, dayPriority, topics, progressByTopicId, targetPasses, todayIdx = 0) {
  const schedule = {};
  const dayPri = dayPriority || DEFAULT_DAY_PRIORITY;
  const activeSubjectKeys = Object.keys(subjectsConfig || {}).filter((k) => subjectsConfig[k]);
  const startDay = Math.max(0, Math.min(6, todayIdx)); // never backfill days that have already passed this week
  const pushItem = (d, t, passNum, kind) => {
    if (!schedule[d]) schedule[d] = [];
    schedule[d].push({ id: t.id, name: t.name, subject: t.subject, sub: t.sub, pass: passNum, total: targetPasses, day: d, kind });
  };

  activeSubjectKeys.forEach((subjectKey) => {
    const cfg = subjectsConfig[subjectKey] || {};
    const subjectTopics = topics.filter((t) => t.subjectKey === subjectKey);

    const backlog = [];     // overdue or flagged — always due ASAP
    const dueQueue = [];    // { t, passNum, dueDay } — already has a real due date inside this week
    const freshQueue = [];  // never touched at all

    subjectTopics.forEach((t) => {
      const row = progressByTopicId[t.id];
      const passes = row?.passes || 0;
      if (targetPasses && passes >= targetPasses) return; // already mastered — nothing to schedule
      if (passes === 0) { freshQueue.push(t); return; }
      if (row?.review_flag || isTopicOverdue(row)) { backlog.push(t); return; }
      const lastDate = row?.history?.[0]?.date ? new Date(row.history[0].date) : null;
      if (!lastDate) return;
      const due = new Date(lastDate); due.setHours(0, 0, 0, 0);
      due.setDate(due.getDate() + spacingIntervalDays(passes));
      const dueDay = Math.floor((due - weekStart) / 86400000);
      if (dueDay >= 0 && dueDay <= 6) dueQueue.push({ t, passNum: passes + 1, dueDay });
      // due beyond this week (or, if somehow negative, isTopicOverdue would
      // already have caught it above) — nothing to schedule this week.
    });
    dueQueue.sort((a, b) => a.dueDay - b.dueDay);

    // Dynamically generated as sessions get placed this week — a lesson
    // studied Monday can chain straight into a Tuesday/Wednesday review
    // without waiting for a future week's plan to notice it's overdue.
    const chained = [];
    function chainNext(t, passNum, placedDay) {
      if (passNum >= targetPasses) return;
      const nextDay = placedDay + spacingIntervalDays(passNum);
      if (nextDay <= 6) chained.push({ t, passNum: passNum + 1, dueDay: nextDay });
    }

    let backlogIdx = 0, dueIdx = 0, freshIdx = 0;
    for (let d = startDay; d < 7; d++) {
      const date = new Date(weekStart); date.setDate(date.getDate() + d);
      const level = dayPri[date.getDay()] ?? 1;
      if (level === 0) continue; // day off
      const factor = level === 2 ? 1.75 : 1;
      const reviewCap = Math.max(0, Math.round((Number(cfg.reviewsPerDay) || 0) * factor));
      const newCap = Math.max(0, Math.round((Number(cfg.newPerDay) || 0) * factor));

      let placedReview = 0;
      // 1) real backlog first — ASAP, ahead of everything else. Tagged
      // "overdue" specifically (not "review") so it displays as genuinely
      // overdue regardless of which day it lands on — since it can never
      // land before today anymore, the day-position-based "isPast" check
      // alone would otherwise never flag it as overdue at all.
      while (placedReview < reviewCap && backlogIdx < backlog.length) {
        const t = backlog[backlogIdx++];
        const row = progressByTopicId[t.id];
        const passNum = (row?.passes || 0) + 1;
        pushItem(d, t, passNum, "overdue");
        chainNext(t, passNum, d);
        placedReview++;
      }
      // 2) anything due today or earlier — pre-existing due-this-week
      // topics plus this week's own chained reviews.
      const dueTodayAll = [];
      while (dueIdx < dueQueue.length && dueQueue[dueIdx].dueDay <= d) dueTodayAll.push(dueQueue[dueIdx++]);
      for (let i = chained.length - 1; i >= 0; i--) {
        if (chained[i].dueDay <= d) { dueTodayAll.push(chained[i]); chained.splice(i, 1); }
      }
      dueTodayAll.sort((a, b) => a.dueDay - b.dueDay);
      for (const item of dueTodayAll) {
        if (placedReview >= reviewCap) continue; // no room today — it'll surface as overdue once its real due date passes
        pushItem(d, item.t, item.passNum, "review");
        chainNext(item.t, item.passNum, d);
        placedReview++;
      }

      let placedNew = 0;
      while (placedNew < newCap && freshIdx < freshQueue.length) {
        const t = freshQueue[freshIdx++];
        pushItem(d, t, 1, "new");
        chainNext(t, 1, d);
        placedNew++;
      }
    }
  });

  return { schedule, weekStart };
}

export function startOfWeek(d) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  date.setDate(date.getDate() + diff);
  return date;
}

// The smart schedule's "week" is anchored to the unit's own start date
// (not the calendar's Mon–Sun), so "week 1" begins exactly on the day the
// person said they're starting — not whatever the nearest Monday happens
// to be. Each later week is just another 7-day block from that anchor.
// Falls back to a calendar week if no start date has been set yet.
export function smartWeekStart(startDateStr) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (startDateStr) {
    const anchor = new Date(startDateStr + "T00:00:00");
    anchor.setHours(0, 0, 0, 0);
    if (today <= anchor) return anchor; // hasn't started yet — show week 1 from the anchor itself
    const diffDays = Math.floor((today - anchor) / 86400000);
    const weekIndex = Math.floor(diffDays / 7);
    const ws = new Date(anchor);
    ws.setDate(ws.getDate() + weekIndex * 7);
    return ws;
  }
  return startOfWeek(today);
}

// ---------- Spaced-repetition schedule builder, ported exactly from the original file ----------
export const DAY_PRIORITY_LABELS = { 0: "Off", 1: "Normal", 2: "Intense" };
export const DAY_PRIORITY_FACTORS = { 0: 0, 1: 1, 2: 1.75 };
export const DEFAULT_DAY_PRIORITY = { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 };
export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function estimateSessionMinutes(items, newMin, reviewMin) {
  newMin = Number(newMin) || 20; reviewMin = Number(reviewMin) || 10;
  return items.reduce((sum, it) => sum + (it.pass === 1 ? newMin : reviewMin), 0);
}

export function buildSchedule(start, durationDays, targetPasses, maxModulesPerDay, maxNewPerModulePerDay, maxReviewPerModulePerDay, dayPriority, topics, subjectsData) {
  if (!start || !durationDays) return null;
  const allT = topics || allTopics();
  const subjData = subjectsData || DATA;
  if (!allT.length) return null;
  maxModulesPerDay = Math.max(1, Math.min(subjData.length, Math.round(maxModulesPerDay || 2)));
  maxNewPerModulePerDay = Math.max(1, Math.round(maxNewPerModulePerDay || 2));
  maxReviewPerModulePerDay = Math.max(1, Math.round(maxReviewPerModulePerDay || 3));
  dayPriority = dayPriority || DEFAULT_DAY_PRIORITY;
  const startWeekday = start.getDay();
  function weekdayForOffset(d) { return (startWeekday + d) % 7; }
  function priorityFactor(d) {
    const lv = dayPriority[weekdayForOffset(d)];
    return DAY_PRIORITY_FACTORS[lv === undefined ? 1 : lv];
  }
  const activeDayCache = [];
  let scanPtr = 0, allOff = false;
  function activeDayAt(idx) {
    if (allOff) return null;
    while (activeDayCache.length <= idx) {
      let guard = 0;
      while (priorityFactor(scanPtr) === 0) { scanPtr++; guard++; if (guard > 20000) { allOff = true; return null; } }
      activeDayCache.push(scanPtr);
      scanPtr++;
    }
    return activeDayCache[idx];
  }
  if (Object.keys(dayPriority).length && Object.values(dayPriority).every((v) => DAY_PRIORITY_FACTORS[v] === 0)) return null;

  const groups = [];
  for (let i = 0; i < subjData.length; i += maxModulesPerDay) groups.push(subjData.slice(i, i + maxModulesPerDay).map((s) => s.key));
  const groupsLen = groups.length;
  const groupOffsetForKey = {};
  groups.forEach((g, gi) => g.forEach((k) => (groupOffsetForKey[k] = gi)));
  const schedule = {};
  let maxDayUsed = 0;
  subjData.forEach((s) => {
    const groupOffset = groupOffsetForKey[s.key];
    const moduleTopics = allT.filter((t) => t.subjectKey === s.key);
    if (!moduleTopics.length) return;
    const dayForPos = (pos) => activeDayAt(groupOffset + pos * groupsLen);
    const capNewAt = (pos) => { const d = dayForPos(pos); return d == null ? maxNewPerModulePerDay : Math.max(1, Math.round(maxNewPerModulePerDay * priorityFactor(d))); };
    const capRevAt = (pos) => { const d = dayForPos(pos); return d == null ? maxReviewPerModulePerDay : Math.max(1, Math.round(maxReviewPerModulePerDay * priorityFactor(d))); };
    const newSessions = [], reviewSessions = [];
    let pos = 0, filledInPos = 0, guardPos = 0;
    moduleTopics.forEach((t) => {
      while (filledInPos >= capNewAt(pos) && guardPos < 20000) { pos++; filledInPos = 0; guardPos++; }
      const occIdx = pos;
      filledInPos++;
      newSessions.push({ id: t.id, name: t.name, subject: t.subject, sub: t.sub, pass: 1, total: targetPasses, pos: occIdx });
      const passPositions = [occIdx];
      if (targetPasses > 1) {
        let gap = 1;
        for (let p = 1; p < targetPasses; p++) {
          const nextPos = passPositions[passPositions.length - 1] + Math.max(1, Math.round(gap));
          passPositions.push(nextPos);
          gap *= 1.6;
        }
        for (let p = 1; p < passPositions.length; p++) {
          reviewSessions.push({ id: t.id, name: t.name, subject: t.subject, sub: t.sub, pass: p + 1, total: targetPasses, idealPos: passPositions[p] });
        }
      }
    });
    newSessions.forEach((ns) => {
      const day = dayForPos(ns.pos);
      if (day == null) return;
      if (!schedule[day]) schedule[day] = [];
      schedule[day].push({ ...ns, day });
      if (day > maxDayUsed) maxDayUsed = day;
    });
    const reviewCounts = {}, topicLastPos = {};
    newSessions.forEach((ns) => { topicLastPos[ns.id] = ns.pos; });
    reviewSessions.sort((a, b) => a.idealPos - b.idealPos);
    reviewSessions.forEach((rs) => {
      const minPos = topicLastPos[rs.id] !== undefined ? topicLastPos[rs.id] + 1 : rs.idealPos;
      let posFound = null, offset = 0, guard = 0;
      while (posFound === null && guard < 4000) {
        const f = rs.idealPos + offset, b = rs.idealPos - offset;
        if (f >= minPos && (reviewCounts[f] || 0) < capRevAt(f)) { posFound = f; break; }
        if (offset > 0 && b >= minPos && (reviewCounts[b] || 0) < capRevAt(b)) { posFound = b; break; }
        offset++; guard++;
      }
      if (posFound === null) posFound = Math.max(rs.idealPos, minPos);
      reviewCounts[posFound] = (reviewCounts[posFound] || 0) + 1;
      topicLastPos[rs.id] = posFound;
      const day = dayForPos(posFound);
      if (day == null) return;
      if (!schedule[day]) schedule[day] = [];
      schedule[day].push({ id: rs.id, name: rs.name, subject: rs.subject, sub: rs.sub, pass: rs.pass, total: rs.total, day });
      if (day > maxDayUsed) maxDayUsed = day;
    });
  });
  return { schedule, days: maxDayUsed + 1, start, requestedDays: durationDays, dayPriority };
}
