"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { calcMastery, isTopicOverdue } from "@/lib/topicData";
import { UNITS, getUnitTopics, getUnitData, isUnitLocked } from "@/lib/units";
import TabBar from "@/components/sm/TabBar";
import { IconPlay } from "@/components/sm/Icons";

const TOPIC_TILE_IMAGES = [
  "/sm/illustrations/tile-7days-calm.png",
  "/sm/illustrations/tile-anxiety-release.png",
  "/sm/illustrations/topic-reduce-stress.png",
  "/sm/illustrations/topic-improve-perf.png",
  "/sm/illustrations/topic-increase-happiness.png",
  "/sm/illustrations/topic-reduce-anxiety.png",
  "/sm/illustrations/topic-personal-growth.png",
  "/sm/illustrations/topic-better-sleep.png",
];

export default function MeditatePage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(null);
  const [progressRows, setProgressRows] = useState([]);
  const [activeUnitId, setActiveUnitId] = useState(null);

  const load = useCallback(async (uid) => {
    const [{ data: st }, { data: prog }] = await Promise.all([
      supabase.from("user_settings").select("*").eq("user_id", uid).maybeSingle(),
      supabase.from("topic_progress").select("*").eq("user_id", uid),
    ]);
    setSettings(st || null);
    setActiveUnitId(st?.active_unit_id || UNITS[0].key);
    setProgressRows(prog || []);
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

  async function switchUnit(unitKey) {
    const unit = UNITS.find((u) => u.key === unitKey);
    if (isUnitLocked(unit, settings?.premium_units)) return; // locked units stay non-interactive here
    setActiveUnitId(unitKey);
    if (user) await supabase.from("user_settings").upsert({ user_id: user.id, active_unit_id: unitKey }, { onConflict: "user_id" });
  }

  if (loading || !user) {
    return <div className="sm-screen"><div className="sm-tab-hero"><p>Loading…</p></div></div>;
  }

  const TOPICS = getUnitTopics(activeUnitId);
  const UNIT_DATA = getUnitData(activeUnitId);
  const progress = {};
  progressRows.forEach((r) => { if (r.unit_id === activeUnitId) progress[r.topic_id] = r; });
  function getTopicRow(id) { return progress[id] || { passes: 0, entries: [], history: [] }; }
  function subjectNameFor(topic) { return UNIT_DATA.find((s) => s.key === topic.subjectKey)?.name || ""; }
  function statusFor(topic) {
    const row = getTopicRow(topic.id);
    const mastery = calcMastery(row);
    if (row.review_flag || (mastery != null && mastery < 60)) return "Needs review";
    if (isTopicOverdue(row)) return "Overdue";
    if (!(row.passes > 0) && !(row.entries?.length > 0)) return "Not started";
    if (mastery != null && mastery >= 80) return "Mastered";
    return "In progress";
  }

  // "Continue studying" feature banner: the single topic most in need of
  // attention right now (review-flagged/overdue first, else first untouched).
  const priorityTopic =
    TOPICS.find((t) => getTopicRow(t.id).review_flag) ||
    TOPICS.find((t) => isTopicOverdue(getTopicRow(t.id))) ||
    TOPICS.find((t) => !(getTopicRow(t.id).passes > 0)) ||
    TOPICS[0];

  const activeUnit = UNITS.find((u) => u.key === activeUnitId);

  return (
    <div className="sm-screen sm-theme-light">
      <div className="sm-tab-hero">
        <h1>Meditate</h1>
        <p>{activeUnit?.name} — {UNIT_DATA.length} subject{UNIT_DATA.length === 1 ? "" : "s"}, {TOPICS.length} topics</p>
      </div>

      <div className="sm-chip-row">
        {UNITS.map((u) => {
          const locked = isUnitLocked(u, settings?.premium_units);
          return (
            <button
              key={u.key}
              type="button"
              className={`sm-chip${activeUnitId === u.key ? " active" : ""}`}
              onClick={() => switchUnit(u.key)}
              style={locked ? { opacity: 0.4 } : undefined}
              title={locked ? `${u.name} (locked)` : u.name}
            >
              <span className="sm-chip-circle">{locked ? "🔒" : u.subtitle?.slice(0, 2) || u.name.slice(0, 2)}</span>
              <span>{u.name.split(" ")[0]}</span>
            </button>
          );
        })}
      </div>

      {priorityTopic && (
        <button type="button" className="sm-banner" style={{ margin: "0 24px 22px", background: "linear-gradient(120deg,#f3d9c4,#f7a35c)" }} onClick={() => router.push(`/sm/course/${activeUnitId}/${priorityTopic.id}`)}>
          <div>
            <div className="sm-banner-title" style={{ color: "#3d2c0c" }}>{priorityTopic.name}</div>
            <div className="sm-banner-sub" style={{ color: "#6b4d1e" }}>{subjectNameFor(priorityTopic)} · {statusFor(priorityTopic)}</div>
          </div>
          <span className="sm-banner-play" style={{ background: "#2c2a45", color: "#fff" }}><IconPlay /></span>
        </button>
      )}

      <div className="sm-tile-grid">
        {TOPICS.map((t, i) => (
          <button key={t.id} type="button" className="sm-tile" onClick={() => router.push(`/sm/course/${activeUnitId}/${t.id}`)}>
            <img src={TOPIC_TILE_IMAGES[i % TOPIC_TILE_IMAGES.length]} alt={t.name} />
            <div className="sm-tile-title">{t.name}</div>
            <div className="sm-tile-sub">{subjectNameFor(t)} · {statusFor(t)}</div>
          </button>
        ))}
      </div>

      <TabBar active="meditate" />
    </div>
  );
}
