"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { UNITS, getUnitTopics } from "@/lib/units";
import { IconClose, IconPlay, IconPause } from "@/components/sm/Icons";

// Real study timer — persisted the same way the original Study page's
// timer tool works: sessionStorage while running (survives refresh),
// accumulated + runningSince pattern, "finish" upserts topic_progress
// with a real pass + history entry.
const STORAGE_KEY = "sm_study_timer_session";

function loadSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}
function saveSession(s) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) { /* ignore */ }
}
function clearSession() {
  try { sessionStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
}

function formatTime(total) {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function RealStudyTimerPage() {
  const router = useRouter();
  const { unit: unitKey, topic: topicId } = useParams();
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [, setTick] = useState(0);
  const finishedRef = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      if (!sess) { router.replace("/sm/login"); return; }
      setUser(sess.user);
      const existing = loadSession();
      if (existing && existing.topicId === topicId && existing.unitKey === unitKey) {
        setSession(existing);
      } else {
        const next = { unitKey, topicId, accumulated: 0, runningSince: Date.now() };
        setSession(next);
        saveSession(next);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitKey, topicId]);

  useEffect(() => {
    if (!session?.runningSince) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [session]);

  function computeSeconds(s) {
    if (!s) return 0;
    const running = s.runningSince ? Math.floor((Date.now() - s.runningSince) / 1000) : 0;
    return s.accumulated + running;
  }

  function play() {
    const next = { ...session, runningSince: Date.now() };
    setSession(next);
    saveSession(next);
  }

  function pause() {
    const elapsed = session.runningSince ? Math.floor((Date.now() - session.runningSince) / 1000) : 0;
    const next = { ...session, accumulated: session.accumulated + elapsed, runningSince: null };
    setSession(next);
    saveSession(next);
  }

  // Finishing logs a real pass to topic_progress — same payload/history
  // shape as the original Study page's finishStudySession().
  const finish = useCallback(async () => {
    if (finishedRef.current || !session || !user) { router.push(`/sm/course/${unitKey}/${topicId}`); return; }
    finishedRef.current = true;
    const totalSeconds = computeSeconds(session);
    const minutes = Math.max(1, Math.round(totalSeconds / 60));
    if (totalSeconds >= 1) {
      const { data: current } = await supabase.from("topic_progress").select("*").eq("user_id", user.id).eq("unit_id", unitKey).eq("topic_id", topicId).maybeSingle();
      const newPasses = (current?.passes || 0) + 1;
      const newHistory = [
        { date: new Date().toISOString(), action: "study session", value: minutes },
        { date: new Date().toISOString(), action: "pass", value: newPasses },
        ...(current?.history || []),
      ].slice(0, 500);
      await supabase.from("topic_progress").upsert(
        { user_id: user.id, unit_id: unitKey, topic_id: topicId, passes: newPasses, history: newHistory },
        { onConflict: "user_id,unit_id,topic_id" }
      );
    }
    clearSession();
    router.push(`/sm/course/${unitKey}/${topicId}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, user, unitKey, topicId, supabase, router]);

  if (!user || !session) {
    return <div className="sm-screen sm-no-nav sm-full-bleed sm-theme-navy"><div style={{ padding: 40, color: "#fff" }}>Loading…</div></div>;
  }

  const TOPICS = getUnitTopics(unitKey);
  const topic = TOPICS.find((t) => t.id === topicId);
  const unitName = UNITS.find((u) => u.key === unitKey)?.name || unitKey;
  const seconds = computeSeconds(session);
  const running = !!session.runningSince;

  return (
    <div className="sm-screen sm-no-nav sm-full-bleed sm-theme-navy">
      <div className="sm-player">
        <div className="sm-player-blob" aria-hidden="true">
          <svg viewBox="0 0 400 800" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
            <circle cx="330" cy="140" r="180" fill="#1c1c55" />
            <circle cx="30" cy="760" r="160" fill="#171749" />
          </svg>
        </div>

        <div className="sm-player-bar">
          <button type="button" className="sm-icon-btn sm-icon-btn-dark" onClick={finish} aria-label="Finish and log pass" title="Finish and log pass">
            <IconClose />
          </button>
        </div>

        <div className="sm-player-body">
          <h1 className="sm-player-title">{topic?.name || "Studying"}</h1>
          <div className="sm-player-sub">{unitName}</div>

          <div className="sm-player-controls">
            {!running ? (
              <button type="button" className="sm-player-play" onClick={play} aria-label="Resume"><IconPlay /></button>
            ) : (
              <button type="button" className="sm-player-play" onClick={pause} aria-label="Pause"><IconPause /></button>
            )}
          </div>
        </div>

        <div className="sm-player-scrub">
          <div className="sm-player-times" style={{ justifyContent: "center", gap: 10 }}>
            <span style={{ fontSize: 34, fontWeight: 800, letterSpacing: "0.02em" }}>{formatTime(seconds)}</span>
          </div>
          <button type="button" className="sm-btn sm-btn-light" style={{ marginTop: 24 }} onClick={finish}>
            Finish &amp; log pass
          </button>
        </div>
      </div>
    </div>
  );
}
