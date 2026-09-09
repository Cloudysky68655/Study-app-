"use client";
import { useEffect, useState } from "react";

function todayStr() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

/**
 * Lightweight cross-module "what's happened today" summary — whether
 * QBank was practiced today — so a module can show a hint of status.
 */
export function useTodayStrip(supabase, userId) {
  const [strip, setStrip] = useState(null);

  useEffect(() => {
    if (!supabase || !userId) return;
    let active = true;
    const today = todayStr();

    (async () => {
      const { data: practice } = await supabase
        .from("practice_history")
        .select("created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);
      if (!active) return;

      const lastPracticeAt = practice?.[0]?.created_at || null;
      const practicedToday = !!lastPracticeAt && lastPracticeAt.slice(0, 10) === today;

      setStrip({ practicedToday });
    })();

    return () => { active = false; };
  }, [supabase, userId]);

  return strip;
}
