"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { calcMastery, dayKey, buildWeekPlan, smartWeekStart, DEFAULT_DAY_PRIORITY } from "@/lib/topicData";
import { UNITS, getUnitTopics, getUnitData } from "@/lib/units";
import { dayStr, isHabitScheduled, isHabitDone } from "@/lib/smHabits";
import TabBar from "@/components/sm/TabBar";
import { IconPlay } from "@/components/sm/Icons";

// Recycled from the Figma export — there's no real per-topic artwork,
// so real study sessions cycle through the reference's own illustration
// tiles rather than inventing new imagery.
const TOPIC_TILE_IMAGES = [
  "/sm/illustrations/tile-7days-calm.png",
  "/sm/illustrations/tile-anxiety-release.png",
  "/sm/illustrations/topic-reduce-stress.png",
  "/sm/illustrations/topic-increase-happiness.png",
  "/sm/illustrations/topic-personal-growth.png",
  "/sm/illustrations/topic-better-sleep.png",
];

export default function HomePage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [settings, setSettings] = useState(null);
  const [progressRows, setProgressRows] = useState([]);
  const [habits, setHabits] = useState([]);
  const [log, setLog] = useState({});
  const [tasks, setTasks] = useState([]);
  const [completedFlashcardSessions, setCompletedFlashcardSessions] = useState([]);

  const loadEverything = useCallback(async (uid) => {
    const [{ data: st }, { data: prog }, { data: hb }, { data: hl }, { data: tk }, { data: fs }] = await Promise.all([
      supabase.from("user_settings").select("*").eq("user_id", uid).maybeSingle(),
      supabase.from("topic_progress").select("*").eq("user_id", uid),
      supabase.from("habits").select("*").eq("user_id", uid).eq("archived", false),
      supabase.from("habit_log").select("*").eq("user_id", uid),
      supabase.from("habit_tasks").select("*").eq("user_id", uid),
      supabase.from("flashcard_sessions").select("*").eq("user_id", uid).eq("status", "completed"),
    ]);
    setSettings(st || null);
    if (st?.display_name) setDisplayName(st.display_name);
    setProgressRows(prog || []);
    setHabits(hb || []);
    const logObj = {};
    (hl || []).forEach((r) => { (logObj[r.day] = logObj[r.day] || {})[r.habit_id] = r; });
    setLog(logObj);
    setTasks((tk || []).filter((t) => !t.done && t.due_date === dayStr()));
    setCompletedFlashcardSessions(fs || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace("/sm/login"); return; }
      setUser(session.user);
      loadEverything(session.user.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading || !user) {
    return (
      <div className="sm-screen">
        <div className="sm-page" style={{ paddingTop: 60, textAlign: "center", color: "var(--sm-ink-soft)" }}>Loading…</div>
      </div>
    );
  }

  /* ---------- Study: today's sessions (identical logic to /today) ---------- */
  const activeUnitId = settings?.active_unit_id || UNITS[0].key;
  const TOPICS = getUnitTopics(activeUnitId);
  const UNIT_DATA = getUnitData(activeUnitId);
  const progress = {};
  progressRows.forEach((r) => { if (r.unit_id === activeUnitId) progress[r.topic_id] = r; });
  function getTopicRow(id) { return progress[id] || { passes: 0, entries: [], history: [] }; }
  function subjectNameFor(topic) { return UNIT_DATA.find((s) => s.key === topic.subjectKey)?.name || ""; }

  let todaysSessions = [];
  const sd = settings?.schedule_data;
  const smartCfg = sd?.mode !== "manual" && sd?.generated ? sd?.smartSubjects : null;
  if (smartCfg && Object.keys(smartCfg).length && settings?.start_date) {
    const weekStart = smartWeekStart(settings.start_date);
    const progressByTopicId = {};
    TOPICS.forEach((x) => { progressByTopicId[x.id] = getTopicRow(x.id); });
    const todayIdx = Math.floor((new Date().setHours(0, 0, 0, 0) - weekStart.getTime()) / 86400000);
    const weekPlan = buildWeekPlan(weekStart, smartCfg, settings.day_priority || DEFAULT_DAY_PRIORITY, TOPICS, progressByTopicId, settings.target_passes || 5, todayIdx);
    todaysSessions = weekPlan.schedule[todayIdx] || [];
  } else if (sd?.mode === "manual" && sd?.manualConfirmed && settings?.start_date) {
    const manualStart = new Date(settings.start_date + "T00:00:00");
    const manualTodayIdx = Math.round((new Date().setHours(0, 0, 0, 0) - manualStart.getTime()) / 86400000);
    const manualPlan = sd.manualPlan || {};
    const todayIds = manualPlan[manualTodayIdx] || [];
    todaysSessions = todayIds.map((id) => {
      const t = TOPICS.find((x) => x.id === id);
      if (!t) return null;
      return { ...t };
    }).filter(Boolean);
  } else {
    // No schedule configured yet — fall back to a handful of topics that
    // most need attention (overdue/flagged first, then untouched), so
    // "Recomended for you" is never empty for a first-time user.
    todaysSessions = [...TOPICS]
      .sort((a, b) => {
        const pa = getTopicRow(a.id), pb = getTopicRow(b.id);
        const score = (p) => (p.review_flag ? 0 : (p.passes || 0) === 0 ? 1 : 2);
        return score(pa) - score(pb);
      })
      .slice(0, 6);
  }

  const flashcardDoneTopicIdsToday = new Set(
    completedFlashcardSessions
      .filter((s) => s.unit_id === activeUnitId && s.completed_at && dayKey(new Date(s.completed_at)) === dayKey(new Date()))
      .map((s) => s.topic_id)
  );
  function isSessionDone(it) {
    if (flashcardDoneTopicIdsToday.has(it.id)) return true;
    const row = progress[it.id];
    const passes = row?.passes || 0;
    if (passes >= (it.pass || settings?.target_passes || 5)) return true;
    const mastery = calcMastery(row);
    return mastery != null && mastery >= 70;
  }
  const completedSessions = todaysSessions.filter(isSessionDone);

  /* ---------- Habits: today ---------- */
  const today = new Date();
  const ds = dayStr(today);
  const habitsToday = habits.filter((h) => isHabitScheduled(h, today));
  const habitsDoneToday = habitsToday.filter((h) => isHabitDone(log, ds, h.id));

  const greetName = displayName || user.email?.split("@")[0] || "there";
  const hour = today.getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";

  return (
    <div className="sm-screen">
      <div className="sm-logo sm-logo-dark">
        <img src="/sm/illustrations/logo-mark.png" alt="" />
        <span>Silent&nbsp;&nbsp;Moon</span>
      </div>

      <div className="sm-page">
        <div className="sm-greeting">
          <h1>{greeting}, {greetName}</h1>
          <p>
            {todaysSessions.length === 0
              ? "Nothing scheduled yet — build a plan whenever you're ready."
              : completedSessions.length === todaysSessions.length
              ? "You're all caught up for today. Nice work."
              : `${todaysSessions.length - completedSessions.length} session${todaysSessions.length - completedSessions.length === 1 ? "" : "s"} left today`}
          </p>
        </div>

        <div className="sm-course-row">
          <button type="button" className="sm-course-card sm-course-card-purple" onClick={() => router.push("/sm/meditate")}>
            <img className="sm-course-card-illust" src="/sm/illustrations/home-basics-mascot.png" alt="" />
            <div>
              <div className="sm-course-card-eyebrow">Study</div>
              <div className="sm-course-card-title">Continue studying</div>
            </div>
            <div className="sm-course-card-foot">
              <span className="sm-course-card-time">
                {todaysSessions.length ? `${todaysSessions.length - completedSessions.length} left today` : "Build a plan"}
              </span>
              <span className="sm-course-pill">Start</span>
            </div>
          </button>

          <button type="button" className="sm-course-card sm-course-card-amber" onClick={() => router.push("/sm/music")}>
            <img className="sm-course-card-illust" src="/sm/illustrations/home-relax-illust.png" alt="" style={{ width: 92, top: 26 }} />
            <div>
              <div className="sm-course-card-eyebrow">Tasks</div>
              <div className="sm-course-card-title">Today&apos;s to-dos</div>
            </div>
            <div className="sm-course-card-foot">
              <span className="sm-course-card-time">{tasks.length} scheduled</span>
              <span className="sm-course-pill">View</span>
            </div>
          </button>
        </div>

        <button type="button" className="sm-banner" onClick={() => router.push("/sm/sleep")}>
          <div>
            <div className="sm-banner-title">Habits</div>
            <div className="sm-banner-sub">{habitsDoneToday.length}/{habitsToday.length} done today</div>
          </div>
          <span className="sm-banner-play"><IconPlay /></span>
        </button>

        <h2 className="sm-section-title">Recomended for you</h2>
        {todaysSessions.length === 0 ? (
          <p style={{ color: "var(--sm-ink-soft)", fontSize: 14 }}>Nothing queued — head to Meditate to pick a topic.</p>
        ) : (
          <div className="sm-hscroll">
            {todaysSessions.slice(0, 8).map((t, i) => (
              <button
                key={t.id}
                type="button"
                className="sm-tile"
                onClick={() => router.push(`/sm/course/${activeUnitId}/${t.id}`)}
              >
                <img src={TOPIC_TILE_IMAGES[i % TOPIC_TILE_IMAGES.length]} alt={t.name} />
                <div className="sm-tile-title">{t.name}</div>
                <div className="sm-tile-sub">{subjectNameFor(t)}{isSessionDone(t) ? " · Done" : ""}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <TabBar active="home" />
    </div>
  );
}
