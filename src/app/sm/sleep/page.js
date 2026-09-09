"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { dayStr, isHabitScheduled, isHabitDone, computeHabitStreak } from "@/lib/smHabits";
import TabBar from "@/components/sm/TabBar";
import { IconMoon, IconCheck } from "@/components/sm/Icons";

const HABIT_TILE_IMAGES = [
  "/sm/illustrations/tile-night-island.png",
  "/sm/illustrations/tile-sweet-sleep.png",
  "/sm/illustrations/tile-good-night.png",
  "/sm/illustrations/tile-moon-clouds.png",
];

const CHIPS = [
  { key: "all", label: "All", icon: IconMoon },
  { key: "remaining", label: "Remaining", icon: IconMoon },
  { key: "done", label: "Done", icon: IconCheck },
];

export default function SleepPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [habits, setHabits] = useState([]);
  const [log, setLog] = useState({});
  const [chip, setChip] = useState("all");

  const load = useCallback(async (uid) => {
    const [{ data: hb }, { data: hl }] = await Promise.all([
      supabase.from("habits").select("*").eq("user_id", uid).eq("archived", false).order("sort_order", { ascending: true }),
      supabase.from("habit_log").select("*").eq("user_id", uid),
    ]);
    setHabits(hb || []);
    const logObj = {};
    (hl || []).forEach((r) => { (logObj[r.day] = logObj[r.day] || {})[r.habit_id] = r; });
    setLog(logObj);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace("/sm/login"); return; }
      setUser(session.user);
      load(session.user.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Same optimistic-update + Supabase read/write pattern as the original
  // Today/Habits pages' toggleHabitToday.
  async function toggleHabit(habitId) {
    const ds = dayStr();
    const turningOn = !isHabitDone(log, ds, habitId);
    setLog((prev) => {
      const next = { ...prev, [ds]: { ...(prev[ds] || {}) } };
      if (turningOn) next[ds][habitId] = { ...(next[ds][habitId] || {}), done: true };
      else { delete next[ds][habitId]; if (!Object.keys(next[ds]).length) delete next[ds]; }
      return next;
    });
    if (turningOn) {
      await supabase.from("habit_log").upsert({ user_id: user.id, habit_id: habitId, day: ds, done: true, updated_at: new Date().toISOString() }, { onConflict: "user_id,habit_id,day" });
    } else {
      await supabase.from("habit_log").delete().eq("user_id", user.id).eq("habit_id", habitId).eq("day", ds);
    }
  }

  if (loading || !user) {
    return <div className="sm-screen sm-theme-dark"><div className="sm-tab-hero"><p>Loading…</p></div></div>;
  }

  const today = new Date();
  const ds = dayStr(today);
  const habitsToday = habits.filter((h) => isHabitScheduled(h, today));
  const habitsDoneToday = habitsToday.filter((h) => isHabitDone(log, ds, h.id));
  const bestStreak = habits.reduce((m, h) => Math.max(m, computeHabitStreak(h, log)), 0);

  const visible =
    chip === "remaining" ? habitsToday.filter((h) => !isHabitDone(log, ds, h.id)) :
    chip === "done" ? habitsToday.filter((h) => isHabitDone(log, ds, h.id)) :
    habitsToday;

  return (
    <div className="sm-screen sm-theme-dark">
      <div className="sm-tab-hero">
        <IconMoon className="sm-tab-hero-icon" width={34} height={34} />
        <h1>Habits</h1>
        <p>{habitsDoneToday.length}/{habitsToday.length} done today · best streak {bestStreak} day{bestStreak === 1 ? "" : "s"}</p>
      </div>

      <div className="sm-chip-row">
        {CHIPS.map((c) => {
          const Icon = c.icon;
          return (
            <button key={c.key} type="button" className={`sm-chip${chip === c.key ? " active" : ""}`} onClick={() => setChip(c.key)}>
              <span className="sm-chip-circle"><Icon /></span>
              <span>{c.label}</span>
            </button>
          );
        })}
      </div>

      {habits.length === 0 ? (
        <p style={{ padding: "0 24px", color: "#9490c2", fontSize: 14 }}>No habits yet — add one from the original Habits page to see it here.</p>
      ) : visible.length === 0 ? (
        <p style={{ padding: "0 24px", color: "#9490c2", fontSize: 14 }}>Nothing here right now.</p>
      ) : (
        <div className="sm-tile-grid">
          {visible.map((h, i) => {
            const done = isHabitDone(log, ds, h.id);
            return (
              <button key={h.id} type="button" className="sm-tile" onClick={() => toggleHabit(h.id)} style={{ position: "relative" }}>
                <div style={{ position: "relative" }}>
                  <img src={HABIT_TILE_IMAGES[i % HABIT_TILE_IMAGES.length]} alt={h.name} style={{ opacity: done ? 0.55 : 1 }} />
                  {done && (
                    <span style={{ position: "absolute", top: 10, right: 10, width: 28, height: 28, borderRadius: "50%", background: "var(--sm-purple)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                      <IconCheck stroke="#fff" />
                    </span>
                  )}
                </div>
                <div className="sm-tile-title">{h.icon ? `${h.icon} ` : ""}{h.name}</div>
                <div className="sm-tile-sub">{h.category || "Habit"}{done ? " · Done" : ""}</div>
              </button>
            );
          })}
        </div>
      )}

      <TabBar active="sleep" dark />
    </div>
  );
}
