"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import TopBar from "@/components/sm/TopBar";

// Minimal note editor — view/edit/delete only. The original Notes page's
// pinning, archiving, tags, colors, and Telegram linking are out of scope
// for this pass; see the Phase 2 report for the full list of what's not
// yet wired up.
export default function NoteDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [savedAt, setSavedAt] = useState(null);
  const saveTimer = useRef(null);

  const load = useCallback(async (uid) => {
    const { data } = await supabase.from("notes").select("*").eq("id", id).eq("user_id", uid).maybeSingle();
    if (data) { setTitle(data.title || ""); setBody(data.body || ""); }
    setLoading(false);
  }, [supabase, id]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace("/sm/login"); return; }
      setUser(session.user);
      load(session.user.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function scheduleSave(nextTitle, nextBody) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!user) return;
      await supabase.from("notes").update({ title: nextTitle.trim() || null, body: nextBody }).eq("id", id).eq("user_id", user.id);
      setSavedAt(Date.now());
    }, 600);
  }

  async function deleteNote() {
    if (!user) return;
    await supabase.from("notes").update({ trashed: true, pinned: false }).eq("id", id).eq("user_id", user.id);
    router.push("/sm/profile");
  }

  if (loading || !user) {
    return <div className="sm-screen sm-no-nav"><TopBar onBack={() => router.push("/sm/profile")} /></div>;
  }

  return (
    <div className="sm-screen sm-no-nav">
      <TopBar
        onBack={() => router.push("/sm/profile")}
        actions={<button type="button" className="sm-text-link" style={{ color: "var(--sm-red)" }} onClick={deleteNote}>Delete</button>}
      />
      <div style={{ padding: "8px 24px 30px" }}>
        <input
          className="sm-field"
          style={{ fontSize: 20, fontWeight: 700, background: "none", padding: "8px 0" }}
          placeholder="Title"
          value={title}
          onChange={(e) => { setTitle(e.target.value); scheduleSave(e.target.value, body); }}
        />
        <textarea
          className="sm-field"
          style={{ minHeight: 320, resize: "vertical", background: "none", padding: "8px 0", lineHeight: 1.6 }}
          placeholder="Start writing…"
          value={body}
          onChange={(e) => { setBody(e.target.value); scheduleSave(title, e.target.value); }}
        />
        <p style={{ fontSize: 11.5, color: "var(--sm-ink-soft)", textAlign: "right" }}>
          {savedAt ? "Saved" : "Autosaves as you type"}
        </p>
      </div>
    </div>
  );
}
