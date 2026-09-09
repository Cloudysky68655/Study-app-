"use client";
import { useEffect, useState } from "react";
import { dayKey } from "@/lib/topicData";
import { activeHabitsOn, isDone, overallCurrentStreak } from "@/lib/habitStreaks";

/**
 * Lean, purpose-built data load for the Today hub's three summary cards.
 * Deliberately separate from each area's own (much heavier) page-level
 * data load — this only fetches what a compact card needs.
 *
 * Study's streak here is intentionally global across every unit (unlike
 * the Study page's own streak, which is scoped to the active unit only —
 * see plan notes) since the Today hub is a whole-life overview.
 */
export function useTodaySummary(supabase, userId) {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    if (!supabase || !userId) return;
    let active = true;

    (async () => {
      const [{ data: progressRows }, { data: habits }, { data: logRows }, { data: tasks }] = await Promise.all([
        supabase.from("topic_progress").select("history").eq("user_id", userId),
        supabase.from("habits").select("*").eq("user_id", userId),
        supabase.from("habit_log").select("*").eq("user_id", userId),
        supabase.from("habit_tasks").select("*").eq("user_id", userId).order("sort_order", { ascending: true }),
      ]);
      if (!active) return;

      // ---- Study: sessions logged today + a streak across all units ----
      const historyEntries = [];
      (progressRows || []).forEach((row) => (row.history || []).forEach((h) => historyEntries.push(h)));
      const todayKey = dayKey(new Date());
      const sessionsToday = historyEntries.filter((h) => h.action === "study session" && dayKey(new Date(h.date)) === todayKey).length;

      const activeDays = new Set(historyEntries.map((h) => dayKey(new Date(h.date))));
      const yestKey = dayKey(new Date(Date.now() - 86400000));
      let studyStreak = 0;
      if (activeDays.has(todayKey) || activeDays.has(yestKey)) {
        let cursor = activeDays.has(todayKey) ? new Date() : new Date(Date.now() - 86400000);
        while (activeDays.has(dayKey(cursor))) { studyStreak++; cursor = new Date(cursor.getTime() - 86400000); }
      }

      // ---- Habits: today's completion + overall streak ----
      const logObj = {};
      (logRows || []).forEach((row) => {
        if (!logObj[row.day]) logObj[row.day] = {};
        logObj[row.day][row.habit_id] = { done: row.done, qty: row.qty, note: row.note };
      });
      const habitList = habits || [];
      const todaysDue = activeHabitsOn(habitList, logObj, new Date());
      const habitDs = new Date().getFullYear() + "-" + String(new Date().getMonth() + 1).padStart(2, "0") + "-" + String(new Date().getDate()).padStart(2, "0");
      const doneToday = todaysDue.filter((h) => isDone(logObj, habitDs, h.id)).length;

      // ---- Tasks: pending count + a short upcoming preview ----
      const taskList = tasks || [];
      const pendingTasks = taskList.filter((t) => !t.done);

      setSummary({
        study: { sessionsToday, streak: studyStreak },
        habits: { doneToday, totalToday: todaysDue.length, streak: overallCurrentStreak(habitList, logObj) },
        tasks: { pending: pendingTasks.length, upcoming: pendingTasks.slice(0, 3).map((t) => ({ id: t.id, name: t.name })) },
      });
    })();

    return () => { active = false; };
  }, [supabase, userId]);

  return summary;
}
