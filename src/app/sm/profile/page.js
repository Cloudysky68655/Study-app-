"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import TabBar from "@/components/sm/TabBar";
import { IconUser, IconMoon, IconClose } from "@/components/sm/Icons";

export default function ProfilePage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [notes, setNotes] = useState([]);

  const load = useCallback(async (uid) => {
    const [{ data: st }, { data: nt }] = await Promise.all([
      supabase.from("user_settings").select("*").eq("user_id", uid).maybeSingle(),
      supabase.from("notes").select("*").eq("user_id", uid).eq("trashed", false).order("updated_at", { ascending: false }),
    ]);
    if (st?.display_name) setDisplayName(st.display_name);
    setNotes(nt || []);
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

  async function saveDisplayName() {
    const name = nameDraft.trim();
    setDisplayName(name);
    setEditingName(false);
    if (user) await supabase.from("user_settings").upsert({ user_id: user.id, display_name: name }, { onConflict: "user_id" });
  }

  async function logOut() {
    await supabase.auth.signOut();
    router.replace("/sm/login");
  }

  async function addNote() {
    if (!user) return;
    const row = { user_id: user.id, title: null, body: "", color: "default", tag: null, pinned: false, archived: false, trashed: false };
    const { data, error } = await supabase.from("notes").insert(row).select().single();
    if (!error && data) router.push(`/sm/notes/${data.id}`);
  }

  if (loading || !user) {
    return <div className="sm-screen"><div className="sm-page" style={{ paddingTop: 60 }}><p>Loading…</p></div></div>;
  }

  return (
    <div className="sm-screen">
      <div className="sm-page" style={{ paddingTop: 34 }}>
        <div className="sm-center" style={{ marginBottom: 24 }}>
          <div style={{ width: 84, height: 84, borderRadius: "50%", background: "var(--sm-purple)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", marginBottom: 14 }}>
            <IconUser width={34} height={34} />
          </div>
          {editingName ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                autoFocus
                className="sm-field"
                style={{ marginBottom: 0, width: 180, textAlign: "center" }}
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveDisplayName()}
                placeholder="Your name"
              />
              <button type="button" className="sm-btn sm-btn-primary sm-btn-sm" onClick={saveDisplayName}>Save</button>
            </div>
          ) : (
            <h1 style={{ fontSize: 22, cursor: "pointer" }} onClick={() => { setNameDraft(displayName); setEditingName(true); }} title="Tap to edit">
              {displayName || "Add your name"}
            </h1>
          )}
          <p style={{ color: "var(--sm-ink-soft)", fontSize: 13, marginTop: 4 }}>{user.email}</p>
        </div>

        <div className="sm-detail-eyebrow" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Notes</span>
          <button type="button" className="sm-text-link" onClick={addNote}>+ New</button>
        </div>
        <div className="sm-track-list" style={{ marginBottom: 26 }}>
          {notes.length === 0 ? (
            <p style={{ color: "var(--sm-ink-soft)", fontSize: 13.5, padding: "14px 0" }}>No notes yet.</p>
          ) : (
            notes.slice(0, 8).map((n) => (
              <button key={n.id} type="button" className="sm-track-row" onClick={() => router.push(`/sm/notes/${n.id}`)}>
                <span className="sm-track-row-play"><IconMoon /></span>
                <span>
                  <div className="sm-track-row-title">{n.title || "Untitled"}</div>
                  <div className="sm-track-row-sub" style={{ textTransform: "none", fontWeight: 500 }}>
                    {(n.body || "").replace(/\s+/g, " ").slice(0, 60) || "No content"}
                  </div>
                </span>
              </button>
            ))
          )}
        </div>

        <button type="button" className="sm-btn sm-btn-outline" onClick={logOut} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <IconClose width={16} height={16} /> Log Out
        </button>
      </div>
      <TabBar active="profile" />
    </div>
  );
}
