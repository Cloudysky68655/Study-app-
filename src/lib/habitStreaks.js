// Pure habit scheduling/streak helpers, shared between the Habits page and
// the Today hub's summary card so the two numbers never drift out of sync.
// Ported verbatim from src/app/habits/page.js.

export function dayStr(d) { const dt = d || new Date(); return dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0"); }

export function isScheduled(habit, dateObj) {
  const created = new Date(habit.created_at); created.setHours(0, 0, 0, 0);
  const cmp = new Date(dateObj); cmp.setHours(0, 0, 0, 0);
  if (created > cmp) return false;
  const f = habit.frequency || { type: "daily" };
  if (f.type === "weekdays") return (f.days || []).includes(dateObj.getDay());
  return true; // daily and xperweek are eligible every day
}

export function isDone(log, ds, habitId) { const e = log[ds] && log[ds][habitId]; return !!(e && e.done); }

export function activeHabitsOn(habits, log, dateObj) { return habits.filter((h) => !h.archived && isScheduled(h, dateObj)); }

export function overallCurrentStreak(habits, log) {
  const active = habits.filter((h) => !h.archived);
  if (!active.length) return 0;
  let streak = 0, d = new Date(), guard = 0;
  while (guard++ < 3650) {
    const ds = dayStr(d);
    const day = activeHabitsOn(habits, log, d);
    if (!day.length) { d.setDate(d.getDate() - 1); continue; }
    if (day.every((h) => isDone(log, ds, h.id))) { streak++; d.setDate(d.getDate() - 1); }
    else { if (ds === dayStr()) { d.setDate(d.getDate() - 1); continue; } break; }
  }
  return streak;
}

export function overallBestStreak(habits, log) {
  const active = habits.filter((h) => !h.archived);
  if (!active.length) return 0;
  const earliest = habits.reduce((min, h) => new Date(h.created_at) < min ? new Date(h.created_at) : min, new Date());
  let best = 0, cur = 0, d = new Date(earliest), end = new Date();
  while (d <= end) {
    const ds = dayStr(d);
    const day = activeHabitsOn(habits, log, d);
    if (day.length > 0 && day.every((h) => isDone(log, ds, h.id))) { cur++; best = Math.max(best, cur); } else { cur = 0; }
    d.setDate(d.getDate() + 1);
  }
  return best;
}
