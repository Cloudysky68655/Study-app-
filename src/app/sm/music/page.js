"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { dayStr } from "@/lib/smHabits";
import TabBar from "@/components/sm/TabBar";
import { IconCheck, IconPlay } from "@/components/sm/Icons";

// The Figma export has no "Music" tab screen of its own — only the two
// player screens (reused at /sm/player). Rather than invent unrelated
// visuals, this reuses the same "lesson list" component from the Course
// Details screen (.sm-track-row), which is exactly a checklist pattern —
// the closest existing component to a to-do list.
export default function TasksPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);

  const load = useCallback(async (uid) => {
    const { data } = await supabase.from("habit_tasks").select("*").eq("user_id", uid).order("sort_order", { ascending: true });
    setTasks((data || []).filter((t) => !t.done));
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

  // Same read/write pattern as the original Tasks/Today pages.
  async function completeTask(taskId) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    await supabase.from("habit_tasks").update({ done: true }).eq("id", taskId).eq("user_id", user.id);
    await supabase.from("habit_tasks").delete().eq("id", taskId).eq("user_id", user.id);
  }

  async function toggleSubtask(taskId, subtaskId) {
    const t = tasks.find((x) => x.id === taskId);
    if (!t) return;
    const updatedSubtasks = (t.subtasks || []).map((s) => (s.id === subtaskId ? { ...s, done: !s.done } : s));
    const allDone = updatedSubtasks.length > 0 && updatedSubtasks.every((s) => s.done);
    if (allDone) {
      setTasks((prev) => prev.filter((x) => x.id !== taskId));
      await supabase.from("habit_tasks").update({ subtasks: updatedSubtasks, done: true }).eq("id", taskId).eq("user_id", user.id);
      await supabase.from("habit_tasks").delete().eq("id", taskId).eq("user_id", user.id);
    } else {
      setTasks((prev) => prev.map((x) => (x.id === taskId ? { ...x, subtasks: updatedSubtasks } : x)));
      await supabase.from("habit_tasks").update({ subtasks: updatedSubtasks }).eq("id", taskId).eq("user_id", user.id);
    }
  }

  if (loading || !user) {
    return <div className="sm-screen"><div className="sm-page" style={{ paddingTop: 34 }}><p>Loading…</p></div></div>;
  }

  const today = dayStr();
  const dueToday = tasks.filter((t) => t.due_date === today);
  const upcoming = tasks.filter((t) => t.due_date !== today);

  function renderTask(t) {
    return (
      <div key={t.id} className="sm-track-row" style={{ alignItems: "flex-start" }}>
        <button type="button" className="sm-track-row-play" onClick={() => completeTask(t.id)} aria-label="Complete task" style={{ marginTop: 2 }}>
          <IconPlay />
        </button>
        <span style={{ flex: 1 }}>
          <div className="sm-track-row-title">{t.name}</div>
          <div className="sm-track-row-sub">{t.category || "Task"}{t.time_slot ? ` · ${t.time_slot}` : ""}</div>
          {(t.subtasks || []).length > 0 && (
            <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
              {t.subtasks.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSubtask(t.id, s.id)}
                  style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}
                >
                  <span style={{ width: 18, height: 18, borderRadius: 5, border: "1.5px solid rgba(0,0,0,.15)", background: s.done ? "var(--sm-purple)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                    {s.done && <IconCheck stroke="#fff" width={10} height={10} />}
                  </span>
                  <span style={{ fontSize: 12.5, color: "var(--sm-ink-soft)", textDecoration: s.done ? "line-through" : "none" }}>{s.name}</span>
                </button>
              ))}
            </div>
          )}
        </span>
      </div>
    );
  }

  return (
    <div className="sm-screen">
      <div className="sm-page" style={{ paddingTop: 34 }}>
        <h1 className="sm-section-title">Tasks</h1>

        {tasks.length === 0 ? (
          <p style={{ color: "var(--sm-ink-soft)", fontSize: 14 }}>All caught up — no open tasks.</p>
        ) : (
          <>
            {dueToday.length > 0 && (
              <>
                <div className="sm-detail-eyebrow" style={{ marginBottom: 4 }}>Due today</div>
                <div className="sm-track-list" style={{ marginBottom: 10 }}>{dueToday.map(renderTask)}</div>
              </>
            )}
            {upcoming.length > 0 && (
              <>
                <div className="sm-detail-eyebrow" style={{ marginBottom: 4 }}>Other tasks</div>
                <div className="sm-track-list">{upcoming.map(renderTask)}</div>
              </>
            )}
          </>
        )}
      </div>
      <TabBar active="music" />
    </div>
  );
}
