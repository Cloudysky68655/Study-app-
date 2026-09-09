"use client";
// Mount point for Study's "Practice" tab — merges the old standalone
// /qbank route's three tabs into one Study sub-feature. Owns the
// admin gate itself (previously enforced by qbank/page.js) so it's safe
// to drop in without the host remembering to gate the Manage view.
import { useState } from "react";
import PracticeTab from "@/components/study/PracticeTab";
import HistoryTab from "@/components/study/HistoryTab";
import ManageTab from "@/components/study/ManageTab";
import { IconPlay, IconClock, IconBook } from "@/components/Icons";

const ADMIN_EMAIL = "maghrabiasma11@gmail.com";

export default function PracticePanel({ supabase, user, showToast, initialTopicId }) {
  const [subTab, setSubTab] = useState("practice"); // practice | history | manage
  const isAdmin = user?.email === ADMIN_EMAIL;

  const SUB_TABS = [
    { key: "practice", label: "Practice", icon: IconPlay },
    { key: "history", label: "History", icon: IconClock },
    ...(isAdmin ? [{ key: "manage", label: "Manage", icon: IconBook }] : []),
  ];

  return (
    <div>
      <div style={{ display: "flex", gap: 6, padding: 4, marginBottom: 20, border: "1px solid var(--panel-border)", borderRadius: 100, background: "var(--glass-bg)", width: "fit-content" }}>
        {SUB_TABS.map((t) => {
          const Icon = t.icon;
          const active = subTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              data-sound="none"
              onClick={() => setSubTab(t.key)}
              style={{
                display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, padding: "7px 14px", borderRadius: 100, border: "none", cursor: "pointer",
                background: active ? "var(--grad-primary)" : "transparent",
                color: active ? "#fff" : "var(--soft)",
              }}
            >
              <Icon style={{ width: 13, height: 13 }} /> {t.label}
            </button>
          );
        })}
      </div>

      {subTab === "practice" && <PracticeTab supabase={supabase} user={user} showToast={showToast} initialTopicId={initialTopicId} />}
      {subTab === "history" && <HistoryTab supabase={supabase} user={user} />}
      {subTab === "manage" && isAdmin && <ManageTab supabase={supabase} user={user} showToast={showToast} />}
    </div>
  );
}
