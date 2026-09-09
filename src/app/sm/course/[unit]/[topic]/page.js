"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { calcMastery, isTopicOverdue } from "@/lib/topicData";
import { UNITS, getUnitTopics, getUnitData } from "@/lib/units";
import { IconArrowLeft, IconHeart, IconPlay, IconHeadphones } from "@/components/sm/Icons";

const HERO_IMAGES = [
  "/sm/illustrations/header-happy-morning.png",
  "/sm/illustrations/header-night-island-detail.png",
];

export default function RealCourseDetailPage() {
  const router = useRouter();
  const { unit: unitKey, topic: topicId } = useParams();
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [row, setRow] = useState(null); // topic_progress row
  const [tab, setTab] = useState("overview"); // overview | history
  const [flagged, setFlagged] = useState(false);

  const load = useCallback(async (uid) => {
    const { data } = await supabase.from("topic_progress").select("*").eq("user_id", uid).eq("unit_id", unitKey).eq("topic_id", topicId).maybeSingle();
    setRow(data || { passes: 0, entries: [], history: [], review_flag: false });
    setFlagged(!!data?.review_flag);
    setLoading(false);
  }, [supabase, unitKey, topicId]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace("/sm/login"); return; }
      setUser(session.user);
      load(session.user.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitKey, topicId]);

  async function toggleFlag() {
    const next = !flagged;
    setFlagged(next);
    if (user) {
      const { data } = await supabase.from("topic_progress").upsert(
        { user_id: user.id, unit_id: unitKey, topic_id: topicId, review_flag: next, passes: row?.passes || 0 },
        { onConflict: "user_id,unit_id,topic_id" }
      ).select().single();
      if (data) setRow(data);
    }
  }

  if (loading || !user) {
    return <div className="sm-screen sm-no-nav"><div style={{ padding: 40, textAlign: "center", color: "var(--sm-ink-soft)" }}>Loading…</div></div>;
  }

  const TOPICS = getUnitTopics(unitKey);
  const UNIT_DATA = getUnitData(unitKey);
  const topic = TOPICS.find((t) => t.id === topicId);
  const unitName = UNITS.find((u) => u.key === unitKey)?.name || unitKey;
  const subjectName = UNIT_DATA.find((s) => s.key === topic?.subjectKey)?.name || "";
  const mastery = calcMastery(row);
  const overdue = isTopicOverdue(row);
  const target = 5;

  let statusLine = "Not started yet.";
  if (row.review_flag || (mastery != null && mastery < 60)) statusLine = "Flagged for review.";
  else if (overdue) statusLine = "This topic is overdue for review.";
  else if (row.passes > 0 && mastery != null && mastery >= 80) statusLine = "Mastered — nice work.";
  else if (row.passes > 0) statusLine = `${row.passes} of ${target} passes logged.`;

  const heroImg = HERO_IMAGES[(topicId?.length || 0) % HERO_IMAGES.length];

  if (!topic) {
    return (
      <div className="sm-screen sm-no-nav">
        <div style={{ padding: 40 }}>
          <button type="button" className="sm-icon-btn" onClick={() => router.back()}><IconArrowLeft /></button>
          <p style={{ marginTop: 20, color: "var(--sm-ink-soft)" }}>Topic not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sm-screen sm-no-nav">
      <div className="sm-detail-hero">
        <img src={heroImg} alt="" />
        <div className="sm-detail-hero-bar" style={{ top: 62 }}>
          <button type="button" className="sm-icon-btn sm-icon-btn-ghost" style={{ color: "var(--sm-ink)" }} onClick={() => router.back()} aria-label="Back">
            <IconArrowLeft />
          </button>
          <div className="sm-detail-hero-actions">
            <button type="button" className={`sm-icon-btn sm-icon-btn-ghost${flagged ? " sm-icon-btn-active" : ""}`} style={{ color: "#fff" }} onClick={toggleFlag} aria-label="Flag for review" title="Flag for review">
              <IconHeart filled={flagged} />
            </button>
          </div>
        </div>
      </div>

      <div className="sm-detail-body">
        <h1>{topic.name}</h1>
        <div className="sm-detail-eyebrow">{unitName} · {subjectName}</div>
        <p className="sm-detail-desc">{statusLine}</p>

        <div className="sm-detail-stats">
          <span><IconHeart filled={row.passes > 0} style={{ color: "var(--sm-pink)" }} /> {row.passes || 0}/{target} passes</span>
          <span><IconHeadphones /> {(row.history || []).length} logged</span>
        </div>

        <h3 className="sm-narrator">Track your progress</h3>
        <div className="sm-narrator-tabs">
          <button type="button" className={`sm-narrator-tab${tab === "overview" ? " active" : ""}`} onClick={() => setTab("overview")}>Overview</button>
          <button type="button" className={`sm-narrator-tab${tab === "history" ? " active" : ""}`} onClick={() => setTab("history")}>History</button>
        </div>

        {tab === "overview" ? (
          <div className="sm-track-list">
            <button type="button" className="sm-track-row" onClick={() => router.push(`/sm/player/${unitKey}/${topicId}`)}>
              <span className="sm-track-row-play active"><IconPlay /></span>
              <span>
                <div className="sm-track-row-title">Study Timer</div>
                <div className="sm-track-row-sub">Focus, then log a pass</div>
              </span>
            </button>
            {mastery != null && (
              <div style={{ padding: "16px 0", fontSize: 13.5, color: "var(--sm-ink-soft)" }}>
                Mastery: <strong style={{ color: "var(--sm-ink)" }}>{mastery}%</strong>
              </div>
            )}
          </div>
        ) : (
          <div className="sm-track-list">
            {(row.history || []).length === 0 ? (
              <p style={{ color: "var(--sm-ink-soft)", fontSize: 13.5, padding: "14px 0" }}>No sessions logged yet.</p>
            ) : (
              row.history.slice(0, 20).map((h, i) => (
                <div key={i} className="sm-track-row" style={{ cursor: "default" }}>
                  <span className="sm-track-row-play"><IconHeadphones /></span>
                  <span>
                    <div className="sm-track-row-title" style={{ textTransform: "capitalize" }}>{h.action}{h.value != null ? ` — ${h.value}${h.action === "study session" ? " min" : ""}` : ""}</div>
                    <div className="sm-track-row-sub">{new Date(h.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</div>
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
