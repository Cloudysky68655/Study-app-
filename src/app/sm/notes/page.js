"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import TopBar from "@/components/sm/TopBar";

// A lightweight Notes CRUD screen (list + create + edit) covering the
// original Notes page's core loop. Pinning, color tags, archive/trash,
// search, and the Telegram-link integration from the original page are
// NOT reproduced here — noted as a scope limit, not silently dropped.
export default function NotesPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [notes, setNotes] = useState([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [editingId, setEditingId] = useState(null);

  const load = useCallback(async (uid) => {
    const { data, error } = await supabase.from("notes").select("*").eq("user_id", uid).eq("trashed", false).order("updated_at", { ascending: false });
    if (!error) setNotes(data || []);
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

  function openNew() {
    setEditingId(null); setTitle(""); setBody(""); setComposerOpen(true);
  }
  function openEdit(n) {
    setEditingId(n.id); setTitle(n.title || ""); setBody(n.body || ""); setComposerOpen(true);
  }

  async function save() {
    if (!title.trim() && !body.trim()) { setComposerOpen(false); return; }
    if (!user) return;
    if (editingId) {
      const patch = { title: title.trim() || null, body };
      const { data } = await supabase.from("notes").update(patch).eq("id", editingId).eq("user_id", user.id).select().single();
      if (data) setNotes((prev) => prev.map((n) => (n.id === editingId ? data : n)));
    } else {
      const row = { user_id: user.id, title: title.trim() || null, body, pinned: false, archived: false, trashed: false };
      const { data } = await supabase.from("notes").insert(row).select().single();
      if (data) setNotes((prev) => [data, ...prev]);
    }
    setComposerOpen(false);
  }

  async function trash(id) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (user) await supabase.from("notes").update({ trashed: true, pinned: false }).eq("id", id).eq("user_id", user.id);
  }

  if (loading || !user) {
    return <div className="sm-screen sm-no-nav"><div style={{ padding: 40 }}>Loading…</div></div>;
  }

  if (composerOpen) {
    return (
      <div className="sm-screen sm-no-nav">
        <TopBar title={editingId ? "Edit Note" : "New Note"} onBack={() => setComposerOpen(false)} />
        <div style={{ padding: "10px 24px 24px" }}>
          <input className="sm-field" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea
            className="sm-field" placeholder="Write something…" value={body} onChange={(e) => setBody(e.target.value)}
            style={{ minHeight: 240, resize: "vertical", lineHeight: 1.6 }}
          />
          <button type="button" className="sm-btn sm-btn-primary" onClick={save}>Save</button>
        </div>
      </div>
    );
  }

  return (
    <div className="sm-screen sm-no-nav">
      <TopBar title="Notes" onBack={() => router.push("/sm/profile")} actions={
        <button type="button" className="sm-btn sm-btn-sm sm-btn-primary" onClick={openNew}>+ New</button>
      } />
      <div style={{ padding: "10px 24px 24px" }}>
        {notes.length === 0 ? (
          <p style={{ color: "var(--sm-ink-soft)", fontSize: 14, marginTop: 20 }}>No notes yet — tap + New to add one.</p>
        ) : (
          <div className="sm-track-list">
            {notes.map((n) => (
              <div key={n.id} className="sm-track-row" style={{ alignItems: "flex-start" }} onClick={() => openEdit(n)}>
                <span style={{ flex: 1 }}>
                  <div className="sm-track-row-title">{n.title || "Untitled"}</div>
                  <div className="sm-track-row-sub" style={{ textTransform: "none", fontWeight: 500, marginTop: 4, color: "var(--sm-ink-soft)" }}>
                    {(n.body || "").slice(0, 90) || "No content"}
                  </div>
                </span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); trash(n.id); }}
                  style={{ background: "none", border: "none", color: "var(--sm-ink-soft)", cursor: "pointer", fontSize: 12, fontWeight: 700, flex: "none" }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
