"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { dayStr, isHabitDone, computeHabitStreak } from "@/lib/smHabits";
import TopBar from "@/components/sm/TopBar";
import { IconCheck } from "@/components/sm/Icons";

const HABIT_TILE_IMAGES = [
  "/sm/illustrations/tile-night-island.png",
  "/sm/illustrations/tile-sweet-sleep.png",
  "/sm/illustrations/tile-good-night.png",
  "/sm/illustrations/tile-moon-clouds.png",
];

// "Sleep Music" repurposed as the full habit list (including habits not
// scheduled for today), so every habit the person has is reachable from
// this UI even though the Sleep tab itself only shows today's.
export default function AllHabitsPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [habits, setHabits] = useState([]);
  const [log, setLog] = useState({});

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

  if (loading || !user) {
    return <div className="sm-screen sm-no-nav sm-theme-dark"><TopBar title="All Habits" dark /></div>;
  }

  const ds = dayStr();

  return (
    <div className="sm-screen sm-no-nav sm-theme-dark">
      <TopBar title="All Habits" dark />
      {habits.length === 0 ? (
        <p style={{ padding: "0 24px", color: "#9490c2", fontSize: 14 }}>No habits yet.</p>
      ) : (
        <div className="sm-tile-grid" style={{ paddingTop: 18 }}>
          {habits.map((h, i) => {
            const done = isHabitDone(log, ds, h.id);
            const streak = computeHabitStreak(h, log);
            return (
              <div key={h.id} className="sm-tile">
                <div style={{ position: "relative" }}>
                  <img src={HABIT_TILE_IMAGES[i % HABIT_TILE_IMAGES.length]} alt={h.name} style={{ opacity: done ? 0.55 : 1 }} />
                  {done && (
                    <span style={{ position: "absolute", top: 10, right: 10, width: 28, height: 28, borderRadius: "50%", background: "var(--sm-purple)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                      <IconCheck stroke="#fff" />
                    </span>
                  )}
                </div>
                <div className="sm-tile-title">{h.icon ? `${h.icon} ` : ""}{h.name}</div>
                <div className="sm-tile-sub">{streak} day streak</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
