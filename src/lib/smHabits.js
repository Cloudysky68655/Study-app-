// Habit day-scheduling helpers — copied verbatim from the original
// Today/Habits pages so Phase 2's new-UI screens use the exact same
// business logic (which days a habit is scheduled, whether it's done,
// streak calculation) rather than a re-implementation.

export function dayStr(d) {
  const dt = d || new Date();
  return dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0");
}

export function isHabitScheduled(habit, dateObj) {
  const created = new Date(habit.created_at); created.setHours(0, 0, 0, 0);
  const cmp = new Date(dateObj); cmp.setHours(0, 0, 0, 0);
  if (created > cmp) return false;
  const f = habit.frequency || { type: "daily" };
  if (f.type === "weekdays") return (f.days || []).includes(dateObj.getDay());
  return true;
}

export function isHabitDone(log, ds, habitId) {
  const e = log[ds] && log[ds][habitId];
  return !!(e && e.done);
}

export function computeHabitStreak(habit, log) {
  let streak = 0, d = new Date(), guard = 0;
  while (guard++ < 3650) {
    const ds = dayStr(d);
    if (new Date(habit.created_at) > d) break;
    if (!isHabitScheduled(habit, d)) { d.setDate(d.getDate() - 1); continue; }
    if (isHabitDone(log, ds, habit.id)) { streak++; d.setDate(d.getDate() - 1); }
    else { if (ds === dayStr()) { d.setDate(d.getDate() - 1); continue; } break; }
  }
  return streak;
}
