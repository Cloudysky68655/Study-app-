"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { calcMastery, masteryColor, dayKey, isTopicOverdue, buildWeekPlan, smartWeekStart, DAY_PRIORITY_LABELS, DEFAULT_DAY_PRIORITY, WEEKDAY_SHORT } from "@/lib/topicData";
import { UNITS, getUnitTopics, getUnitData } from "@/lib/units";
import { ROLE_CYCLE, inkFor } from "@/lib/palettes";
import { applyAccentVars } from "@/lib/accents";
import { IconBook, IconGrid, IconChart, IconCalendar, IconPower, IconStar, IconFlame, IconCheck, IconBolt, IconArrowRight, IconClock, IconPlay, IconPause, IconStop, IconArrowLeft, IconLayers, IconHome, IconLock } from "@/components/Icons";
import { playSelect, playTick, playSuccess, playPing, playMilestone, playSwishOpen, playSwishClose, getSoundsEnabled, setSoundsEnabled } from "@/lib/sounds";
import UnitPicker from "@/components/UnitPicker";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import QBankPracticeTab from "@/components/QBankPractice";
import QBankManageTab from "@/components/QBankManage";
import FlashcardsPracticeTab from "@/components/FlashcardsPractice";
import FlashcardsLibraryTab from "@/components/FlashcardsLibrary";
import FlashcardsManageTab from "@/components/FlashcardsManage";
import AccessCodesManage from "@/components/AccessCodesManage";
import SettingsView from "@/components/SettingsView";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";

const ADMIN_EMAIL = "maghrabiasma11@gmail.com";
const THEMES = ["dark", "solar", "bloom", "stitch", "minimal"];
const TABS = ["tracker", "dashboard", "analytics", "log", "schedule", "settings"];

const TAB_ICON_COMPONENTS = { tracker: IconBook, dashboard: IconGrid, analytics: IconStar, log: IconChart, schedule: IconCalendar };
const TAB_LABELS = { tracker: "Topics", dashboard: "Insights", analytics: "Analytics", log: "History", schedule: "Plan" };
// Study's own secondary sidebar (per the mockup): Tracker / Stats (merged
// Insights+Analytics) / QBank (embedded inline, same as every other tab
// here — no page navigation) / Flashcards (placeholder) / History / Plan.
const STUDY_SIDEBAR_ITEMS = [
  { key: "study", label: "Hub", icon: IconHome },
  { key: "tracker", label: "Tracker", icon: IconBook },
  { key: "dashboard", label: "Stats", icon: IconStar },
  { key: "library", label: "Library", icon: IconLayers },
  { key: "log", label: "History", icon: IconChart },
  { key: "schedule", label: "Plan", icon: IconCalendar },
];
const THEME_NAMES = { dark: "Midnight Pulse", solar: "Solar Pop", bloom: "Bloom", stitch: "Sweet Stitch", minimal: "Minimal" };
const THEME_WELCOME = { dark: "Welcome back", solar: "Let's get after it", bloom: "So glad you're here", stitch: "Yay, you're back! ✿", minimal: "Welcome back" };
const THEME_STUDY_CTA = { dark: "Study now", solar: "Let's go", bloom: "Begin studying", stitch: "Let's study! ✿", minimal: "Study now" };

// Categorical tracker-row status, priority order: a topic can only be one
// of these at a time. Each maps to a single theme color var (no hue-blend
// gradients) so the wash stays coherent across all 5 themes.
//   1. review    — flagged by QBank calibration, or mastery has dropped low
//   2. overdue   — past its spaced-repetition due date (grows with each
//                  pass, not a flat cutoff — see isTopicOverdue)
//   3. untouched — never studied at all yet
//   4. mastered  — hit the target pass count with a genuinely good score
// Anything else (in-progress, on track) gets no special tag or tint.
function getTopicStatus(t, mastery, target) {
  const touched = (t.passes || 0) > 0 || (t.entries && t.entries.length > 0);
  if (t.review_flag || (mastery != null && mastery < 60)) {
    return { key: "review", label: "needs review", color: "var(--red)" };
  }
  if (isTopicOverdue(t)) {
    return { key: "overdue", label: "overdue", color: "var(--amber)" };
  }
  if (!touched) {
    return { key: "untouched", label: "not touched yet", color: "var(--soft)" };
  }
  if ((t.passes || 0) >= target && mastery != null && mastery >= 80) {
    return { key: "mastered", label: "mastered", color: "var(--green)" };
  }
  return null;
}


const TYPES = [
  { key: "video", label: "Video" },
  { key: "notes", label: "Notes" },
  { key: "anki", label: "Anki" },
  { key: "qcm", label: "QCM practice" },
];

export default function StudySuite({ initialTab = "study", activeNav = "study", initialLibrarySection = null }) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState(null);
  const [librarySection, setLibrarySection] = useState(
    initialLibrarySection || (initialTab === "flashcards" ? "flashcards" : "qbank")
  );
  const [qbankView, setQbankView] = useState("practice"); // practice | manage (admin only)
  const [flashcardsView, setFlashcardsView] = useState("practice"); // practice | library | manage (admin only)
  const [theme, setTheme] = useState(null);
  const [colorMode, setColorMode] = useState(null);
  const [palette, setPalette] = useState(null);
  const [allProgressRows, setAllProgressRows] = useState([]);
  const [allPracticeHistory, setAllPracticeHistory] = useState([]);
  const [allFlashcardSessions, setAllFlashcardSessions] = useState([]);
  const [activeUnitId, setActiveUnitId] = useState(null);
  const [settings, setSettings] = useState(null);
  const [comingSoonUnits, setComingSoonUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [tab, setTab] = useState(
    initialTab === "qbank" || initialTab === "flashcards" ? "library" : initialTab
  );

  useEffect(() => {
    if (initialTab) {
      if (initialTab === "qbank") {
        setTab("library");
        setLibrarySection("qbank");
      } else if (initialTab === "flashcards") {
        setTab("library");
        setLibrarySection("flashcards");
      } else {
        setTab(initialTab);
      }
    }
    if (initialLibrarySection) {
      setLibrarySection(initialLibrarySection);
    }
  }, [initialTab, initialLibrarySection]);

  const goTab = useCallback((t) => {
    playSelect();
    const TAB_ROUTES = {
      study: "/study",
      tracker: "/tracker",
      dashboard: "/stats",
      stats: "/stats",
      library: "/library",
      qbank: "/library",
      flashcards: "/library",
      log: "/stats",
      history: "/stats",
      schedule: "/plan",
      plan: "/plan",
      access: "/access",
      settings: "/settings",
    };
    if (t === "timer" || t === "addpass") {
      setTab(t);
    } else if (t === "qbank") {
      setLibrarySection("qbank");
      setTab("library");
      router.push("/library");
    } else if (t === "flashcards") {
      setLibrarySection("flashcards");
      setTab("library");
      router.push("/library");
    } else if (TAB_ROUTES[t]) {
      router.push(TAB_ROUTES[t]);
    } else {
      setTab(t);
    }
  }, [router]);

  const handleNavTabChange = useCallback((navKey, href) => {
    const tabMapping = {
      study: "study",
      tracker: "tracker",
      library: "library",
      stats: "dashboard",
      dashboard: "dashboard",
      history: "dashboard",
      log: "dashboard",
      plan: "schedule",
      schedule: "schedule",
      access: "access",
      settings: "settings",
    };
    const targetTab = tabMapping[navKey] || navKey;
    setTab(targetTab);
    if (typeof window !== "undefined" && window.history && href) {
      window.history.pushState(null, "", href);
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const pathToTab = {
        "/study": "study",
        "/tracker": "tracker",
        "/library": "library",
        "/stats": "dashboard",
        "/dashboard": "dashboard",
        "/history": "dashboard",
        "/log": "dashboard",
        "/plan": "schedule",
        "/schedule": "schedule",
        "/access": "access",
        "/settings": "settings",
      };
      if (pathToTab[path]) {
        setTab(pathToTab[path]);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navItemRefs = useRef([]);
  const navTrackRef = useRef(null);

  // Set when the person taps "Study now" on a specific topic from the
  // Today's sessions card — carries that topic into whichever tool they
  // pick next (timer, QBank, or add-a-pass), instead of opening the tool
  // topic-less.
  const [pendingTopicId, setPendingTopicId] = useState(null);
  const [flashcardsInitialTopicId, setFlashcardsInitialTopicId] = useState(null);
  const [toolsHandoffTopicId, setToolsHandoffTopicId] = useState(null);
  const [handoffKey, setHandoffKey] = useState(0);
  function studyNowFor(topicId, tool) {
    setPendingTopicId(topicId);
    if (tool === "timer") {
      goTab("timer");
    } else if (tool === "addpass") {
      goTab("addpass");
    } else if (tool === "flashcards") {
      setFlashcardsInitialTopicId(topicId);
      setLibrarySection("flashcards");
      setTab("library");
      router.push("/library");
    } else {
      setLibrarySection("qbank");
      setTab("library");
      router.push("/library");
    }
  }

  // Picks up a "Study" handoff from the Today page (separate routes, so
  // it can't just be passed as local state) — opens the exact same
  // "what do you want to study with?" tool picker that clicking a
  // session's Study button inside Study itself opens.
  useEffect(() => {
    if (loading || !activeUnitId) return;
    try {
      const raw = sessionStorage.getItem("study_pending_topic");
      if (!raw) return;
      sessionStorage.removeItem("study_pending_topic");
      const { topicId, ts } = JSON.parse(raw);
      if (topicId && Date.now() - ts < 15000) {
        setToolsHandoffTopicId(topicId);
        setHandoffKey((k) => k + 1);
        setTab("study");
        // StudyHub only reads this as its *initial* state on mount — clear
        // it shortly after so a later, unrelated visit to the Study tab
        // doesn't keep reopening the tool picker for this stale topic.
        // (This doesn't affect the already-mounted StudyHub above, since
        // "handoffKey" — not this value — is what controls remounting.)
        setTimeout(() => setToolsHandoffTopicId(null), 1500);
      }
    } catch (e) { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, activeUnitId]);

  // ---- unit-scoped derived data ----
  // TOPICS/UNIT_DATA come from whichever unit is active; progress is the
  // subset of allProgressRows belonging to that unit, keyed by topic_id
  // to match how the rest of this file already expects it.
  const TOPICS = getUnitTopics(activeUnitId);
  const UNIT_DATA = getUnitData(activeUnitId);
  const progress = {};
  allProgressRows.forEach((r) => { if (r.unit_id === activeUnitId) progress[r.topic_id] = r; });

  const upsertProgressRow = useCallback((row) => {
    setAllProgressRows((rows) => {
      const idx = rows.findIndex((r) => r.unit_id === row.unit_id && r.topic_id === row.topic_id);
      if (idx === -1) return [...rows, row];
      const next = rows.slice();
      next[idx] = row;
      return next;
    });
  }, []);

  function chooseUnit(key) {
    setActiveUnitId(key);
    if (user) supabase.from("user_settings").upsert({ user_id: user.id, active_unit_id: key }, { onConflict: "user_id" });
  }

  function switchUnit() {
    playTick();
    setActiveUnitId(null);
    if (user) supabase.from("user_settings").upsert({ user_id: user.id, active_unit_id: null }, { onConflict: "user_id" });
  }
  const [soundsOn, setSoundsOn] = useState(true);
  const [historyFilter, setHistoryFilter] = useState("all"); // all | study | quiz
  useEffect(() => { setSoundsOn(getSoundsEnabled()); }, []);

  // topic modal
  const [openTopicId, setOpenTopicId] = useState(null);
  const [openedFromStudy, setOpenedFromStudy] = useState(false);
  const [understanding, setUnderstanding] = useState("");
  const [confidence, setConfidence] = useState(3);
  const [qcm, setQcm] = useState("");
  const [studyMinutes, setStudyMinutes] = useState("");
  const [note, setNote] = useState("");
  const [selectedTypes, setSelectedTypes] = useState(new Set());

  // schedule form
  const [startDate, setStartDate] = useState("");
  const [durationValue, setDurationValue] = useState("");
  const [durationUnit, setDurationUnit] = useState("weeks");
  const [targetPasses, setTargetPasses] = useState(5);
  const [maxModulesPerDay, setMaxModulesPerDay] = useState(2);
  const [maxNewPerModulePerDay, setMaxNewPerModulePerDay] = useState(2);
  const [maxReviewPerModulePerDay, setMaxReviewPerModulePerDay] = useState(3);
  const [dayPriority, setDayPriority] = useState({ 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 });

  // toast
  const [toast, setToast] = useState(null);
  function showToast(msg) {
    if (msg.includes("🎉") || msg.toLowerCase().includes("mastered")) playMilestone();
    else if (msg.includes("−1")) playPing();
    else playSuccess();
    setToast(msg);
    setTimeout(() => setToast(null), 1600);
  }

  // reset modal
  const [showResetModal, setShowResetModal] = useState(false);

  // display name
  const [displayName, setDisplayName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  useEffect(() => {
    // Skip until the real theme has loaded from Supabase — otherwise this
    // fires immediately on mount with the "dark"/"dark" defaults, flashing
    // Midnight Pulse over whatever theme the previous page correctly had
    // applied, right before the real value overwrites it a moment later.
    if (!theme || !colorMode) return;
    document.documentElement.className = `mode-${colorMode}`;
    applyAccentVars(palette || "coral", colorMode);
  }, [theme, colorMode, palette]);

  // Sidebar collapse is a pure UI preference (not tied to the account),
  // shared across Study/Habits/QBank via localStorage so it stays
  // consistent as you move between them.
  useEffect(() => {
    try { setSidebarCollapsed(localStorage.getItem("sidebar_collapsed") === "true"); } catch (e) { /* ignore */ }
  }, []);
  function toggleSidebar() {
    setSidebarCollapsed((v) => {
      const next = !v;
      try { localStorage.setItem("sidebar_collapsed", String(next)); } catch (e) { /* ignore */ }
      return next;
    });
  }

  const loadEverything = useCallback(async (uid) => {
    const [{ data: rows }, { data: st }, { data: practice }, { data: flashSessions }, { data: cfg }] = await Promise.all([
      supabase.from("topic_progress").select("*").eq("user_id", uid),
      supabase.from("user_settings").select("*").eq("user_id", uid).maybeSingle(),
      supabase.from("practice_history").select("*").eq("user_id", uid),
      supabase.from("flashcard_sessions").select("*").eq("user_id", uid).in("status", ["completed", "abandoned"]),
      supabase.from("app_config").select("coming_soon_units").eq("id", true).maybeSingle(),
    ]);
    setAllProgressRows(rows || []);
    setAllPracticeHistory(practice || []);
    setAllFlashcardSessions(flashSessions || []);
    setSettings(st || null);
    setComingSoonUnits(cfg?.coming_soon_units || []);
    setActiveUnitId(st?.active_unit_id || null);
    setTheme(st?.theme || "dark");
    setColorMode(st?.color_mode || "dark");
    setPalette(st?.palette || "coral");
    if (st?.display_name) setDisplayName(st.display_name);
    if (st?.start_date) setStartDate(st.start_date);
    if (st?.duration_value) setDurationValue(st.duration_value);
    if (st?.duration_unit) setDurationUnit(st.duration_unit);
    if (st?.target_passes) setTargetPasses(st.target_passes);
    if (st?.max_modules_per_day) setMaxModulesPerDay(st.max_modules_per_day);
    if (st?.max_new_per_module_per_day) setMaxNewPerModulePerDay(st.max_new_per_module_per_day);
    if (st?.max_review_per_module_per_day) setMaxReviewPerModulePerDay(st.max_review_per_module_per_day);
    if (st?.day_priority) setDayPriority(st.day_priority);
    setLoading(false);
  }, [supabase]);

  // QBank and Flashcards are self-contained components that write directly
  // to Supabase (topic_progress via "Log a pass", flashcard_sessions on
  // completion) — they have no shared React state with Study's own
  // allProgressRows/allFlashcardSessions, so without this, a pass logged
  // from QBank would sit correctly in the database but the Tracker/Stats
  // tabs would keep showing stale cached data until a full page reload.
  const refreshProgressAndSessions = useCallback(async () => {
    if (!user) return;
    const [{ data: rows }, { data: practice }, { data: flashSessions }] = await Promise.all([
      supabase.from("topic_progress").select("*").eq("user_id", user.id),
      supabase.from("practice_history").select("*").eq("user_id", user.id),
      supabase.from("flashcard_sessions").select("*").eq("user_id", user.id).in("status", ["completed", "abandoned"]),
    ]);
    setAllProgressRows(rows || []);
    setAllPracticeHistory(practice || []);
    setAllFlashcardSessions(flashSessions || []);
  }, [supabase, user]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace("/login"); return; }
      setUser(session.user);
      // Fire-and-forget: ensures a settings row exists for later writes,
      // but loadEverything below does its own SELECT on user_settings in
      // parallel, so there's no need to block rendering on this upsert
      // finishing first — it used to add a full extra network round-trip
      // to every navigation into Study before any data even started loading.
      supabase.from("user_settings").upsert({ user_id: session.user.id }, { onConflict: "user_id" });
      loadEverything(session.user.id);
    });
  }, [supabase, router, loadEverything]);

  async function saveDisplayName() {
    if (!user || !nameDraft.trim()) { setEditingName(false); return; }
    const name = nameDraft.trim();
    setDisplayName(name);
    setEditingName(false);
    await supabase.from("user_settings").upsert({ user_id: user.id, display_name: name }, { onConflict: "user_id" });
  }

  function getTopicRow(id) {
    return progress[id] || { topic_id: id, understanding: null, confidence: 3, qcm: null, qcm_count: null, note: "", passes: 0, entries: [], history: [], calibration_adj: 0, review_flag: false };
  }

  // Dismisses a QBank confidence-mismatch flag from the Tracker tab —
  // the flag itself doesn't affect the mastery number going forward
  // (that's baked into calibration_adj already), it's just a "you should
  // look at this again" marker the person can clear once they have.
  async function dismissReviewFlag(topicId) {
    if (!user) return;
    const { data, error } = await supabase.from("topic_progress").update({ review_flag: false }).eq("user_id", user.id).eq("unit_id", activeUnitId).eq("topic_id", topicId).select().single();
    if (!error && data) upsertProgressRow(data);
  }

  function openTopic(id, fromStudy = false) {
    playSwishOpen();
    const t = getTopicRow(id);
    setOpenTopicId(id);
    setUnderstanding(t.understanding ?? "");
    setConfidence(t.confidence || 3);
    setQcm(t.qcm ?? "");
    setStudyMinutes("");
    setNote(t.note || "");
    setSelectedTypes(new Set());
    setOpenedFromStudy(fromStudy);
  }
  function closeModal() { playSwishClose(); setOpenTopicId(null); }
  function toggleType(key) {
    playTick();
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  // fires a bigger burst + toast the moment a topic's passes reach the
  // configured mastery target — a "Level 3" moment per the motion hierarchy
  function celebrateIfMastered(newPasses) {
    const target = settings?.target_passes || 5;
    if (newPasses === target) {
      const cx = typeof window !== "undefined" ? window.innerWidth / 2 : 0;
      const cy = typeof window !== "undefined" ? window.innerHeight / 3 : 0;
      spawnThemeBurst(cx, cy, theme);
      setTimeout(() => spawnThemeBurst(cx - 40, cy + 20, theme), 120);
      setTimeout(() => spawnThemeBurst(cx + 40, cy + 20, theme), 220);
      showToast("🎉 Topic mastered!");
      return true;
    }
    return false;
  }

  // Standalone, self-directed pass logging — its own tool in the Study
  // hub (alongside Timer and QBank), not tied to the Tracker's topic
  // modal at all. For progress that happened somewhere the app can't see
  // (e.g. studied from a book).
  async function addPassOnYourOwn(topicId, delta) {
    if (!topicId || !user) return;
    const current = getTopicRow(topicId);
    const newPasses = Math.max(0, (current.passes || 0) + delta);
    const newHistory = [{ date: new Date().toISOString(), action: delta > 0 ? "pass" : "pass removed", value: newPasses }, ...(current.history || [])].slice(0, 500);
    const payload = { user_id: user.id, unit_id: activeUnitId, topic_id: topicId, passes: newPasses, history: newHistory };
    const { data, error } = await supabase.from("topic_progress").upsert(payload, { onConflict: "user_id,unit_id,topic_id" }).select().single();
    if (!error && data) {
      upsertProgressRow(data);
      if (delta > 0 && !celebrateIfMastered(newPasses)) showToast("Pass +1");
      else if (delta < 0) showToast("Pass −1");
    } else {
      console.error("topic_progress upsert failed:", error);
      showToast("⚠️ Couldn't save: " + (error?.message || "unknown error"));
    }
  }

  // called when a Study-page timer session ends: adds a pass, logs the
  // minutes studied, then opens the same modal used for manual logging so
  // the person can add understanding/QCM/notes for that session.
  async function finishStudySession(topicId, minutes) {
    if (!user) return;
    const current = getTopicRow(topicId);
    const newPasses = (current.passes || 0) + 1;
    const newHistory = [
      { date: new Date().toISOString(), action: "study session", value: minutes },
      { date: new Date().toISOString(), action: "pass", value: newPasses },
      ...(current.history || []),
    ].slice(0, 500);
    const payload = { user_id: user.id, unit_id: activeUnitId, topic_id: topicId, passes: newPasses, history: newHistory };
    const { data, error } = await supabase.from("topic_progress").upsert(payload, { onConflict: "user_id,unit_id,topic_id" }).select().single();
    if (!error && data) {
      upsertProgressRow(data);
      setTab("tracker");
      openTopic(topicId, true);
      setNote((n) => n || `Studied ${minutes} min.`);
      if (!celebrateIfMastered(newPasses)) showToast(`Pass +1 · ${minutes} min logged`);
    } else {
      console.error("topic_progress upsert failed:", error);
      showToast("⚠️ Couldn't save: " + (error?.message || "unknown error"));
    }
  }

  async function saveTopic() {
    if (!openTopicId || !user) return;
    const current = getTopicRow(openTopicId);
    const minutesVal = studyMinutes === "" ? null : Math.max(0, Math.round(Number(studyMinutes)));
    const entry = {
      date: new Date().toISOString(),
      understanding: understanding === "" ? null : Number(understanding),
      confidence: Number(confidence),
      qcm: qcm === "" ? null : Number(qcm),
      minutes: minutesVal,
      note, types: Array.from(selectedTypes),
    };
    const newEntries = [...(current.entries || []), entry];
    const newHistory = [
      { date: entry.date, action: "assessment", value: true },
      ...(minutesVal ? [{ date: entry.date, action: "study session", value: minutesVal }] : []),
      ...(current.history || []),
    ].slice(0, 500);
    const payload = {
      user_id: user.id, unit_id: activeUnitId, topic_id: openTopicId,
      understanding: entry.understanding, confidence: entry.confidence,
      qcm: entry.qcm, note,
      passes: current.passes || 0, entries: newEntries, history: newHistory,
    };
    // A genuinely good score clears any lingering "needs review" flag —
    // it doesn't need to come from a perfect mastery, just comfortably
    // above the threshold that would trigger the flag in the first place.
    const prospectiveMastery = calcMastery({ understanding: entry.understanding, qcm: entry.qcm, calibration_adj: current.calibration_adj || 0 });
    if (prospectiveMastery != null && prospectiveMastery >= 70) payload.review_flag = false;
    const { data, error } = await supabase.from("topic_progress").upsert(payload, { onConflict: "user_id,unit_id,topic_id" }).select().single();
    if (!error && data) {
      upsertProgressRow(data);
      setSelectedTypes(new Set());
      showToast("Entry logged");
      closeModal();
    } else {
      console.error("topic_progress upsert failed:", error);
      showToast("⚠️ Couldn't save: " + (error?.message || "unknown error"));
    }
  }

  async function saveScheduleSettings(e) {
    e.preventDefault();
    if (!user) return;
    const payload = {
      user_id: user.id,
      start_date: startDate || null,
      duration_value: durationValue ? Number(durationValue) : null,
      duration_unit: durationUnit,
    };
    await supabase.from("user_settings").upsert(payload, { onConflict: "user_id" });
    setSettings((s) => ({ ...s, ...payload }));
    showToast("Saved");
  }

  function exportData() {
    const blob = new Blob([JSON.stringify({ progress, settings }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "cardio-respiratory-study-data.json";
    a.click();
    URL.revokeObjectURL(a.href);
    showToast("Exported");
  }

  async function confirmReset() {
    if (!user) return;
    await supabase.from("topic_progress").delete().eq("user_id", user.id).eq("unit_id", activeUnitId);
    await supabase.from("practice_history").delete().eq("user_id", user.id).eq("unit_id", activeUnitId);
    await supabase.from("qbank_attempts").delete().eq("user_id", user.id).eq("unit_id", activeUnitId);
    await supabase.from("user_settings").upsert({
      user_id: user.id, theme: theme, start_date: null, duration_value: null, duration_unit: "weeks",
      target_passes: 5, max_modules_per_day: 2, max_new_per_module_per_day: 2, max_review_per_module_per_day: 3,
      day_priority: { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 }, schedule_data: null,
    }, { onConflict: "user_id" });
    setAllProgressRows((rows) => rows.filter((r) => r.unit_id !== activeUnitId));
    setAllPracticeHistory((rows) => rows.filter((r) => r.unit_id !== activeUnitId));
    setSettings((s) => (s ? { ...s, start_date: null, duration_value: null, duration_unit: "weeks", target_passes: 5, max_modules_per_day: 2, max_new_per_module_per_day: 2, max_review_per_module_per_day: 3, day_priority: { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 }, schedule_data: null } : s));
    setStartDate(""); setDurationValue(""); setDurationUnit("weeks");
    setTargetPasses(5); setMaxModulesPerDay(2); setMaxNewPerModulePerDay(2); setMaxReviewPerModulePerDay(3);
    setDayPriority({ 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 });
    setShowResetModal(false);
    showToast("Tracker reset");
  }

  async function logOut() { await supabase.auth.signOut(); router.replace("/login"); }

  function handleWrapClick(e) {
    if (e.target.closest("button, input, select, textarea, a, .card")) return;
    spawnThemeBurst(e.clientX, e.clientY, theme);
  }

  if (loading) {
    return null;
  }

  const isAdmin = user?.email === ADMIN_EMAIL;

  async function toggleComingSoon(unitId) {
    if (!isAdmin) return;
    const next = comingSoonUnits.includes(unitId)
      ? comingSoonUnits.filter((k) => k !== unitId)
      : [...comingSoonUnits, unitId];
    setComingSoonUnits(next); // optimistic
    const { error } = await supabase.from("app_config").update({ coming_soon_units: next }).eq("id", true);
    if (error) {
      console.error("toggleComingSoon failed:", error);
      setComingSoonUnits(comingSoonUnits); // revert
      showToast("Couldn't update — check app_config migration is applied");
    }
  }

  if (!activeUnitId) {
    return (
      <UnitPicker
        allProgressRows={allProgressRows}
        onChoose={chooseUnit}
        premiumUnits={isAdmin ? ["all"] : (settings?.premium_units || [])}
        comingSoonUnits={comingSoonUnits}
        isAdmin={isAdmin}
        onToggleComingSoon={toggleComingSoon}
        onRedeemed={(unitId) => {
          setSettings((s) => ({
            ...(s || {}),
            premium_units: Array.from(new Set([...(s?.premium_units || []), unitId])),
          }));
        }}
      />
    );
  }

  // ---- derived stats ----
  // Flat list of every logged study session (timer-finished or manually
  // entered minutes), each a real data point: { date, minutes, subject }.
  // This is what Study Time Trends is calculated from — no text parsing.
  const studySessions = [];
  TOPICS.forEach((x) => {
    (progress[x.id]?.history || []).forEach((h) => {
      if (h.action === "study session" && h.value > 0) {
        studySessions.push({ date: h.date, minutes: h.value, subject: x.subject, subjectKey: x.subjectKey });
      }
    });
  });
  // Single-topic QBank practice/exam runs are already counted above once
  // their minutes land in topic_progress's "study session" history (via
  // the "log a pass" popup). Multi-topic/whole-unit/whole-subject runs
  // never touch topic_progress at all though — their minutes only ever
  // exist in practice_history — so pull those in here too, or their time
  // silently never shows up in trends. No subject attribution is
  // possible for these (they span more than one topic), so they only
  // affect the daily/weekly totals, not the "by subject" breakdown.
  const activeUnitName = UNITS.find((u) => u.key === activeUnitId)?.name || null;
  const activeUnitSubtitle = UNITS.find((u) => u.key === activeUnitId)?.subtitle || "";

  // Topics with a *fully completed* flashcard session today count toward
  // "today's session done" — abandoned sessions don't, per spec.
  const flashcardDoneTopicIdsToday = new Set(
    allFlashcardSessions
      .filter((s) => s.status === "completed" && s.unit_id === activeUnitId && s.completed_at && dayKey(new Date(s.completed_at)) === dayKey(new Date()))
      .map((s) => s.topic_id)
  );

  allPracticeHistory.forEach((h) => {
    if (h.topic_id) return; // single-topic runs are covered via topic_progress above
    if (!h.minutes_spent || h.minutes_spent <= 0) return;
    if (activeUnitName && h.scope_label && !h.scope_label.startsWith(activeUnitName)) return;
    studySessions.push({ date: h.created_at, minutes: h.minutes_spent, subject: null, subjectKey: null });
  });
  // Flashcard sessions count toward time trends too (completed or
  // abandoned — time actually spent studying counts either way), even
  // though they never touch topic_progress or mastery.
  allFlashcardSessions.forEach((s) => {
    if (s.unit_id !== activeUnitId) return;
    const minutes = Math.round((s.seconds_spent || 0) / 60);
    if (minutes <= 0) return;
    const t = TOPICS.find((x) => x.id === s.topic_id);
    studySessions.push({ date: s.completed_at || s.updated_at, minutes, subject: t?.subject || null, subjectKey: t?.subjectKey || null });
  });

  const topicCount = TOPICS.length;
  const doneCount = TOPICS.filter((t) => { const p = progress[t.id]; return p && ((p.entries?.length > 0) || p.passes > 0); }).length;
  const masteryVals = TOPICS.map((t) => calcMastery(progress[t.id])).filter((v) => v != null);
  const avgMastery = masteryVals.length ? Math.round(masteryVals.reduce((a, b) => a + b, 0) / masteryVals.length) : null;

  const qcmVals = TOPICS.map((t) => progress[t.id]?.qcm).filter((v) => v != null);
  const qcmAvg = qcmVals.length ? Math.round(qcmVals.reduce((a, b) => a + b, 0) / qcmVals.length) : null;
  const qcmScoredCount = qcmVals.length;

  let deadlineDate = null, daysLeft = "—";
  if (settings?.start_date && settings?.duration_value) {
    const days = settings.duration_unit === "days" ? settings.duration_value : settings.duration_value * 7;
    const start = new Date(settings.start_date + "T00:00:00");
    deadlineDate = new Date(start); deadlineDate.setDate(start.getDate() + days - 1);
    daysLeft = Math.max(0, Math.ceil((deadlineDate - new Date()) / 86400000));
  }

  // If a smart weekly schedule is active, figure out which topics it has
  // slotted for today (recomputed live, same as the Schedule tab). Used
  // below to keep Today's Priorities focused — but overdue/flagged topics
  // always count as due regardless of whether they made it into today's
  // capped slots, since those are exactly the ones that should be
  // rescheduled ASAP.
  let scheduleTodayIds = null;
  // Which topics are actually scheduled for today, from whichever plan is
  // active — smart (weekly, capped) or manual (placed by hand). Full
  // schedule items (not just topic ids), so each carries its real pass
  // target — needed for "done" status on the Study hub's Today's sessions.
  let todaysSessions = [];
  const smartCfg = settings?.schedule_data?.mode !== "manual" && settings?.schedule_data?.generated ? settings?.schedule_data?.smartSubjects : null;
  if (smartCfg && Object.keys(smartCfg).length) {
    const weekStart = smartWeekStart(settings?.start_date);
    const progressByTopicId = {};
    TOPICS.forEach((x) => { progressByTopicId[x.id] = getTopicRow(x.id); });
    const todayIdx = Math.floor((new Date().setHours(0, 0, 0, 0) - weekStart.getTime()) / 86400000);
    const weekPlan = buildWeekPlan(weekStart, smartCfg, settings.day_priority || DEFAULT_DAY_PRIORITY, TOPICS, progressByTopicId, settings.target_passes || 5, todayIdx);
    const todayItems = weekPlan.schedule[todayIdx] || [];
    scheduleTodayIds = new Set(todayItems.map((it) => it.id));
    todaysSessions = todayItems;
  } else if (settings?.schedule_data?.mode === "manual" && settings?.schedule_data?.manualConfirmed && settings?.start_date) {
    const manualStart = new Date(settings.start_date + "T00:00:00");
    const manualTodayIdx = Math.round((new Date().setHours(0, 0, 0, 0) - manualStart.getTime()) / 86400000);
    const manualPlan = settings.schedule_data.manualPlan || {};
    const todayIds = manualPlan[manualTodayIdx] || [];
    todaysSessions = todayIds.map((id) => {
      const t = TOPICS.find((x) => x.id === id);
      if (!t) return null;
      // this topic's Nth placement so far (occurrences on or before today) doubles as its pass number
      let occ = 0;
      Object.entries(manualPlan).forEach(([dayStr, ids]) => {
        if (Number(dayStr) <= manualTodayIdx && (ids || []).includes(id)) occ++;
      });
      return { ...t, pass: occ, total: occ };
    }).filter(Boolean);
  }

  // history feed (entries + pass changes + quiz/QBank runs + flashcard
  // sessions), newest first. "bucket" drives the Study/Quiz/Flashcards
  // filter — separate from "kind", which still drives how each row
  // renders. A self-logged entry tagged QCM practice counts as quiz
  // activity for filtering purposes even though it's stored as a
  // regular topic entry, not a QBank practice_history row.
  function topicNameFor(topicId) { return TOPICS.find((t) => t.id === topicId)?.name || topicId; }
  const historyItems = [];
  TOPICS.forEach((x) => {
    const t = getTopicRow(x.id);
    (t.entries || []).forEach((e) => historyItems.push({ date: e.date, kind: "entry", topic: x.name, bucket: (e.types || []).includes("qcm") ? "quiz" : "study", ...e }));
    (t.history || []).forEach((h) => {
      if (h.action === "pass" || h.action === "pass removed") historyItems.push({ date: h.date, kind: "pass", topic: x.name, bucket: "study", value: h.value, removed: h.action === "pass removed" });
    });
  });
  allPracticeHistory.forEach((h) => {
    historyItems.push({ date: h.created_at, kind: "quiz", bucket: "quiz", topic: h.scope_label || "QBank practice", correct: h.correct, total: h.total, pct: h.pct, minutes: h.minutes_spent, status: h.status || "completed" });
  });
  allFlashcardSessions.forEach((s) => {
    const cardState = s.card_state || [];
    const mastered = cardState.filter((c) => c.label === "easy").length;
    historyItems.push({
      date: s.completed_at || s.updated_at, kind: "flashcards", bucket: "flashcards",
      topic: topicNameFor(s.topic_id), mastered, total: cardState.length,
      status: s.status, minutes: s.seconds_spent ? Math.round(s.seconds_spent / 60) : 0,
    });
  });
  historyItems.sort((a, b) => new Date(b.date) - new Date(a.date));

  // streak calc
  const activeDays = new Set();
  TOPICS.forEach((x) => (getTopicRow(x.id).history || []).forEach((h) => activeDays.add(dayKey(new Date(h.date)))));
  const sortedDays = Array.from(activeDays).sort();
  let longest = sortedDays.length ? 1 : 0, run = 1;
  for (let i = 1; i < sortedDays.length; i++) {
    const diff = Math.round((new Date(sortedDays[i]) - new Date(sortedDays[i - 1])) / 86400000);
    run = diff === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  let current = 0;
  const todayKey = dayKey(new Date()), yestKey = dayKey(new Date(Date.now() - 86400000));
  if (activeDays.has(todayKey) || activeDays.has(yestKey)) {
    let cursor = activeDays.has(todayKey) ? new Date() : new Date(Date.now() - 86400000);
    while (activeDays.has(dayKey(cursor))) { current++; cursor = new Date(cursor.getTime() - 86400000); }
  }

  const now = new Date();
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay()); weekStart.setHours(0, 0, 0, 0);
  let thisWeekCount = 0;
  TOPICS.forEach((x) => (getTopicRow(x.id).history || []).forEach((h) => { if (new Date(h.date) >= weekStart) thisWeekCount++; }));

  const openTopicMeta = openTopicId ? TOPICS.find((t) => t.id === openTopicId) : null;
  const openTopicRow = openTopicId ? getTopicRow(openTopicId) : null;

  return (
    <>
      <svg className="stitch-rainbows" aria-hidden="true" viewBox="0 0 1200 1600" preserveAspectRatio="none">
        <path className="rb-line rb-1" d="M-100,150 C 250,50 450,300 800,180 S 1350,50 1500,220" fill="none" strokeLinecap="round" />
        <path className="rb-line rb-2" d="M-150,500 C 200,650 500,380 850,560 S 1300,700 1500,520" fill="none" strokeLinecap="round" />
        <path className="rb-line rb-3" d="M-100,950 C 300,800 550,1080 900,900 S 1350,780 1500,980" fill="none" strokeLinecap="round" />
        <path className="rb-line rb-4" d="M-150,1350 C 250,1500 500,1220 850,1400 S 1300,1550 1500,1350" fill="none" strokeLinecap="round" />
      </svg>
      <svg className="decor-flower" style={{ top: 6, left: 76, width: 30 }} viewBox="0 0 24 24" fill="var(--pink)"><path d="M12 0c1 3.5-1.5 5-1.5 8.5C10.5 11 12 12 12 12s1.5-1 1.5-3.5C13.5 5 11 3.5 12 0zM12 24c-1-3.5 1.5-5 1.5-8.5C13.5 13 12 12 12 12s-1.5 1-1.5 3.5C10.5 19 13 20.5 12 24zM0 12c3.5-1 5 1.5 8.5 1.5C11 13.5 12 12 12 12s-1-1.5-3.5-1.5C5 10.5 3.5 13 0 12zM24 12c-3.5 1-5-1.5-8.5-1.5C13 10.5 12 12 12 12s1 1.5 3.5 1.5C19 13.5 20.5 11 24 12z" /></svg>
      <svg className="decor-flower" style={{ top: 90, right: 24, width: 22 }} viewBox="0 0 24 24" fill="var(--orange)"><path d="M12 0c1 3.5-1.5 5-1.5 8.5C10.5 11 12 12 12 12s1.5-1 1.5-3.5C13.5 5 11 3.5 12 0zM12 24c-1-3.5 1.5-5 1.5-8.5C13.5 13 12 12 12 12s-1.5 1-1.5 3.5C10.5 19 13 20.5 12 24zM0 12c3.5-1 5 1.5 8.5 1.5C11 13.5 12 12 12 12s-1-1.5-3.5-1.5C5 10.5 3.5 13 0 12zM24 12c-3.5 1-5-1.5-8.5-1.5C13 10.5 12 12 12 12s1 1.5 3.5 1.5C19 13.5 20.5 11 24 12z" /></svg>
      <AppShell
        active={activeNav || (tab === "dashboard" || tab === "log" ? "stats" : tab === "schedule" ? "plan" : tab)}
        onTabChange={handleNavTabChange}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={toggleSidebar}
        onBack={switchUnit}
        backLabel="Switch"
        onLogout={logOut}
        onExport={exportData}
        onReset={() => setShowResetModal(true)}
        themeProps={{ supabase, userId: user?.id, colorMode, accent: palette, onThemeChange: ({ colorMode: c, accent: a }) => { if (c !== undefined) setColorMode(c); if (a !== undefined) setPalette(a); } }}
        onShellClick={handleWrapClick}
        isAdmin={isAdmin}
      >
          <PageHeader
            eyebrow={
              tab === "tracker" ? "Curriculum Tracker" :
              tab === "dashboard" || tab === "log" ? "Analytics & Activity" :
              tab === "library" || tab === "qbank" || tab === "flashcards" ? "Study Library" :
              tab === "schedule" ? "Study Planner" :
              tab === "access" ? "Administration" :
              tab === "settings" ? "Preferences & Account" :
              activeUnitSubtitle
            }
            title={
              tab === "tracker" ? `${activeUnitName} Topics` :
              tab === "dashboard" || tab === "log" ? `${activeUnitName} Stats & History` :
              tab === "library" || tab === "qbank" || tab === "flashcards" ? `${activeUnitName} Library` :
              tab === "schedule" ? "Schedule & Calendar" :
              tab === "access" ? "Access Codes" :
              tab === "settings" ? "Settings" :
              activeUnitName
            }
            subtitle={
              tab === "tracker" ? `${topicCount} topics · ${doneCount} first passes completed` :
              tab === "dashboard" || tab === "log" ? "Coverage, estimated mastery, study streak, and activity history" :
              tab === "library" || tab === "qbank" || tab === "flashcards" ? "Question bank and spaced repetition flashcards" :
              tab === "schedule" ? "Weekly plan, deadlines, and spaced review recommendations" :
              tab === "access" ? "Manage student access codes and registrations" :
              tab === "settings" ? "Appearance, audio feedback, study targets, and account data" :
              `${topicCount} topics · ${doneCount} first passes · ${daysLeft} days remaining`
            }
          />



          <div className="tv-content">
            <div key={tab} className="tab-transition">

        {tab === "study" && (
          <StudyHub key={handoffKey} onOpenTimer={() => goTab("timer")} onOpenQBank={() => { setLibrarySection("qbank"); goTab("library"); }} onOpenFlashcards={() => { setLibrarySection("flashcards"); goTab("library"); }} onOpenAddPass={() => goTab("addpass")} todaysSessions={todaysSessions} progress={progress} onStudyNow={studyNowFor} targetPasses={settings?.target_passes || 5} initialToolsTopicId={toolsHandoffTopicId} flashcardDoneSet={flashcardDoneTopicIdsToday} />
        )}

        {tab === "timer" && (
          <StudyPage
            topics={TOPICS}
            data={UNIT_DATA}
            onBack={() => goTab("study")}
            onFinish={finishStudySession}
            initialTopicId={pendingTopicId}
          />
        )}

        {tab === "addpass" && (
          <AddPassPage
            topics={TOPICS}
            data={UNIT_DATA}
            progress={progress}
            onBack={() => goTab("study")}
            onAddPass={addPassOnYourOwn}
            initialTopicId={pendingTopicId}
          />
        )}

        {tab === "tracker" && (
          <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
            {[0, 1].map((colIdx) => (
              <div key={colIdx} style={{ flex: "1 1 420px", display: "flex", flexDirection: "column", gap: 20, minWidth: 320 }}>
                {UNIT_DATA.filter((s) => s.col === colIdx).map((s) => {
                  const rows = TOPICS.filter((t) => t.subjectKey === s.key);
                  return (
                    <div key={s.key} className="card stagger-item">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>{s.name}</h2>
                        <span style={{ fontSize: 11, fontFamily: "monospace", background: "color-mix(in srgb, var(--purple) 14%, transparent)", color: "var(--purple)", border: "1px solid color-mix(in srgb, var(--purple) 30%, transparent)", padding: "4px 10px", borderRadius: 20 }}>{rows.length} topics</span>
                      </div>
                      <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 6px" }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: "left", fontSize: 11, textTransform: "uppercase", color: "var(--soft)", padding: "9px 5px", borderBottom: "1px solid var(--panel-border)" }}>Topic</th>
                            <th style={{ fontSize: 11, textTransform: "uppercase", color: "var(--soft)", padding: "9px 5px", borderBottom: "1px solid var(--panel-border)", width: 60 }}>Passes</th>
                            <th style={{ fontSize: 11, textTransform: "uppercase", color: "var(--soft)", padding: "9px 5px", borderBottom: "1px solid var(--panel-border)", width: 60 }}>QCM</th>
                            <th style={{ fontSize: 11, textTransform: "uppercase", color: "var(--soft)", padding: "9px 5px", borderBottom: "1px solid var(--panel-border)", width: 70 }}>Mastery</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r) => {
                            const t = getTopicRow(r.id);
                            const mastery = calcMastery(t);
                            const target = settings?.target_passes || 5;
                            const status = getTopicStatus(t, mastery, target);
                            // Single-hue wash per status, built from that
                            // theme's own semantic color var (--red/--amber/
                            // --green/--soft) so it always stays coherent
                            // with the active theme instead of blending
                            // between two unrelated hues.
                            const mixPct = colorMode === "dark" ? 22 : 14;
                            const rowTint = status
                              ? `color-mix(in srgb, var(--panel-solid) ${100 - mixPct}%, ${status.color} ${mixPct}%)`
                              : "var(--panel-solid)";
                            // Minimal's whole aesthetic is sharp corners
                            // everywhere else in the app — match it here.
                            const cornerR = theme === "minimal" ? 0 : 8;
                            return (
                              <tr key={r.id} style={{ background: rowTint }}>
                                <td style={{ textAlign: "left", padding: "9px 8px 9px 10px", fontSize: 13, borderRadius: `${cornerR}px 0 0 ${cornerR}px` }}>
                                  {r.sub ? "– " : ""}{r.name}
                                  {status && (
                                    <span
                                      onClick={status.key === "review" ? (e) => { e.stopPropagation(); dismissReviewFlag(r.id); } : undefined}
                                      title={status.key === "review" ? "Confidence didn't match your results here, or mastery is low — tap to dismiss" : undefined}
                                      style={{
                                        display: "inline-flex", marginLeft: 7, fontSize: 10.5, fontWeight: 700,
                                        color: status.color, border: `1px solid ${status.color}`, borderRadius: 100,
                                        padding: "1px 7px", verticalAlign: "middle",
                                        cursor: status.key === "review" ? "pointer" : "default",
                                      }}
                                    >
                                      {status.label}
                                    </span>
                                  )}
                                </td>
                                <td style={{ textAlign: "center", padding: "9px 5px" }}><span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{t.passes || 0}</span></td>
                                <td style={{ textAlign: "center", padding: "9px 5px" }}><span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{t.qcm != null ? `${t.qcm}%` : "—"}</span></td>
                                <td style={{ textAlign: "center", padding: "9px 8px", borderRadius: `0 ${cornerR}px ${cornerR}px 0` }}><span style={{ fontSize: 12, fontWeight: 700, color: masteryColor(mastery) }}>{mastery == null ? "—" : `${mastery}%`}</span></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {(tab === "dashboard" || tab === "log") && (
          <div style={{ display: "grid", gap: 20 }}>
            <div className="tv-stat-row" style={{ gridTemplateColumns: "repeat(4, minmax(160px, 1fr))", margin: 0 }}>
              <div className="card stagger-item">
                <div style={{ fontSize: 12.5, color: "var(--soft)", textTransform: "uppercase", letterSpacing: 1 }}>Coverage</div>
                <div style={{ fontSize: 36, fontWeight: 800, marginTop: 4 }}><AnimatedNumber value={topicCount ? Math.round((doneCount / topicCount) * 100) : 0} suffix="%" /></div>
                <div className="tv-progress" style={{ marginTop: 10 }}>
                  <div className="tv-progress-fill" style={{ width: `${topicCount ? Math.round((doneCount / topicCount) * 100) : 0}%` }} />
                </div>
              </div>
              <div className="card stagger-item">
                <div style={{ fontSize: 12.5, color: "var(--soft)", textTransform: "uppercase", letterSpacing: 1 }}>Estimated mastery</div>
                <div style={{ fontSize: 36, fontWeight: 800, marginTop: 4 }}>{avgMastery == null ? <span className="stat-number">—</span> : <AnimatedNumber value={avgMastery} suffix="%" />}</div>
                <div className="tv-progress" style={{ marginTop: 10 }}>
                  <div className="tv-progress-fill" style={{ width: `${avgMastery ?? 0}%` }} />
                </div>
              </div>
              <div className="card stagger-item">
                <div style={{ fontSize: 12.5, color: "var(--soft)", textTransform: "uppercase", letterSpacing: 1 }}>QCM average</div>
                <div style={{ fontSize: 36, fontWeight: 800, marginTop: 4 }}>{qcmAvg == null ? <span className="stat-number">—</span> : <AnimatedNumber value={qcmAvg} suffix="%" />}</div>
                <div className="tv-progress" style={{ marginTop: 10 }}>
                  <div className="tv-progress-fill" style={{ width: `${qcmAvg ?? 0}%` }} />
                </div>
              </div>
              <div className="card stagger-item">
                <div style={{ fontSize: 12.5, color: "var(--soft)", textTransform: "uppercase", letterSpacing: 1 }}>Study streak</div>
                <div style={{ fontSize: 44, fontWeight: 800, marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}><span key={current} className="streak-bump"><AnimatedNumber value={current} /></span> <span className={`flame ${current === 0 ? "flame-cold" : current >= 7 ? "flame-lit flame-big" : current >= 3 ? "flame-lit" : ""}`}><IconFlame style={{ width: 22, height: 22 }} /></span></div>
                <div style={{ fontSize: 11, color: "var(--soft)", marginTop: 6 }}>Best: {longest} day{longest === 1 ? "" : "s"}</div>
              </div>
            </div>

            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 21, fontWeight: 700 }}>Unit heatmap & study time</h2>
                  <div style={{ fontSize: 12, color: "var(--soft)", marginTop: 2 }}>
                    Activity intensity, daily & weekly study time, and subject breakdown
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "stretch" }}>
                <div style={{ flex: "1 1 420px", minWidth: 0 }}>
                  <Heatmap settings={settings} topics={TOPICS} progress={progress} />
                </div>
                <div style={{ display: "flex", gap: 14, flex: "1 1 280px" }}>
                  <TodayWidget topics={TOPICS} progress={progress} sessions={studySessions} />
                  <WeekWidget topics={TOPICS} progress={progress} sessions={studySessions} />
                </div>
              </div>

              <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid var(--panel-border)" }}>
                <StudyTimePieChart sessions={studySessions} subjects={UNIT_DATA} />
              </div>
            </div>

            <div id="history" className="card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 4 }}>
                <h2 style={{ margin: 0, fontSize: 21, fontWeight: 700 }}>Study history</h2>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {[{ key: "all", label: "All" }, { key: "study", label: "Study" }, { key: "quiz", label: "Quiz" }, { key: "flashcards", label: "Flashcards" }].map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      data-sound="none"
                      onClick={() => setHistoryFilter(f.key)}
                      style={{
                        fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 100, cursor: "pointer",
                        border: `1px solid ${historyFilter === f.key ? "var(--purple)" : "var(--panel-border)"}`,
                        background: historyFilter === f.key ? "var(--grad-primary)" : "var(--panel-solid)",
                        color: historyFilter === f.key ? "#fff" : "var(--ink)",
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              {(() => {
                const filtered = historyFilter === "all" ? historyItems : historyItems.filter((i) => i.bucket === historyFilter);
                if (filtered.length === 0) return <p style={{ color: "var(--soft)", margin: "14px 0 0" }}>No activity yet.</p>;
                return filtered.slice(0, 50).map((i, idx) => {
                  const dateStr = new Date(i.date).toLocaleDateString("en-US") + " · " + new Date(i.date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
                  if (i.kind === "quiz") {
                    const cls = i.pct >= 80 ? "var(--green)" : i.pct >= 50 ? "var(--amber)" : "var(--red)";
                    return (
                      <div key={idx} style={{ padding: "9px 0", borderBottom: "1px solid var(--panel-border)", fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                            <span style={{ fontSize: 9.5, fontWeight: 700, color: "var(--purple)", background: "color-mix(in srgb, var(--purple) 14%, transparent)", padding: "1px 7px", borderRadius: 20, textTransform: "uppercase" }}>Quiz</span>
                            {i.status === "abandoned" && <span style={{ fontSize: 9.5, fontWeight: 700, color: "var(--red)", background: "color-mix(in srgb, var(--red) 14%, transparent)", padding: "1px 7px", borderRadius: 20, textTransform: "uppercase" }}>Abandoned</span>}
                            <b>{i.topic}</b>
                          </div>
                          <div style={{ fontSize: 11, color: "var(--soft)", fontFamily: "monospace", marginTop: 2 }}>{dateStr}{i.minutes ? ` · ${i.minutes} min` : ""}</div>
                        </div>
                        <div style={{ fontWeight: 800, color: cls, fontSize: 15, whiteSpace: "nowrap" }}>{i.correct}/{i.total} · {i.pct}%</div>
                      </div>
                    );
                  }
                  if (i.kind === "flashcards") {
                    return (
                      <div key={idx} style={{ padding: "9px 0", borderBottom: "1px solid var(--panel-border)", fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                            <span style={{ fontSize: 9.5, fontWeight: 700, color: "var(--amber)", background: "rgba(251,146,60,.14)", padding: "1px 7px", borderRadius: 20, textTransform: "uppercase" }}>Flashcards</span>
                            {i.status === "abandoned" && <span style={{ fontSize: 9.5, fontWeight: 700, color: "var(--red)", background: "color-mix(in srgb, var(--red) 14%, transparent)", padding: "1px 7px", borderRadius: 20, textTransform: "uppercase" }}>Abandoned</span>}
                            <b>{i.topic}</b>
                          </div>
                          <div style={{ fontSize: 11, color: "var(--soft)", fontFamily: "monospace", marginTop: 2 }}>{dateStr}{i.minutes ? ` · ${i.minutes} min` : ""}</div>
                        </div>
                        <div style={{ fontWeight: 800, color: "var(--amber)", fontSize: 15, whiteSpace: "nowrap" }}>{i.mastered}/{i.total} mastered</div>
                      </div>
                    );
                  }
                  return (
                    <div key={idx} style={{ padding: "9px 0", borderBottom: "1px solid var(--panel-border)", fontSize: 13 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}><b>{i.topic}</b><span style={{ fontSize: 11, color: "var(--soft)", fontFamily: "monospace" }}>{dateStr}</span></div>
                      {i.kind === "pass" ? (
                        <span style={{ color: "var(--soft)" }}>{i.removed ? "Pass removed" : "Pass logged"} — now at {i.value}</span>
                      ) : (
                        <>
                          {i.types?.length ? <div style={{ color: "var(--purple)", fontWeight: 600, fontSize: 12 }}>{i.types.map((tk) => TYPES.find((ty) => ty.key === tk)?.label || tk).join(", ")}</div> : null}
                          <div style={{ color: "var(--soft)", fontSize: 12 }}>
                            {i.understanding != null ? `Understanding ${i.understanding}/10 · ` : ""}
                            {i.qcm != null ? `QCM ${i.qcm}% · ` : ""}
                            Confidence {i.confidence || "—"}
                            {i.minutes ? ` · ${i.minutes} min` : ""}
                          </div>
                          {i.note ? <div style={{ fontSize: 12, marginTop: 2 }}>{i.note}</div> : null}
                        </>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {(tab === "library" || tab === "qbank" || tab === "flashcards") && (
          <div>
            <div style={{ display: "inline-flex", gap: 4, padding: 4, borderRadius: 14, background: "var(--panel)", border: "1px solid var(--panel-border)", marginBottom: 20 }}>
              <button
                type="button"
                data-sound="none"
                onClick={() => { playSelect(); setLibrarySection("qbank"); }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 18px",
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 13.5,
                  cursor: "pointer",
                  border: "none",
                  background: librarySection === "qbank" ? "var(--grad-primary)" : "transparent",
                  color: librarySection === "qbank" ? "#fff" : "var(--soft)",
                  boxShadow: librarySection === "qbank" ? "0 2px 8px color-mix(in srgb, var(--purple) 25%, transparent)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                <IconGrid style={{ width: 16, height: 16 }} />
                Question Bank
              </button>

              <button
                type="button"
                data-sound="none"
                onClick={() => { playSelect(); setLibrarySection("flashcards"); }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 18px",
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 13.5,
                  cursor: "pointer",
                  border: "none",
                  background: librarySection === "flashcards" ? "var(--grad-primary)" : "transparent",
                  color: librarySection === "flashcards" ? "#fff" : "var(--soft)",
                  boxShadow: librarySection === "flashcards" ? "0 2px 8px color-mix(in srgb, var(--purple) 25%, transparent)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                <IconLayers style={{ width: 16, height: 16 }} />
                Flashcards
              </button>
            </div>

            {librarySection === "qbank" && (
              <div>
                {isAdmin && (
                  <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
                    {[{ key: "practice", label: "Practice" }, { key: "manage", label: "Manage" }].map((v) => (
                      <button
                        key={v.key}
                        type="button"
                        data-sound="none"
                        onClick={() => setQbankView(v.key)}
                        style={{
                          fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 100, cursor: "pointer",
                          border: `1px solid ${qbankView === v.key ? "var(--purple)" : "var(--panel-border)"}`,
                          background: qbankView === v.key ? "var(--grad-primary)" : "var(--panel-solid)",
                          color: qbankView === v.key ? "#fff" : "var(--ink)",
                        }}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                )}
                {(!isAdmin || qbankView === "practice") && <QBankPracticeTab supabase={supabase} user={user} showToast={showToast} activeUnitId={activeUnitId} onProgressChanged={refreshProgressAndSessions} />}
                {isAdmin && qbankView === "manage" && <QBankManageTab supabase={supabase} user={user} showToast={showToast} />}
              </div>
            )}

            {librarySection === "flashcards" && (
              <div>
                {isAdmin && (
                  <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
                    {[
                      { key: "practice", label: "Practice" },
                      { key: "manage", label: "Manage" },
                    ].map((v) => (
                      <button
                        key={v.key}
                        type="button"
                        data-sound="none"
                        onClick={() => setFlashcardsView(v.key)}
                        style={{
                          fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 100, cursor: "pointer",
                          border: `1px solid ${flashcardsView === v.key ? "var(--purple)" : "var(--panel-border)"}`,
                          background: flashcardsView === v.key ? "var(--grad-primary)" : "var(--panel-solid)",
                          color: flashcardsView === v.key ? "#fff" : "var(--ink)",
                        }}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                )}
                {(!isAdmin || flashcardsView === "practice") && (
                  <FlashcardsPracticeTab supabase={supabase} user={user} unitId={activeUnitId} topics={TOPICS} unitData={UNIT_DATA} showToast={showToast} initialTopicId={flashcardsInitialTopicId} onInitialTopicConsumed={() => setFlashcardsInitialTopicId(null)} onProgressChanged={refreshProgressAndSessions} />
                )}
                {isAdmin && flashcardsView === "manage" && (
                  <FlashcardsManageTab supabase={supabase} user={user} showToast={showToast} />
                )}
              </div>
            )}
          </div>
        )}

        {tab === "access" && isAdmin && (
          <AccessCodesManage supabase={supabase} showToast={showToast} />
        )}

        {tab === "schedule" && (
          <div style={{ display: "grid", gap: 20 }}>
            <div className="card" style={{ maxWidth: 460 }}>
              <h2 style={{ marginTop: 0 }}>Unit duration</h2>
              <form onSubmit={saveScheduleSettings} style={{ display: "grid", gap: 10 }}>
                <label style={{ fontSize: 11, color: "var(--soft)" }}>Start date</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ padding: 8, borderRadius: 8 }} />
                <label style={{ fontSize: 11, color: "var(--soft)" }}>Duration</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="number" value={durationValue} onChange={(e) => setDurationValue(e.target.value)} style={{ padding: 8, borderRadius: 8, flex: 1 }} />
                  <select value={durationUnit} onChange={(e) => setDurationUnit(e.target.value)} style={{ padding: 8, borderRadius: 8 }}>
                    <option value="days">days</option>
                    <option value="weeks">weeks</option>
                  </select>
                </div>
                {deadlineDate && <p style={{ fontSize: 12, color: "var(--soft)" }}>That&apos;s ending around {deadlineDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.</p>}
                <button className="btn-primary" type="submit">Save</button>
              </form>
            </div>

            <ScheduleBuilder
              settings={settings}
              setSettings={setSettings}
              topics={TOPICS}
              subjectsData={UNIT_DATA}
              progress={progress}
              user={user}
              supabase={supabase}
              targetPasses={settings?.target_passes || 5}
            />
          </div>
        )}

        {tab === "settings" && (
          <SettingsView
            user={user}
            supabase={supabase}
            colorMode={colorMode}
            onThemeChange={({ colorMode: c, accent: a }) => {
              if (c !== undefined) setColorMode(c);
              if (a !== undefined) setPalette(a);
            }}
            activeUnitId={activeUnitId}
            activeUnitName={activeUnitName}
            onSwitchUnit={switchUnit}
            settings={settings}
            setSettings={setSettings}
            onExport={exportData}
            onReset={() => setShowResetModal(true)}
            onLogout={logOut}
            onGoPlan={() => goTab("plan")}
            showToast={showToast}
          />
        )}
            </div>

          </div>
      </AppShell>

      <Modal open={!!openTopicId} onClose={closeModal} variant="overlay" maxWidth={540}>
        <>
            <h2 style={{ marginTop: 0 }}>{openTopicMeta?.name}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><label style={{ fontSize: 11, color: "var(--soft)", display: "block", marginBottom: 4 }}>Self-rated understanding (1–10)</label><select value={understanding} onChange={(e) => setUnderstanding(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 7 }}><option value="">—</option>{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => <option key={n} value={n}>{n}</option>)}</select></div>
              <div><label style={{ fontSize: 11, color: "var(--soft)", display: "block", marginBottom: 4 }}>Confidence (1–5)</label><select value={confidence} onChange={(e) => setConfidence(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 7 }}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</select></div>
              <div><label style={{ fontSize: 11, color: "var(--soft)", display: "block", marginBottom: 4 }}>Latest QCM score (%)</label><input type="number" min="0" max="100" placeholder="optional" value={qcm} onChange={(e) => setQcm(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 7 }} /></div>
              <div><label style={{ fontSize: 11, color: "var(--soft)", display: "block", marginBottom: 4 }}>Minutes studied</label><input type="number" min="0" step="1" placeholder="optional" value={studyMinutes} onChange={(e) => setStudyMinutes(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 7 }} /></div>
            </div>
            <div style={{ margin: "14px 0" }}>
              <label style={{ fontSize: 11, color: "var(--soft)", display: "block", marginBottom: 6 }}>This entry covers</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {TYPES.map((ty) => (
                  <button key={ty.key} type="button" onClick={() => toggleType(ty.key)} data-sound="none" style={{ fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 100, cursor: "pointer", border: "1px solid var(--panel-border)", background: selectedTypes.has(ty.key) ? "var(--grad-primary)" : "var(--panel-solid)", color: selectedTypes.has(ty.key) ? "#fff" : "var(--ink)" }}>{ty.label}</button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "14px 0", padding: "12px 14px", background: "var(--panel)", borderRadius: 9, border: "1px solid var(--panel-border)" }}>
              <div><label style={{ fontSize: 11, color: "var(--soft)", display: "block", marginBottom: 2 }}>Passes completed</label><div style={{ fontSize: 22, fontWeight: 700 }}>{openTopicRow?.passes || 0}</div></div>
              {openedFromStudy && (
                <div style={{ marginLeft: "auto", fontSize: 12, color: "var(--green)" }}>+1 pass already added from this session</div>
              )}
              {!openedFromStudy && (
                <div style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--soft)" }}>Passes are added from Study → <b>Add a pass on your own</b>, the timer, or QBank.</div>
              )}
            </div>
            <label style={{ fontSize: 11, color: "var(--soft)", display: "block", marginBottom: 4 }}>Notes / next action</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. revisit pulmonary pedicles; weak on lymphatic drainage" style={{ width: "100%", minHeight: 75, padding: 9, borderRadius: 8, border: "1px solid var(--panel-border)", background: "var(--panel-solid)", color: "var(--ink)", fontFamily: "inherit" }} />
            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 11, color: "var(--soft)", display: "block", marginBottom: 4 }}>Previous entries (kept automatically — saving never erases these)</label>
              <div style={{ maxHeight: 150, overflow: "auto", border: "1px solid var(--panel-border)", borderRadius: 8, padding: "8px 10px" }}>
                {(openTopicRow?.entries || []).length === 0 && <div style={{ fontSize: 12, color: "var(--soft)" }}>No entries yet — your first Save here will start the log.</div>}
                {(openTopicRow?.entries || []).slice().reverse().map((e, i) => (
                  <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid var(--panel-border)", fontSize: 12 }}>
                    <span style={{ color: "var(--soft)", fontFamily: "monospace" }}>{new Date(e.date).toLocaleDateString("en-US")} {new Date(e.date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                    {e.types?.length ? <span style={{ color: "var(--purple)" }}> · {e.types.join(", ")}</span> : null}
                    <br />
                    {e.understanding != null ? `Understanding ${e.understanding}/10 · ` : ""}
                    {e.qcm != null ? `QCM ${e.qcm}% · ` : ""}
                    Confidence {e.confidence || "—"}
                    {e.note ? <div style={{ fontSize: 11, color: "var(--soft)", marginTop: 2 }}>{e.note}</div> : null}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 15 }}>
              <button onClick={closeModal} style={{ padding: "9px 16px", borderRadius: 100, border: "1px solid var(--panel-border)", background: "var(--panel-solid)", color: "var(--ink)", cursor: "pointer" }}>Cancel</button>
              <button className="btn-primary" onClick={saveTopic}>Save as new entry</button>
            </div>
        </>
      </Modal>

      <Modal open={showResetModal} onClose={() => setShowResetModal(false)} variant="overlay" maxWidth={380}>
        <>
            <h3 style={{ marginTop: 0 }}>Reset tracker?</h3>
            <p style={{ color: "var(--soft)", fontSize: 13 }}>This clears all your topic progress, passes, notes, and schedule settings. This can&apos;t be undone.</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setShowResetModal(false)} style={{ padding: "9px 16px", borderRadius: 100, border: "1px solid var(--panel-border)", background: "var(--panel-solid)", color: "var(--ink)", cursor: "pointer" }}>Cancel</button>
              <button onClick={confirmReset} style={{ padding: "9px 16px", borderRadius: 100, border: "none", background: "var(--red)", color: "#fff", cursor: "pointer", fontWeight: 600 }}>Reset everything</button>
            </div>
        </>
      </Modal>

      <div className={`toast ${toast ? "show" : ""}`}>{toast}</div>
    </>
  );
}

// click-effect bursts, ported from the original file, keyed by theme
// The old per-theme tap-burst effects (flower/spark/stitch confetti,
// one per retired style) are gone now that there's one fixed look —
// spawnThemeBurst always uses the plain pulse ripple, which already
// reads var(--purple)/var(--pink) so it matches day/night mode
// automatically. Kept the function name + call sites unchanged so
// nothing else in this file needed to change.
function spawnThemeBurst(x, y) {
  return spawnPulseRipple(x, y);
}

function spawnFlowerBurst(x, y) {
  const colors = ["#8b5cf6", "#ec4899", "#f59e0b"];
  const FLOWER_PATH = "M12 0c1 3.5-1.5 5-1.5 8.5C10.5 11 12 12 12 12s1.5-1 1.5-3.5C13.5 5 11 3.5 12 0zM12 24c-1-3.5 1.5-5 1.5-8.5C13.5 13 12 12 12 12s-1.5 1-1.5 3.5C10.5 19 13 20.5 12 24zM0 12c3.5-1 5 1.5 8.5 1.5C11 13.5 12 12 12 12s-1-1.5-3.5-1.5C5 10.5 3.5 13 0 12zM24 12c-3.5 1-5-1.5-8.5-1.5C13 10.5 12 12 12 12s1 1.5 3.5 1.5C19 13.5 20.5 11 24 12z";
  for (let i = 0; i < 5; i++) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    const size = 12 + Math.random() * 10;
    svg.setAttribute("width", size); svg.setAttribute("height", size);
    svg.innerHTML = `<path fill="${colors[i % colors.length]}" d="${FLOWER_PATH}"/>`;
    const angle = Math.random() * Math.PI * 2;
    const dist = 28 + Math.random() * 46;
    const dx = (Math.cos(angle) * dist).toFixed(1), dy = (Math.sin(angle) * dist - 18).toFixed(1);
    svg.style.cssText = `position:fixed;left:${x}px;top:${y}px;pointer-events:none;z-index:9999;transition:transform .9s ease-out, opacity .9s ease-out;`;
    document.body.appendChild(svg);
    requestAnimationFrame(() => { svg.style.transform = `translate(${dx}px, ${dy}px) rotate(${Math.random() * 300 - 150}deg)`; svg.style.opacity = "0"; });
    setTimeout(() => svg.remove(), 950);
  }
}

function spawnSparkBurst(x, y) {
  const colors = ["#ff5b35", "#ff5fa2", "#ffab3d"];
  const count = 7;
  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const dist = 24 + Math.random() * 42;
    const dx = (Math.cos(angle) * dist).toFixed(1), dy = (Math.sin(angle) * dist).toFixed(1);
    el.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:6px;height:6px;border-radius:1px;background:${colors[i % colors.length]};pointer-events:none;z-index:9999;transition:transform .55s ease-out, opacity .55s ease-out;transform:rotate(${Math.random() * 90}deg)`;
    document.body.appendChild(el);
    requestAnimationFrame(() => { el.style.transform += ` translate(${dx}px, ${dy}px)`; el.style.opacity = "0"; });
    setTimeout(() => el.remove(), 600);
  }
}

function spawnPulseRipple(x, y) {
  const ring = document.createElement("div");
  ring.style.cssText = `position:fixed;left:${x - 11}px;top:${y - 11}px;width:22px;height:22px;border-radius:50%;border:2.5px solid var(--purple);box-shadow:0 0 14px var(--pink);pointer-events:none;z-index:9999;transition:transform .8s ease-out, opacity .8s ease-out;`;
  document.body.appendChild(ring);
  requestAnimationFrame(() => { ring.style.transform = "scale(2.6)"; ring.style.opacity = "0"; });
  setTimeout(() => ring.remove(), 850);

  const dot = document.createElement("div");
  dot.style.cssText = `position:fixed;left:${x - 3}px;top:${y - 3}px;width:6px;height:6px;border-radius:50%;background:#fff;box-shadow:0 0 10px 3px var(--pink);pointer-events:none;z-index:9999;transition:opacity .55s ease-out;`;
  document.body.appendChild(dot);
  requestAnimationFrame(() => { dot.style.opacity = "0"; });
  setTimeout(() => dot.remove(), 600);
}

function spawnStitchBurst(x, y) {
  const colors = ["#ff6fa8", "#ffcf5c", "#ff9a56", "#8fd6d2"];
  const count = 8;
  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const dist = 26 + Math.random() * 44;
    const size = 5 + Math.random() * 4;
    const rot = Math.random() * 360;
    const dx = (Math.cos(angle) * dist).toFixed(1), dy = (Math.sin(angle) * dist - 14).toFixed(1);
    el.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:${size}px;height:${size}px;border-radius:2px;background:${colors[i % colors.length]};pointer-events:none;z-index:9999;transform:rotate(${rot}deg);transition:transform .85s ease-out, opacity .85s ease-out;`;
    document.body.appendChild(el);
    requestAnimationFrame(() => { el.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg)`; el.style.opacity = "0"; });
    setTimeout(() => el.remove(), 900);
  }
}

const STUDY_SESSION_KEY = "cardio_study_session_v1";

function loadStudySession() {
  try {
    const raw = localStorage.getItem(STUDY_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function saveStudySession(session) {
  try { localStorage.setItem(STUDY_SESSION_KEY, JSON.stringify(session)); } catch {}
}
function clearStudySession() {
  try { localStorage.removeItem(STUDY_SESSION_KEY); } catch {}
}

// Landing screen for the "Study now" CTA. Two views:
//   "sessions" (the default) — just today's scheduled topics, each with a
//     live status and a "Study now" trigger.
//   "tools" — reached only by tapping "Study now" on a specific topic;
//     shows the study tools (Timer/QBank/Add-a-pass), and whichever one is
//     picked carries that topic straight into it.
function StudyHub({ onOpenTimer, onOpenQBank, onOpenFlashcards, onOpenAddPass, todaysSessions = [], progress, onStudyNow, targetPasses = 5, initialToolsTopicId = null, flashcardDoneSet = null }) {
  const [view, setView] = useState(initialToolsTopicId ? "tools" : "sessions");
  const [activeTopicId, setActiveTopicId] = useState(initialToolsTopicId);
  const activeSession = activeTopicId ? todaysSessions.find((s) => s.id === activeTopicId) : null;
  const completedSessions = todaysSessions.filter((session) => isSessionDone(session, progress, flashcardDoneSet));
  const nextSession = todaysSessions.find((session) => !isSessionDone(session, progress, flashcardDoneSet));

  function openTools(topicId) {
    setActiveTopicId(topicId);
    setView("tools");
  }
  function backToSessions() {
    setView("sessions");
    setActiveTopicId(null);
  }

  const TOOLS = [
    {
      key: "timer",
      title: "Study timer",
      desc: "Pick a topic, run the timer, log a pass when you're done.",
      Icon: IconClock,
      onClick: () => (activeTopicId ? onStudyNow(activeTopicId, "timer") : onOpenTimer()),
    },
    {
      key: "qbank",
      title: "QBank",
      desc: "Practice, active recall, or timed exam mode with real MCQs.",
      Icon: IconGrid,
      onClick: () => (activeTopicId ? onStudyNow(activeTopicId, "qbank") : onOpenQBank()),
    },
    {
      key: "flashcards",
      title: "Flashcards",
      desc: "Drill this topic's cards, re-shown until every one hits Easy.",
      Icon: IconLayers,
      onClick: () => (activeTopicId ? onStudyNow(activeTopicId, "flashcards") : onOpenFlashcards()),
    },
    {
      key: "addpass",
      title: "Add a pass on your own",
      desc: "Studied somewhere the app can't see? Log a pass directly.",
      Icon: IconCheck,
      onClick: () => (activeTopicId ? onStudyNow(activeTopicId, "addpass") : onOpenAddPass()),
    },
  ];

  if (view === "tools") {
    return (
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <button onClick={backToSessions} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--soft)", cursor: "pointer", marginBottom: 16, fontSize: 13 }}>
          <IconArrowLeft /> Back
        </button>
        <h2 style={{ margin: "0 0 4px", fontSize: 21, fontWeight: 700 }}>
          {activeSession ? <>Study <span style={{ color: "var(--purple)" }}>{activeSession.name}</span> with…</> : "What do you want to study with?"}
        </h2>
        <div style={{ fontSize: 13, color: "var(--soft)", marginBottom: 20 }}>{activeSession ? "Pick a tool — it'll open straight into this topic." : "More tools are coming — this is the home base for all of them."}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
          {TOOLS.map((tool) => (
            <button
              key={tool.key}
              type="button"
              onClick={tool.onClick}
              data-sound="none"
              className="card"
              style={{ flex: "1 1 260px", textAlign: "left", cursor: "pointer", border: "1px solid var(--panel-border)", display: "flex", flexDirection: "column", gap: 10 }}
            >
              <div style={{ width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--grad-primary)", color: "#fff" }}>
                <tool.Icon style={{ width: 18, height: 18 }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15.5, color: "var(--ink)" }}>{tool.title}</div>
                <div style={{ fontSize: 12.5, color: "var(--soft)", marginTop: 3 }}>{tool.desc}</div>
              </div>
            </button>
          ))}
          <div
            className="card"
            style={{ flex: "1 1 260px", opacity: 0.5, border: "1px dashed var(--panel-border)", display: "flex", flexDirection: "column", gap: 10 }}
          >
            <div style={{ width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--panel)", color: "var(--soft)" }}>
              <IconBolt style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15.5 }}>More coming soon</div>
              <div style={{ fontSize: 12.5, color: "var(--soft)", marginTop: 3 }}>New study tools will show up here.</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // view === "sessions"
  return (
    <div className="today-hub">
      <div className="today-grid">
        <section className="card today-plan-card">
          {todaysSessions.length === 0 ? (
            <div className="today-empty">Nothing is scheduled today. Use the Plan view to build a week, or begin with any study tool.</div>
          ) : (
            <div className="today-session-list">
              {todaysSessions.map((it) => {
              const row = progress[it.id];
              const passes = row?.passes || 0;
              const mastery = calcMastery(row);
              const doneToday = isSessionDone(it, progress, flashcardDoneSet);
              const status = getTopicStatus(row || {}, mastery, targetPasses);
              return (
                <div key={it.id} className={`today-session${doneToday ? " is-complete" : ""}`}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                      <span className="today-session-marker">{doneToday ? "✓" : ""}</span>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{it.sub ? "– " : ""}{it.name}</span>
                    </div>
                    <div>
                      <div style={{ fontSize: 11.5, color: "var(--soft)" }}>{it.subject} · {passes} pass{passes === 1 ? "" : "es"}{mastery != null ? ` · ${mastery}% mastery` : ""}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {doneToday ? <span className="today-status done">Complete</span> : status ? <span className="today-status" style={{ color: status.color }}>{status.label}</span> : null}
                    <button
                      type="button"
                      data-sound="none"
                      onClick={() => openTools(it.id)}
                      className="today-study-link"
                    >
                      {doneToday ? "Review" : "Study"} →
                    </button>
                  </div>
                </div>
              );
              })}
            </div>
          )}
        </section>

        <aside className="today-quick-actions">
          <div className="today-eyebrow">QUICK START</div>
          <h3>How would you like to study?</h3>
          {TOOLS.map((tool) => (
            <button key={tool.key} type="button" data-sound="none" onClick={tool.onClick} className="today-action">
              <span className="today-action-icon"><tool.Icon /></span>
              <span><b>{tool.key === "qbank" ? "Practice questions" : tool.title}</b><small>{tool.key === "qbank" ? "Test your recall" : tool.key === "timer" ? "Focus with a timer" : "Log study you completed"}</small></span>
              <IconArrowRight />
            </button>
          ))}
        </aside>
      </div>
    </div>
  );
}

// Standalone tool for logging a pass on a topic directly, without going
// through the timer or QBank — for progress that happened somewhere the
// app can't see (studied from a book, a lecture, a friend's notes...).
// Lives in the Study hub as its own tool, same tier as Timer/QBank.
function AddPassPage({ topics, data, progress, onBack, onAddPass, initialTopicId }) {
  const initialTopic = initialTopicId ? topics.find((t) => t.id === initialTopicId) : null;
  const [subjectKey, setSubjectKey] = useState(initialTopic?.subjectKey || data[0]?.key || "");
  const [topicId, setTopicId] = useState(initialTopic?.id || "");
  const [saving, setSaving] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const subjectTopics = topics.filter((t) => t.subjectKey === subjectKey);
  const selected = topicId ? topics.find((t) => t.id === topicId) : null;
  const currentPasses = topicId ? (progress[topicId]?.passes || 0) : 0;

  async function handleAdd(delta) {
    if (!topicId || saving) return;
    setSaving(true);
    await onAddPass(topicId, delta);
    setSaving(false);
    if (delta > 0) {
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1400);
    }
  }

  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--soft)", cursor: "pointer", marginBottom: 16, fontSize: 13 }}>
        <IconArrowLeft /> Back
      </button>
      <h2 style={{ margin: "0 0 4px", fontSize: 21, fontWeight: 700 }}>Add a pass on your own</h2>
      <p style={{ fontSize: 13, color: "var(--soft)", marginBottom: 20 }}>Pick a topic and log a pass directly — no timer, no quiz, just marking that you studied it.</p>

      <div className="card">
        <div style={{ display: "grid", gap: 10, marginBottom: 18 }}>
          <div>
            <label style={{ fontSize: 11, color: "var(--soft)", display: "block", marginBottom: 4 }}>Subject</label>
            <select value={subjectKey} onChange={(e) => { setSubjectKey(e.target.value); setTopicId(""); }} style={{ width: "100%", padding: 8, borderRadius: 7 }}>
              {data.map((s) => <option key={s.key} value={s.key}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--soft)", display: "block", marginBottom: 4 }}>Topic</label>
            <select value={topicId} onChange={(e) => setTopicId(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 7 }}>
              <option value="">Pick a topic…</option>
              {subjectTopics.map((t) => <option key={t.id} value={t.id}>{t.sub ? `${t.sub} – ` : ""}{t.name}</option>)}
            </select>
          </div>
        </div>

        {selected && (
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "var(--panel)", borderRadius: 10, border: "1px solid var(--panel-border)" }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--soft)", marginBottom: 2 }}>{selected.sub ? `${selected.sub} – ` : ""}{selected.name}</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{currentPasses} pass{currentPasses === 1 ? "" : "es"}</div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 7 }}>
              <button type="button" disabled={saving || currentPasses === 0} onClick={() => handleAdd(-1)} style={{ padding: "9px 16px", borderRadius: 100, border: "1px solid var(--panel-border)", background: "var(--panel-solid)", color: "var(--ink)", cursor: currentPasses === 0 ? "default" : "pointer", opacity: currentPasses === 0 ? 0.5 : 1 }}>−1</button>
              <button type="button" disabled={saving} className="btn-primary" onClick={() => handleAdd(1)}>{justAdded ? "Added ✓" : "+1 pass"}</button>
            </div>
          </div>
        )}
        {!selected && <p style={{ fontSize: 12.5, color: "var(--soft)" }}>Pick a topic above to log a pass.</p>}
      </div>
    </div>
  );
}

function StudyPage({ topics, data, onBack, onFinish, initialTopicId }) {
  // session shape: { topicId, accumulated (seconds while paused), runningSince (epoch ms or null) }
  const [session, setSession] = useState(null);
  const [tick, setTick] = useState(0); // forces re-render while running

  // on mount, resume any session saved in this browser (survives back/refresh/tab-switch);
  // failing that, if we arrived here via "Study now" on a specific topic
  // (Today's sessions), start a fresh session on that topic directly.
  useEffect(() => {
    const saved = loadStudySession();
    if (saved) { setSession(saved); return; }
    if (initialTopicId) {
      const next = { topicId: initialTopicId, accumulated: 0, runningSince: null };
      setSession(next);
      saveStudySession(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!session || !session.runningSince) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [session]);

  function computeSeconds(s) {
    if (!s) return 0;
    const running = s.runningSince ? Math.floor((Date.now() - s.runningSince) / 1000) : 0;
    return s.accumulated + running;
  }

  function pickTopic(topicId) {
    const next = { topicId, accumulated: 0, runningSince: null };
    setSession(next);
    saveStudySession(next);
  }

  function play() {
    const next = { ...session, runningSince: Date.now() };
    setSession(next);
    saveStudySession(next);
  }

  function pause() {
    const elapsed = session.runningSince ? Math.floor((Date.now() - session.runningSince) / 1000) : 0;
    const next = { ...session, accumulated: session.accumulated + elapsed, runningSince: null };
    setSession(next);
    saveStudySession(next);
  }

  function changeTopic() {
    setSession(null);
    clearStudySession();
  }

  function finish() {
    const totalSeconds = computeSeconds(session);
    if (totalSeconds < 1) return;
    const minutes = Math.max(1, Math.round(totalSeconds / 60));
    onFinish(session.topicId, minutes);
    setSession(null);
    clearStudySession();
  }

  function formatTime(total) {
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  const selectedTopic = session ? topics.find((t) => t.id === session.topicId) : null;
  const seconds = computeSeconds(session);
  const running = !!session?.runningSince;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--soft)", cursor: "pointer", marginBottom: 16, fontSize: 13 }}>
        <IconArrowLeft /> Back
      </button>

      {session && (
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "var(--soft)", marginBottom: 4 }}>Studying</div>
          <h2 style={{ marginTop: 0, marginBottom: 24, fontSize: 34, fontWeight: 800, textShadow: "0 0 24px color-mix(in srgb, var(--purple) 55%, transparent), 0 0 60px color-mix(in srgb, var(--purple) 30%, transparent)" }}>{selectedTopic?.name}</h2>

          <div className="timer-ring">
            <div className="timer-display">{formatTime(seconds)}</div>
          </div>

          <div className="timer-controls">
            {!running ? (
              <button className="timer-btn" onClick={play}><IconPlay /></button>
            ) : (
              <button className="timer-btn" onClick={pause}><IconPause /></button>
            )}
            <button className="timer-btn secondary" onClick={finish}><IconStop /></button>
          </div>
          <button type="button" data-sound="none" onClick={(e) => { e.stopPropagation(); changeTopic(); }} style={{ marginTop: 18, background: "none", border: "none", color: "var(--soft)", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>
            Change topic (discards this timer)
          </button>
        </div>
      )}

      {!session && (
        <div className="card">
          <h3 style={{ marginTop: 0, fontSize: 15 }}>Pick a topic to study</h3>
          {data.map((s) => (
            <div key={s.key} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--purple)", textTransform: "uppercase", marginBottom: 6 }}>{s.name}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {topics.filter((t) => t.subjectKey === s.key).map((t) => (
                  <button key={t.id} className="study-topic-pill" onClick={() => pickTopic(t.id)}>
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatMinutesHM(totalMinutes) {
  if (!totalMinutes || totalMinutes <= 0) return "0m";
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function TodayWidget({ topics, progress, sessions = [] }) {
  const todayKey = dayKey(new Date());
  let count = 0, passes = 0;
  const subjectsToday = new Set();
  topics.forEach((x) => {
    const t = progress[x.id];
    (t?.history || []).forEach((h) => {
      if (dayKey(new Date(h.date)) !== todayKey) return;
      count++;
      if (h.action === "pass") passes++;
      subjectsToday.add(x.subject);
    });
  });

  const todayMinutes = sessions
    .filter((s) => dayKey(new Date(s.date)) === todayKey)
    .reduce((sum, s) => sum + (s.minutes || 0), 0);

  const timeFormatted = formatMinutesHM(todayMinutes);

  return (
    <div className="mini-widget" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 140 }}>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 11, color: "var(--soft)", textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 700 }}>Daily study time</div>
          {todayMinutes > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--green)", fontWeight: 700 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", display: "inline-block" }} /> Active
            </span>
          )}
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4, letterSpacing: -0.5 }}>
          {timeFormatted}
        </div>
        <div style={{ fontSize: 11, color: "var(--soft)", marginTop: 2 }}>
          {todayMinutes > 0 ? `${todayMinutes} min total logged` : "No minutes logged today"}
        </div>
      </div>
      <div style={{ fontSize: 11, color: "var(--soft)", marginTop: 10, borderTop: "1px solid var(--panel-border)", paddingTop: 8 }}>
        {todayMinutes === 0 && count === 0
          ? "No activity logged today"
          : `${count} action${count === 1 ? "" : "s"} · ${passes} pass${passes === 1 ? "" : "es"}`}
      </div>
    </div>
  );
}

function WeekWidget({ topics, progress, sessions = [] }) {
  const now = new Date();
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay()); weekStart.setHours(0, 0, 0, 0);
  const lastWeekStart = new Date(weekStart); lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(weekStart); lastWeekEnd.setDate(lastWeekEnd.getDate() - 1); lastWeekEnd.setHours(23, 59, 59, 999);
  let thisWeekCount = 0, lastWeekCount = 0;
  const activeDaysThisWeek = new Set();
  topics.forEach((x) => (progress[x.id]?.history || []).forEach((h) => {
    const hd = new Date(h.date);
    if (hd >= weekStart && hd <= now) { thisWeekCount++; activeDaysThisWeek.add(dayKey(hd)); }
    else if (hd >= lastWeekStart && hd <= lastWeekEnd) { lastWeekCount++; }
  }));

  sessions.forEach((s) => {
    const d = new Date(s.date);
    if (d >= weekStart && d <= now) activeDaysThisWeek.add(dayKey(d));
  });

  const thisWeekMinutes = sessions
    .filter((s) => {
      const d = new Date(s.date);
      return d >= weekStart && d <= now;
    })
    .reduce((sum, s) => sum + (s.minutes || 0), 0);

  const lastWeekMinutes = sessions
    .filter((s) => {
      const d = new Date(s.date);
      return d >= lastWeekStart && d <= lastWeekEnd;
    })
    .reduce((sum, s) => sum + (s.minutes || 0), 0);

  const diffMinutes = thisWeekMinutes - lastWeekMinutes;
  const timeFormatted = formatMinutesHM(thisWeekMinutes);

  return (
    <div className="mini-widget" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 140 }}>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 11, color: "var(--soft)", textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 700 }}>Weekly study time</div>
          <span style={{ fontSize: 10, color: "var(--soft)", fontWeight: 600 }}>{activeDaysThisWeek.size}/7 days</span>
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4, letterSpacing: -0.5 }}>
          {timeFormatted}
        </div>
        <div style={{ fontSize: 11, marginTop: 3 }}>
          {lastWeekMinutes === 0 && thisWeekMinutes === 0 ? (
            <span style={{ color: "var(--soft)" }}>No activity yet</span>
          ) : diffMinutes > 0 ? (
            <span style={{ color: "var(--green)", fontWeight: 600 }}>▲ +{formatMinutesHM(diffMinutes)} vs last week</span>
          ) : diffMinutes < 0 ? (
            <span style={{ color: "var(--red)", fontWeight: 600 }}>▼ -{formatMinutesHM(Math.abs(diffMinutes))} vs last week</span>
          ) : (
            <span style={{ color: "var(--soft)" }}>Same as last week</span>
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: 5, marginTop: 10 }}>
        {Array.from({ length: 7 }).map((_, i) => {
          const d = new Date(weekStart); d.setDate(d.getDate() + i);
          const active = activeDaysThisWeek.has(dayKey(d));
          const isFuture = d > now;
          return <div key={i} title={d.toLocaleDateString("en-US", { weekday: "short" })} style={{ width: 14, height: 14, borderRadius: 5, background: active ? "var(--purple)" : "var(--panel-border)", opacity: isFuture ? 0.35 : 1 }} />;
        })}
      </div>
    </div>
  );
}

function AnimatedNumber({ value, suffix = "", duration = 700 }) {
  const [display, setDisplay] = useState(0);
  const target = typeof value === "number" ? value : 0;
  useEffect(() => {
    if (typeof value !== "number") return;
    let raf;
    const start = performance.now();
    const from = 0;
    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (target - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, value]);
  if (typeof value !== "number") return <span className="stat-number">{value}</span>;
  return <span className="stat-number">{display}{suffix}</span>;
}

// Aggregates the flat studySessions list (real data points, not parsed
// text) into daily / weekly / per-subject totals, with a small chip
// switcher between the three views. Used on both the Dashboard (compact)
// and the Log tab (detailed, defaults to the subject breakdown).
// Switchable bar chart of passes-per-topic within one subject at a time,
// paged via prev/next arrows — keeps each subject's topic list readable
// instead of cramming every subject into one chart.
function SubjectPassesChart({ subjectsData, topics, progress }) {
  const [idx, setIdx] = useState(0);
  const count = subjectsData.length;
  const subject = subjectsData[Math.min(idx, count - 1)] || subjectsData[0];
  const ts = subject ? topics.filter((t) => t.subjectKey === subject.key) : [];
  const maxPasses = Math.max(1, ...ts.map((t) => progress[t.id]?.passes || 0));

  function go(delta) {
    playTick();
    setIdx((i) => (i + delta + count) % count);
  }

  if (!subject) return null;

  return (
    <div className="card" style={{ marginTop: 20, minWidth: 0, maxWidth: "100%", overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 21, fontWeight: 700 }}>Passes by topic</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => go(-1)} data-sound="none" disabled={count < 2} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: "50%", border: "1px solid var(--panel-border)", background: "var(--panel-solid)", color: "var(--ink)", cursor: count < 2 ? "default" : "pointer", opacity: count < 2 ? 0.4 : 1 }}>
            <IconArrowLeft style={{ width: 13, height: 13 }} />
          </button>
          <span style={{ fontSize: 13, fontWeight: 700, minWidth: 130, textAlign: "center" }}>{subject.name}</span>
          <button onClick={() => go(1)} data-sound="none" disabled={count < 2} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: "50%", border: "1px solid var(--panel-border)", background: "var(--panel-solid)", color: "var(--ink)", cursor: count < 2 ? "default" : "pointer", opacity: count < 2 ? 0.4 : 1 }}>
            <IconArrowRight style={{ width: 13, height: 13 }} />
          </button>
        </div>
      </div>
      {ts.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--soft)" }}>No topics in this subject.</p>
      ) : (
        <SubjectPassesLineChart topics={ts} progress={progress} maxPasses={maxPasses} />
      )}
    </div>
  );
}

// Plain SVG line chart (no charting library in this project) — one point
// per topic, in order, connected by a line, y = passes. Topic names sit
// horizontally under each point (wrapped onto a couple of short lines so
// nothing gets cropped, instead of rotated diagonal text).
function wrapChartLabel(text, maxChars = 12, maxLines = 3) {
  const words = text.split(" ");
  const lines = [];
  let current = "";
  words.forEach((w) => {
    const candidate = current ? `${current} ${w}` : w;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = w;
    } else {
      current = candidate;
    }
  });
  if (current) lines.push(current);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines - 1);
    kept.push(lines.slice(maxLines - 1).join(" ").slice(0, maxChars - 1) + "…");
    return kept;
  }
  return lines;
}

function SubjectPassesLineChart({ topics, progress, maxPasses }) {
  const [tapped, setTapped] = useState(null);
  const W_PER_POINT = 92;
  const H = 130, padX = 50, padY = 16, labelBand = 60;
  const n = topics.length;
  const W = Math.max(420, n * W_PER_POINT);
  const points = topics.map((t, i) => {
    const x = n <= 1 ? W / 2 : padX + (i * (W - padX * 2)) / (n - 1);
    const passes = progress[t.id]?.passes || 0;
    const y = H - padY - (passes / maxPasses) * (H - padY * 2);
    return { x, y, passes, t, lines: wrapChartLabel(`${t.sub ? "– " : ""}${t.name}`) };
  });
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  return (
    <div>
      <div style={{ overflowX: "auto", overflowY: "hidden", width: "100%", maxWidth: "100%", touchAction: "pan-x", overscrollBehaviorX: "contain" }}>
        <svg viewBox={`0 0 ${W} ${H + labelBand}`} width="100%" style={{ minWidth: W, display: "block" }}>
          <line x1={padX} y1={H - padY} x2={W - padX} y2={H - padY} stroke="var(--panel-border)" strokeWidth="1" />
          <path d={pathD} fill="none" stroke="var(--purple)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          {points.map((p, i) => {
            const isTapped = tapped === i;
            return (
              <g
                key={i}
                onClick={() => { playTick(); setTapped((v) => (v === i ? null : i)); }}
                style={{ cursor: "pointer" }}
              >
                <circle cx={p.x} cy={p.y} r="14" fill="transparent" />
                <circle cx={p.x} cy={p.y} r={isTapped ? 5.5 : 4} fill="var(--purple)" stroke="var(--panel-solid)" strokeWidth="1.5" />
                <text x={p.x} y={H - padY + 15} fontSize="8.5" fill="var(--soft)" textAnchor="middle">
                  {p.lines.map((line, li) => (
                    <tspan key={li} x={p.x} dy={li === 0 ? 0 : 10}>{line}</tspan>
                  ))}
                </text>
                {isTapped && (
                  <g>
                    <rect x={Math.min(Math.max(p.x - 34, 2), W - 70)} y={Math.max(p.y - 34, 2)} width="68" height="22" rx="6" fill="var(--ink)" />
                    <text x={Math.min(Math.max(p.x, 36), W - 36)} y={Math.max(p.y - 19, 17)} fontSize="11" fontWeight="700" textAnchor="middle" fill="var(--bg)">
                      {p.passes} pass{p.passes === 1 ? "" : "es"}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function StudyTimeTrends({ sessions, subjects, defaultView = "daily", detailed = false }) {
  const [view, setView] = useState(defaultView);

  const totalMinutes = sessions.reduce((a, s) => a + s.minutes, 0);

  // ---- daily: last 30 days ----
  const dayBuckets = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dayBuckets.push({ key: dayKey(d), date: d, minutes: 0 });
  }
  const dayIndex = Object.fromEntries(dayBuckets.map((b, i) => [b.key, i]));
  sessions.forEach((s) => {
    const k = dayKey(new Date(s.date));
    if (dayIndex[k] != null) dayBuckets[dayIndex[k]].minutes += s.minutes;
  });

  // ---- weekly: last 12 weeks (Sun–Sat) ----
  const weekBuckets = [];
  const today = new Date();
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
  thisWeekStart.setHours(0, 0, 0, 0);
  for (let i = 11; i >= 0; i--) {
    const start = new Date(thisWeekStart);
    start.setDate(start.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    weekBuckets.push({ start, end, minutes: 0 });
  }
  sessions.forEach((s) => {
    const d = new Date(s.date);
    for (const b of weekBuckets) {
      if (d >= b.start && d < b.end) { b.minutes += s.minutes; break; }
    }
  });

  // ---- per-subject totals ----
  const subjectTotals = subjects.map((sub) => ({
    key: sub.key,
    name: sub.name,
    minutes: sessions.filter((s) => s.subjectKey === sub.key).reduce((a, s) => a + s.minutes, 0),
  })).filter((s) => s.minutes > 0).sort((a, b) => b.minutes - a.minutes);

  const dayMax = Math.max(1, ...dayBuckets.map((b) => b.minutes));
  const weekMax = Math.max(1, ...weekBuckets.map((b) => b.minutes));
  const subjectMax = Math.max(1, ...subjectTotals.map((s) => s.minutes));

  const barHeight = detailed ? 90 : 60;

  const VIEWS = [
    { key: "daily", label: "Daily" },
    { key: "weekly", label: "Weekly" },
    { key: "subject", label: "By subject" },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 21, fontWeight: 700 }}>Study time trends</h2>
          <div style={{ fontSize: 12, color: "var(--soft)", marginTop: 2 }}>
            {formatMinutesHM(totalMinutes)} logged total{sessions.length ? ` · ${sessions.length} session${sessions.length === 1 ? "" : "s"}` : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, padding: 4, border: "1px solid var(--panel-border)", borderRadius: 100, background: "var(--glass-bg)" }}>
          {VIEWS.map((v) => (
            <button
              key={v.key}
              type="button"
              data-sound="none"
              onClick={() => { playSelect(); setView(v.key); }}
              style={{
                fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 100, border: "none", cursor: "pointer",
                background: view === v.key ? "var(--grad-primary)" : "transparent",
                color: view === v.key ? "#fff" : "var(--soft)",
              }}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {sessions.length === 0 ? (
        <p style={{ color: "var(--soft)", fontSize: 13 }}>No study sessions logged yet — minutes from the study timer or the &quot;Minutes studied&quot; field on a manual entry will show up here.</p>
      ) : view === "daily" ? (
        <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: barHeight, overflowX: "auto" }}>
          {dayBuckets.map((b) => (
            <div key={b.key} title={`${b.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}: ${b.minutes} min`}
              style={{ flex: "1 0 8px", minWidth: 8, height: `${Math.max(3, (b.minutes / dayMax) * barHeight)}px`, borderRadius: 3, background: b.minutes ? "var(--grad-primary)" : "var(--panel-border)" }} />
          ))}
        </div>
      ) : view === "weekly" ? (
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: barHeight }}>
          {weekBuckets.map((b, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div title={`${b.minutes} min`} style={{ width: "100%", maxWidth: 26, height: `${Math.max(3, (b.minutes / weekMax) * barHeight)}px`, borderRadius: 4, background: b.minutes ? "var(--grad-warm)" : "var(--panel-border)" }} />
              {detailed && <span style={{ fontSize: 9, color: "var(--softer)" }}>{b.start.toLocaleDateString("en-US", { month: "numeric", day: "numeric" })}</span>}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {subjectTotals.length === 0 && <p style={{ color: "var(--soft)", fontSize: 13 }}>No subject has logged minutes yet.</p>}
          {subjectTotals.map((s) => (
            <div key={s.key}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <b>{s.name}</b>
                <span style={{ color: "var(--soft)" }}>{formatMinutesHM(s.minutes)}</span>
              </div>
              <div className="tv-progress" style={{ marginTop: 4 }}>
                <div className="tv-progress-fill" style={{ width: `${Math.max(4, (s.minutes / subjectMax) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Heatmap({ settings, topics, progress }) {
  const hasSettings = !!(settings?.start_date && settings?.duration_value);
  const start = hasSettings ? new Date(settings.start_date + "T00:00:00") : (() => {
    const d = new Date();
    d.setDate(d.getDate() - 35);
    return d;
  })();
  const days = hasSettings
    ? (settings.duration_unit === "days" ? settings.duration_value : settings.duration_value * 7)
    : 49;
  const end = new Date(start); end.setDate(start.getDate() + days - 1);

  const counts = {};
  topics.forEach((x) => {
    const t = progress[x.id];
    (t?.history || []).forEach((h) => {
      const k = dayKey(new Date(h.date));
      counts[k] = (counts[k] || 0) + 1;
    });
  });

  const gridStart = new Date(start); gridStart.setDate(gridStart.getDate() - gridStart.getDay());
  const gridEnd = new Date(end); gridEnd.setDate(gridEnd.getDate() + (6 - gridEnd.getDay()));
  const cells = [];
  for (let d = new Date(gridStart); d <= gridEnd; d.setDate(d.getDate() + 1)) {
    const day = new Date(d);
    const k = dayKey(day);
    const inRange = day >= start && day <= end;
    const c = counts[k] || 0;
    const level = c === 0 ? 0 : c <= 1 ? 1 : c <= 3 ? 2 : c <= 5 ? 3 : 4;
    cells.push({ date: day, count: c, level, inRange });
  }
  const weeks = Math.ceil(cells.length / 7);
  const columns = [];
  for (let w = 0; w < weeks; w++) columns.push(cells.slice(w * 7, w * 7 + 7));

  let lastMonth = null;
  const monthLabels = columns.map((col) => {
    const m = col[0].date.getMonth();
    const label = m !== lastMonth ? col[0].date.toLocaleDateString("en-US", { month: "short" }) : "";
    lastMonth = m;
    return label;
  });

  return (
    <div>
      <div style={{ overflowX: "auto", paddingBottom: 4 }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${weeks}, minmax(20px, 1fr))`, gap: 7, marginBottom: 8, fontSize: 10, color: "var(--soft)", fontFamily: "monospace" }}>
          {monthLabels.map((l, i) => <div key={i}>{l}</div>)}
        </div>
        <div style={{ display: "grid", gridTemplateRows: "repeat(7, minmax(20px, 1fr))", gridAutoFlow: "column", gridAutoColumns: `minmax(20px, 1fr)`, gap: 7, minHeight: 190 }}>
          {columns.flatMap((col, ci) => col.map((c, ri) => (
            c.inRange
              ? (
                <div
                  key={`${ci}-${ri}`}
                  className={`hm-cell-grid hm${c.level}`}
                  title={`${c.date.toLocaleDateString("en-US")} · ${c.count} logged action${c.count === 1 ? "" : "s"}`}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: "#fff", mixBlendMode: "difference", pointerEvents: "none" }}>{c.date.getDate()}</span>
                </div>
              )
              : <div key={`${ci}-${ri}`} />
          )))}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, fontSize: 10, color: "var(--soft)" }}>
        <span>Less</span>
        <div className="hm-cell hm0" /><div className="hm-cell hm1" /><div className="hm-cell hm2" /><div className="hm-cell hm3" /><div className="hm-cell hm4" />
        <span>More</span>
      </div>
    </div>
  );
}

function CustomPieTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{
        background: "var(--panel-solid, #1a1a24)",
        border: "1px solid var(--panel-border, rgba(255,255,255,0.12))",
        borderRadius: 8,
        padding: "8px 12px",
        boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
        fontSize: 12,
        color: "var(--ink, #fff)",
        minWidth: 120,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: data.color }} />
          <span>{data.name}</span>
        </div>
        <div style={{ marginTop: 4, display: "flex", justifyContent: "space-between", gap: 12, color: "var(--soft, #a0a0b0)" }}>
          <span style={{ fontWeight: 800, color: "var(--ink, #fff)" }}>{data.formattedTime}</span>
          <span style={{ fontWeight: 700 }}>{data.percent}%</span>
        </div>
      </div>
    );
  }
  return null;
}

function StudyTimePieChart({ sessions = [], subjects = [] }) {
  const [scope, setScope] = useState("all");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const scopedSessions = scope === "week"
    ? sessions.filter((s) => {
        const d = new Date(s.date);
        return d >= weekStart && d <= now;
      })
    : sessions;

  const totalMinutes = scopedSessions.reduce((acc, s) => acc + (s.minutes || 0), 0);
  const formattedTotal = formatMinutesHM(totalMinutes);

  const tally = {};
  scopedSessions.forEach((s) => {
    const key = s.subjectKey || s.subject || "general";
    const name = s.subject || subjects.find((u) => u.key === s.subjectKey)?.name || "General Study";
    if (!tally[key]) {
      tally[key] = { key, name, minutes: 0 };
    }
    tally[key].minutes += (s.minutes || 0);
  });

  const chartData = Object.values(tally)
    .filter((s) => s.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes)
    .map((item, idx) => {
      const pct = totalMinutes > 0 ? Math.round((item.minutes / totalMinutes) * 100) : 0;
      return {
        name: item.name,
        value: item.minutes,
        formattedTime: formatMinutesHM(item.minutes),
        percent: pct,
        color: ROLE_CYCLE[idx % ROLE_CYCLE.length] || "var(--purple)",
      };
    });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Study time distribution</div>
          <div style={{ fontSize: 12, color: "var(--soft)", marginTop: 2 }}>
            {formattedTotal} logged {scope === "week" ? "this week" : "total"} across {chartData.length} subject{chartData.length === 1 ? "" : "s"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, padding: 3, border: "1px solid var(--panel-border)", borderRadius: 100, background: "var(--panel-solid)" }}>
          {[
            { key: "all", label: "All time" },
            { key: "week", label: "This week" },
          ].map((btn) => (
            <button
              key={btn.key}
              type="button"
              data-sound="none"
              onClick={() => setScope(btn.key)}
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                padding: "5px 12px",
                borderRadius: 100,
                border: "none",
                cursor: "pointer",
                background: scope === btn.key ? "var(--grad-primary)" : "transparent",
                color: scope === btn.key ? "#fff" : "var(--soft)",
                transition: "all 0.15s ease",
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {totalMinutes === 0 ? (
        <div style={{ padding: "28px 16px", textAlign: "center", border: "1px dashed var(--panel-border)", borderRadius: 12, background: "var(--glass-bg)" }}>
          <div style={{ width: 72, height: 72, margin: "0 auto 10px", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="72" height="72" viewBox="0 0 72 72">
              <circle cx="36" cy="36" r="28" fill="none" stroke="var(--panel-border)" strokeWidth="8" strokeDasharray="4 4" />
            </svg>
            <div style={{ position: "absolute", fontSize: 13, fontWeight: 800, color: "var(--soft)" }}>0m</div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
            No study time recorded {scope === "week" ? "this week" : "yet"}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--soft)", maxWidth: 360, margin: "4px auto 0" }}>
            Study sessions logged with the timer or passes marked with minutes will build your subject distribution pie chart.
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20, alignItems: "center" }}>
          {/* Pie / Donut Chart */}
          <div style={{ position: "relative", width: "100%", height: 210, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={54}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    isAnimationActive={true}
                    animationDuration={500}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="var(--panel-solid)" strokeWidth={2} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ width: 160, height: 160, borderRadius: "50%", border: "14px solid var(--panel-border)" }} />
            )}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                textAlign: "center",
                pointerEvents: "none",
              }}
            >
              <div style={{ fontSize: totalMinutes >= 60 && totalMinutes % 60 > 0 ? 19 : 22, fontWeight: 800, lineHeight: 1.1, color: "var(--ink)" }}>
                {formattedTotal}
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, color: "var(--soft)", marginTop: 2 }}>
                {scope === "week" ? "This week" : "Total"}
              </div>
            </div>
          </div>

          {/* Breakdown legend */}
          <div style={{ display: "grid", gap: 9 }}>
            {chartData.map((item) => (
              <div key={item.name} style={{ display: "grid", gap: 3 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: item.color, flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.name}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <span style={{ color: "var(--soft)", fontFamily: "monospace", fontSize: 12 }}>
                      {item.formattedTime}
                    </span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, padding: "1px 6px", borderRadius: 10, background: "var(--panel-border)", color: "var(--ink)" }}>
                      {item.percent}%
                    </span>
                  </div>
                </div>
                <div className="tv-progress" style={{ height: 4, margin: 0 }}>
                  <div className="tv-progress-fill" style={{ width: `${Math.max(3, item.percent)}%`, background: item.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ScheduleBuilder({ settings, setSettings, topics, subjectsData, progress, user, supabase, targetPasses }) {
  const hasDuration = !!(settings.start_date && settings.duration_value);
  const start = hasDuration ? new Date(settings.start_date + "T00:00:00") : null;
  const durationDays = hasDuration ? (settings.duration_unit === "days" ? settings.duration_value : settings.duration_value * 7) : null;

  const sd = settings.schedule_data || {};
  const mode = sd.mode || "auto";
  const generated = !!sd.generated;
  const smartSubjects = sd.smartSubjects || {};
  const manualPlan = sd.manualPlan || {};
  const manualConfirmed = !!sd.manualConfirmed;
  const dayPriority = settings.day_priority || DEFAULT_DAY_PRIORITY;

  const [manualSelected, setManualSelected] = useState(null); // {day, id}

  // Merges against the real database row rather than this render's cached
  // `sd` closure. schedule_data is one JSONB blob covering mode, generated,
  // smartSubjects, manualPlan, and manualConfirmed all together — if two
  // schedule actions land close together (e.g. switching mode then
  // generating), merging against a stale in-memory snapshot can silently
  // overwrite the more recent change when the whole column gets rewritten.
  // A quick select first makes each patch land on top of the true latest
  // state no matter how the writes are timed.
  async function persistScheduleData(patch) {
    const { data: fresh } = await supabase.from("user_settings").select("schedule_data").eq("user_id", user.id).maybeSingle();
    const next = { ...(fresh?.schedule_data || sd), ...patch };
    setSettings((s) => ({ ...s, schedule_data: next }));
    await supabase.from("user_settings").upsert({ user_id: user.id, schedule_data: next }, { onConflict: "user_id" });
  }
  async function persistTopLevel(patch) {
    setSettings((s) => ({ ...s, ...patch }));
    await supabase.from("user_settings").upsert({ user_id: user.id, ...patch }, { onConflict: "user_id" });
  }

  async function setScheduleMode(m) { await persistScheduleData({ mode: m }); }

  // ---------- Smart mode: plans one week at a time, per subject ----------
  const [formTarget, setFormTarget] = useState(targetPasses);
  const [formDayPriority, setFormDayPriority] = useState(dayPriority);
  // { [subjectKey]: { included, newPerDay, reviewsPerDay } }
  const [formSubjects, setFormSubjects] = useState(() => {
    const init = {};
    subjectsData.forEach((s) => {
      const existing = smartSubjects[s.key];
      init[s.key] = existing ? { included: true, newPerDay: existing.newPerDay ?? 1, reviewsPerDay: existing.reviewsPerDay ?? 2 } : { included: false, newPerDay: 1, reviewsPerDay: 2 };
    });
    return init;
  });

  function cyclePriority(dow) {
    setFormDayPriority((prev) => ({ ...prev, [dow]: ((prev[dow] ?? 1) + 1) % 3 }));
  }
  function toggleFormSubject(key) {
    setFormSubjects((prev) => ({ ...prev, [key]: { ...prev[key], included: !prev[key].included } }));
  }
  function updateFormSubject(key, field, value) {
    setFormSubjects((prev) => ({ ...prev, [key]: { ...prev[key], [field]: Math.max(0, Number(value) || 0) } }));
  }

  const weekStart = smartWeekStart(settings.start_date);
  const todayForIdx = new Date(); todayForIdx.setHours(0, 0, 0, 0);
  const smartTodayIdx = Math.floor((todayForIdx - weekStart) / 86400000);
  const progressByTopicId = {};
  topics.forEach((t) => { progressByTopicId[t.id] = progress[t.id] || null; });

  const formSmartSubjects = {};
  Object.entries(formSubjects).forEach(([key, cfg]) => {
    if (cfg.included) formSmartSubjects[key] = { newPerDay: cfg.newPerDay, reviewsPerDay: cfg.reviewsPerDay };
  });
  const previewPlan = Object.keys(formSmartSubjects).length ? buildWeekPlan(weekStart, formSmartSubjects, formDayPriority, topics, progressByTopicId, formTarget, smartTodayIdx) : null;

  async function generateSmartSchedule() {
    await Promise.all([
      persistTopLevel({ target_passes: formTarget, day_priority: formDayPriority }),
      // mode is explicit here (not left to default) — without it, the mode
      // toggle's own "sd.mode || auto" fallback makes this screen work
      // fine locally, but anything reading schedule_data.mode directly
      // (like Today's sessions) would see it as still unset.
      persistScheduleData({ mode: "auto", generated: true, smartSubjects: formSmartSubjects }),
    ]);
  }
  function editSmartSchedule() { persistScheduleData({ generated: false }); }

  const livePlan = generated && Object.keys(smartSubjects).length
    ? buildWeekPlan(weekStart, smartSubjects, dayPriority, topics, progressByTopicId, targetPasses, smartTodayIdx)
    : null;

  // ---------- Manual mode ----------
  async function manualAddTopic(day, topicId) {
    const arr = manualPlan[day] ? [...manualPlan[day]] : [];
    if (!arr.includes(topicId)) arr.push(topicId);
    await persistScheduleData({ manualPlan: { ...manualPlan, [day]: arr } });
  }
  async function manualRemoveTopic(day, topicId) {
    const arr = (manualPlan[day] || []).filter((x) => x !== topicId);
    const next = { ...manualPlan, [day]: arr };
    await persistScheduleData({ manualPlan: next });
    if (manualSelected && manualSelected.day === day && manualSelected.id === topicId) setManualSelected(null);
  }
  function manualChipTap(day, id) {
    if (manualSelected && manualSelected.day === day && manualSelected.id === id) setManualSelected(null);
    else setManualSelected({ day, id });
  }
  async function manualDayTap(day) {
    if (!manualSelected) return;
    const { day: sourceDay, id } = manualSelected;
    setManualSelected(null);
    if (day === sourceDay) return;
    const src = (manualPlan[sourceDay] || []).filter((x) => x !== id);
    const tgt = manualPlan[day] ? [...manualPlan[day]] : [];
    if (!tgt.includes(id)) tgt.push(id);
    await persistScheduleData({ manualPlan: { ...manualPlan, [sourceDay]: src, [day]: tgt } });
  }
  async function manualConfirm() { await persistScheduleData({ manualConfirmed: true }); }
  async function manualEdit() { await persistScheduleData({ manualConfirmed: false }); setManualSelected(null); }

  const manualAssignedCount = Object.values(manualPlan).reduce((sum, arr) => sum + (arr ? arr.length : 0), 0);

  // build the {day: [{id,name,subject,sub,pass,total}]} object used by the read-only weekly view.
  // "done" is never a separate flag anymore — it's always the real
  // topic_progress passes count, since progress can only come from the
  // Study page (timer, QBank) or the topic modal's own manual pass button.
  function manualScheduleObj() {
    const topicById = {}; topics.forEach((t) => { topicById[t.id] = t; });
    const daysByTopic = {};
    Object.entries(manualPlan).forEach(([dayStr, ids]) => {
      const d = Number(dayStr);
      (ids || []).forEach((id) => {
        if (!topicById[id]) return;
        (daysByTopic[id] = daysByTopic[id] || []).push(d);
      });
    });
    Object.values(daysByTopic).forEach((arr) => arr.sort((a, b) => a - b));

    const out = {};
    Object.entries(manualPlan).forEach(([dayStr, ids]) => {
      const d = Number(dayStr);
      (ids || []).forEach((id) => {
        const t = topicById[id];
        if (!t) return;
        const occurrences = daysByTopic[id];
        const passNum = occurrences.indexOf(d) + 1;
        if (!out[d]) out[d] = [];
        out[d].push({ id: t.id, name: t.name, subject: t.subject, sub: t.sub, pass: passNum, total: occurrences.length, day: d });
      });
    });
    return out;
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const manualTodayIdx = hasDuration ? Math.round((today - start) / 86400000) : 0;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => setScheduleMode("auto")} className={mode === "auto" ? "btn-primary" : ""} style={mode !== "auto" ? { background: "var(--panel-solid)", border: "1px solid var(--panel-border)", borderRadius: 100, padding: "9px 16px", color: "var(--ink)", cursor: "pointer", fontWeight: 600 } : {}}>
          Smart
        </button>
        <button onClick={() => setScheduleMode("manual")} className={mode === "manual" ? "btn-primary" : ""} style={mode !== "manual" ? { background: "var(--panel-solid)", border: "1px solid var(--panel-border)", borderRadius: 100, padding: "9px 16px", color: "var(--ink)", cursor: "pointer", fontWeight: 600 } : {}}>
          Manual
        </button>
      </div>

      {mode === "auto" && !generated && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Build this week&apos;s plan</h2>
          <p style={{ fontSize: 13, color: "var(--soft)" }}>
            The smart schedule only ever plans one week at a time — pick which subjects are active and how many new lessons vs. review passes you want per day. Overdue topics and anything flagged &quot;needs review&quot; always get pulled to the earliest open day, ahead of new material.
          </p>

          <div style={{ marginTop: 16 }}>
            <label style={{ fontSize: 12, color: "var(--soft)", display: "block", marginBottom: 6 }}>Passes per lesson</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {[3, 5, 7, 10].map((p) => (
                <button key={p} onClick={() => setFormTarget(p)} style={{ width: 44, height: 44, borderRadius: 12, border: "1px solid var(--panel-border)", cursor: "pointer", fontWeight: 700, background: formTarget === p ? "var(--grad-primary)" : "var(--panel-solid)", color: formTarget === p ? "#fff" : "var(--ink)" }}>{p}</button>
              ))}
              <input type="number" min="1" max="12" value={formTarget} onChange={(e) => setFormTarget(Number(e.target.value) || 1)} style={{ width: 70, textAlign: "center", padding: 8, borderRadius: 8 }} />
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <label style={{ fontSize: 12, color: "var(--soft)", display: "block", marginBottom: 8 }}>Subjects &amp; daily pace</label>
            <div style={{ display: "grid", gap: 8 }}>
              {subjectsData.map((s) => {
                const cfg = formSubjects[s.key];
                return (
                  <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${cfg.included ? "var(--purple)" : "var(--panel-border)"}`, background: cfg.included ? "var(--panel)" : "var(--panel-solid)" }}>
                    <button type="button" onClick={() => toggleFormSubject(s.key)} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 700, fontSize: 13.5, color: "var(--ink)" }}>
                      <span style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${cfg.included ? "var(--purple)" : "var(--panel-border)"}`, background: cfg.included ? "var(--grad-primary)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12 }}>{cfg.included ? "✓" : ""}</span>
                      {s.name}
                    </button>
                    {cfg.included && (
                      <div style={{ display: "flex", gap: 10, marginLeft: "auto", flexWrap: "wrap" }}>
                        <label style={{ fontSize: 11, color: "var(--soft)", display: "flex", alignItems: "center", gap: 6 }}>
                          New/day
                          <input type="number" min="0" max="20" value={cfg.newPerDay} onChange={(e) => updateFormSubject(s.key, "newPerDay", e.target.value)} style={{ width: 56, padding: 6, borderRadius: 6 }} />
                        </label>
                        <label style={{ fontSize: 11, color: "var(--soft)", display: "flex", alignItems: "center", gap: 6 }}>
                          Reviews/day
                          <input type="number" min="0" max="20" value={cfg.reviewsPerDay} onChange={(e) => updateFormSubject(s.key, "reviewsPerDay", e.target.value)} style={{ width: 56, padding: 6, borderRadius: 6 }} />
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <label style={{ fontSize: 12, color: "var(--soft)", display: "block", marginBottom: 6 }}>Day priority</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {WEEKDAY_SHORT.map((label, dow) => {
                const level = formDayPriority[dow] ?? 1;
                return (
                  <button key={dow} type="button" className="daypri-opt" data-level={level} onClick={() => cyclePriority(dow)}>
                    <span>{label}</span><span style={{ fontSize: 9.5 }}>{DAY_PRIORITY_LABELS[level]}</span>
                  </button>
                );
              })}
            </div>
            <p style={{ fontSize: 12, color: "var(--soft)", marginTop: 8 }}>Tap a day to cycle Normal → Intense → Off.</p>
          </div>

          {previewPlan && (
            <div className="card" style={{ marginTop: 18, background: "var(--panel)" }}>
              {(() => {
                const allItems = Object.values(previewPlan.schedule).flat();
                const totalThisWeek = allItems.length;
                const overdueThisWeek = allItems.filter((it) => it.kind === "overdue").length;
                const reviewThisWeek = allItems.filter((it) => it.kind === "review").length;
                const newThisWeek = allItems.filter((it) => it.kind === "new").length;
                return (
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.8 }}>
                    <li><b>{totalThisWeek}</b> session{totalThisWeek === 1 ? "" : "s"} planned this week</li>
                    {overdueThisWeek > 0 && <li><b style={{ color: "var(--red)" }}>{overdueThisWeek}</b> overdue/flagged, being caught up ASAP</li>}
                    {reviewThisWeek > 0 && <li><b style={{ color: "var(--yellow)" }}>{reviewThisWeek}</b> regular spaced reviews</li>}
                    {newThisWeek > 0 && <li><b style={{ color: "var(--purple)" }}>{newThisWeek}</b> new lesson{newThisWeek === 1 ? "" : "s"}</li>}
                  </ul>
                );
              })()}
            </div>
          )}
          {!previewPlan && <p style={{ fontSize: 12.5, color: "var(--soft)", marginTop: 14 }}>Pick at least one subject to see a preview.</p>}

          <button className="btn-primary" style={{ marginTop: 16 }} disabled={!Object.keys(formSmartSubjects).length} onClick={generateSmartSchedule}>Generate this week&apos;s plan</button>
        </div>
      )}

      {mode === "auto" && generated && (() => {
        if (!livePlan) return <div className="card"><p style={{ color: "var(--soft)" }}>No subjects are active in your smart schedule.</p></div>;
        const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);
        const totalThisWeek = Object.values(livePlan.schedule).reduce((sum, items) => sum + items.length, 0);
        return (
          <>
            <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <h2 style={{ margin: "0 0 4px" }}>This week</h2>
                <p style={{ fontSize: 13, color: "var(--soft)", margin: 0 }}>{weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}–{weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {totalThisWeek} session{totalThisWeek === 1 ? "" : "s"} · {Object.keys(smartSubjects).length} subject{Object.keys(smartSubjects).length === 1 ? "" : "s"} active</p>
                <p style={{ fontSize: 12, color: "var(--soft)", margin: "4px 0 0" }}>Come back next week for a freshly-adapted plan — it always adjusts to overdue &amp; flagged topics automatically.</p>
              </div>
              <button onClick={editSmartSchedule} style={{ background: "var(--panel-solid)", border: "1px solid var(--panel-border)", borderRadius: 100, padding: "9px 16px", color: "var(--ink)", cursor: "pointer", fontWeight: 600 }}>Edit plan</button>
            </div>
            <WeeklyScheduleView scheduleObj={livePlan.schedule} start={weekStart} totalDays={7} todayIdx={smartTodayIdx} progress={progress} />
          </>
        );
      })()}

      {mode === "manual" && !hasDuration && (
        <div className="card"><p style={{ color: "var(--soft)" }}>Manual mode places topics across your whole unit duration — save a start date and duration above first.</p></div>
      )}

      {mode === "manual" && hasDuration && !manualConfirmed && (
        <>
          <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h2 style={{ margin: "0 0 4px" }}>Manual schedule</h2>
              <p style={{ fontSize: 13, color: "var(--soft)", margin: 0 }}>Tap a topic to pick it up, then tap another day to drop it there. Never touched by the smart algorithm.</p>
              <p style={{ fontSize: 13, color: "var(--soft)", margin: "2px 0 0" }}>{manualAssignedCount} topic{manualAssignedCount === 1 ? "" : "s"} placed so far</p>
            </div>
            <button className="btn-primary" disabled={!manualAssignedCount} onClick={manualConfirm} style={!manualAssignedCount ? { opacity: 0.5, cursor: "not-allowed" } : {}}>Confirm plan</button>
          </div>

          {manualSelected && (
            <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <p style={{ fontSize: 13, margin: 0 }}>Moving <b>{topics.find((t) => t.id === manualSelected.id)?.name}</b> — tap the day you want it on.</p>
              <button onClick={() => setManualSelected(null)} style={{ background: "var(--panel-solid)", border: "1px solid var(--panel-border)", borderRadius: 100, padding: "6px 14px", color: "var(--ink)", cursor: "pointer" }}>Cancel</button>
            </div>
          )}

          <ManualWeekGrid
            start={start} durationDays={durationDays} manualPlan={manualPlan} topics={topics} subjectsData={subjectsData}
            manualSelected={manualSelected} onChipTap={manualChipTap} onDayTap={manualDayTap}
            onRemove={manualRemoveTopic} onAdd={manualAddTopic}
          />
        </>
      )}

      {mode === "manual" && hasDuration && manualConfirmed && (() => {
        const scheduleObj = manualScheduleObj();
        const totalTopics = Object.values(scheduleObj).reduce((sum, items) => sum + items.length, 0);
        return (
          <>
            <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <h2 style={{ margin: "0 0 4px" }}>Your manual plan</h2>
                <p style={{ fontSize: 13, color: "var(--soft)", margin: 0 }}>{totalTopics} topic{totalTopics === 1 ? "" : "s"} placed across {durationDays} days · progress reflects passes logged from the Study page</p>
              </div>
              <button onClick={manualEdit} style={{ background: "var(--panel-solid)", border: "1px solid var(--panel-border)", borderRadius: 100, padding: "9px 16px", color: "var(--ink)", cursor: "pointer", fontWeight: 600 }}>Edit plan</button>
            </div>
            <WeeklyScheduleView scheduleObj={scheduleObj} start={start} totalDays={durationDays} todayIdx={manualTodayIdx} progress={progress} />
          </>
        );
      })()}
    </div>
  );
}

function ManualWeekGrid({ start, durationDays, manualPlan, topics, subjectsData, manualSelected, onChipTap, onDayTap, onRemove, onAdd }) {
  const [openPicker, setOpenPicker] = useState(null); // day index with an open add-picker
  const [pickerValue, setPickerValue] = useState("");
  const weeks = [];
  for (let wStart = 0; wStart < durationDays; wStart += 7) weeks.push(wStart);

  return (
    <>
      {weeks.map((wStart) => {
        const wEnd = Math.min(durationDays, wStart + 7);
        const weekStartDate = new Date(start); weekStartDate.setDate(weekStartDate.getDate() + wStart);
        const weekEndDate = new Date(start); weekEndDate.setDate(weekEndDate.getDate() + wEnd - 1);
        return (
          <div key={wStart} className="card">
            <h3 style={{ fontSize: 15, marginTop: 0 }}>
              Week {Math.floor(wStart / 7) + 1} <span style={{ fontWeight: 400, color: "var(--soft)", fontSize: 12 }}>· {weekStartDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}–{weekEndDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 10 }}>
              {Array.from({ length: wEnd - wStart }).map((_, i) => {
                const d = wStart + i;
                const date = new Date(start); date.setDate(date.getDate() + d);
                const ids = manualPlan[d] || [];
                const isDropTarget = manualSelected && manualSelected.day !== d;
                return (
                  <div key={d} className="sched-day" style={isDropTarget ? { borderColor: "var(--purple)", borderStyle: "dashed", cursor: "pointer" } : {}} onClick={() => onDayTap(d)}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontFamily: "monospace" }}>{date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setOpenPicker(openPicker === d ? null : d); setPickerValue(""); }} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 100, border: "1px solid var(--panel-border)", background: "var(--panel-solid)", color: "var(--ink)", cursor: "pointer" }}>+ Add</button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, minHeight: 20 }}>
                      {ids.map((id) => {
                        const t = topics.find((x) => x.id === id);
                        if (!t) return null;
                        const isSelected = manualSelected && manualSelected.day === d && manualSelected.id === id;
                        return (
                          <div key={id} className="sched-chip" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", ...(isSelected ? { background: "var(--grad-primary)", color: "#fff", borderColor: "transparent" } : {}) }} onClick={(e) => { e.stopPropagation(); onChipTap(d, id); }}>
                            <span>{t.sub ? `${t.sub} – ` : ""}{t.name}</span>
                            <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(d, id); }} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", opacity: 0.6, marginLeft: 6 }}>×</button>
                          </div>
                        );
                      })}
                      {ids.length === 0 && <span style={{ fontSize: 11, color: "var(--soft)", opacity: 0.7 }}>{isDropTarget ? "Tap to drop here" : "No topics yet"}</span>}
                    </div>
                    {openPicker === d && (
                      <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }} onClick={(e) => e.stopPropagation()}>
                        <select value={pickerValue} onChange={(e) => setPickerValue(e.target.value)} style={{ flex: 1, minWidth: 120, padding: 6, borderRadius: 6, fontSize: 12 }}>
                          <option value="">Pick a topic…</option>
                          {subjectsData.map((s) => (
                            <optgroup key={s.key} label={s.name}>
                              {topics.filter((t) => t.subjectKey === s.key).map((t) => <option key={t.id} value={t.id}>{t.sub ? `${t.sub} – ` : ""}{t.name}</option>)}
                            </optgroup>
                          ))}
                        </select>
                        <button className="btn-primary" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => { if (pickerValue) onAdd(d, pickerValue); setOpenPicker(null); }}>Add</button>
                        <button onClick={() => setOpenPicker(null)} style={{ background: "var(--panel-solid)", border: "1px solid var(--panel-border)", borderRadius: 6, padding: "6px 10px", fontSize: 12, color: "var(--ink)", cursor: "pointer" }}>Cancel</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}

// Read-only weekly display — used for both the smart (7-day) and manual
// (multi-week) schedules. Chips are no longer clickable: the only ways to
// log real progress are the Study page (timer, QBank) or the topic
// modal's "add a pass on your own" control, so what's shown here is purely
// a status reflection of that progress, not an input.
// A session counts as done either by hitting its actual pass target, or
// by mastery alone reaching a genuinely good score — a topic you've
// clearly got down doesn't need to wait on a raw pass count to register.
function isSessionDone(it, progress, flashcardDoneSet = null) {
  if (flashcardDoneSet && flashcardDoneSet.has(it.id)) return true;
  const row = progress[it.id];
  const passes = row?.passes || 0;
  if (passes >= it.pass) return true;
  const mastery = calcMastery(row);
  return mastery != null && mastery >= 70;
}

// Classifies a scheduled occurrence's status, used to group items in the
// Calendar view and to color both views consistently. "overdue" is an
// explicit tag from the scheduler itself (a real backlog item, rescheduled
// ASAP) — it's not inferred from day position, since a genuinely overdue
// session can never land before today (the scheduler won't backfill), so
// a day-position check alone would never catch it.
function scheduleItemStatus(it, progress, isPast) {
  if (isSessionDone(it, progress)) return { key: "done", label: "Done", color: "var(--green)" };
  if (it.kind === "overdue") return { key: "overdue", label: "Overdue", color: "var(--red)" };
  if (isPast) return { key: "overdue", label: "Overdue", color: "var(--red)" };
  if (it.pass === 1) return { key: "new", label: "New", color: "var(--purple)" };
  return { key: "review", label: "Review", color: "var(--yellow)" };
}

function WeeklyScheduleView({ scheduleObj, start, totalDays, todayIdx, progress }) {
  const [view, setView] = useState("list");
  const weeks = [];
  for (let wStart = 0; wStart < totalDays; wStart += 7) weeks.push(wStart);

  return (
    <>
      <div style={{ display: "flex", gap: 6, marginBottom: 2 }}>
        {[{ key: "list", label: "List" }, { key: "calendar", label: "Calendar" }].map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => setView(v.key)}
            data-sound="none"
            style={{
              fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 100, cursor: "pointer",
              border: `1px solid ${view === v.key ? "var(--purple)" : "var(--panel-border)"}`,
              background: view === v.key ? "var(--grad-primary)" : "var(--panel-solid)",
              color: view === v.key ? "#fff" : "var(--ink)",
            }}
          >
            {v.label}
          </button>
        ))}
      </div>

      {weeks.map((wStart) => {
        const wEnd = Math.min(totalDays, wStart + 7);
        const weekStartDate = new Date(start); weekStartDate.setDate(weekStartDate.getDate() + wStart);
        const weekEndDate = new Date(start); weekEndDate.setDate(weekEndDate.getDate() + wEnd - 1);

        const activeDays = [];
        for (let d = wStart; d < wEnd; d++) {
          const items = scheduleObj[d] || [];
          if (items.length) activeDays.push(d);
        }
        if (!activeDays.length) return null;

        if (view === "list") {
          return (
            <div key={wStart} className="card">
              <h3 style={{ fontSize: 16, marginTop: 0 }}>
                Week {Math.floor(wStart / 7) + 1} <span style={{ fontWeight: 400, color: "var(--soft)", fontSize: 13 }}>· {weekStartDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}–{weekEndDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
              </h3>
              {activeDays.map((d) => {
                const items = scheduleObj[d] || [];
                const date = new Date(start); date.setDate(date.getDate() + d);
                const isToday = d === todayIdx, isPast = d < todayIdx;
                const isDayComplete = items.every((it) => isSessionDone(it, progress));
                const bySubject = {};
                items.forEach((it) => { (bySubject[it.subject] = bySubject[it.subject] || []).push(it); });
                return (
                  <div key={d} style={{ padding: "12px 0", borderBottom: "1px solid var(--panel-border)", opacity: isDayComplete ? 0.7 : 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 14, fontFamily: "monospace", color: isToday ? "var(--purple)" : "var(--soft)", fontWeight: isToday ? 700 : 400 }}>{date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
                      {isToday && <span style={{ fontSize: 11, fontWeight: 700, background: "color-mix(in srgb, var(--purple) 14%, transparent)", color: "var(--purple)", padding: "2px 8px", borderRadius: 20 }}>Today</span>}
                      {isDayComplete && <span style={{ color: "var(--green)" }}>✓</span>}
                    </div>
                    {Object.entries(bySubject).map(([subj, arr]) => (
                      <div key={subj} style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--purple)", textTransform: "uppercase", marginBottom: 4 }}>{subj}</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                          {arr.map((it, i) => {
                            const status = scheduleItemStatus(it, progress, isPast);
                            return (
                              <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 15, padding: "2px 0" }}>
                                <span style={{ width: 8, height: 8, borderRadius: "50%", background: status.color, flexShrink: 0 }} />
                                <span style={{ fontSize: 12, fontWeight: 700, color: status.color, minWidth: 54 }}>{status.label}</span>
                                <span>{it.sub ? "– " : ""}{it.name}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          );
        }

        // ---- calendar view: a real 7-column week grid (Sun–Sat), every
        // day gets its slot — including rest days — so it reads like an
        // actual calendar instead of a wrapping list of cards. ----
        return (
          <div key={wStart} className="card real-cal-card">
            <h3 style={{ fontSize: 15, marginTop: 0 }}>
              Week {Math.floor(wStart / 7) + 1} <span style={{ fontWeight: 400, color: "var(--soft)", fontSize: 12 }}>· {weekStartDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}–{weekEndDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
            </h3>
            <div className="real-cal">
              <div className="real-cal-header">
                {WEEKDAY_SHORT.map((wd) => <div key={wd}>{wd}</div>)}
              </div>
              <div className="real-cal-grid">
                {Array.from({ length: 7 }).map((_, dow) => {
                  const d = wStart + dow;
                  const inUnit = d < totalDays;
                  const items = inUnit ? (scheduleObj[d] || []) : [];
                  const date = new Date(start); date.setDate(date.getDate() + d);
                  const isToday = d === todayIdx, isPast = d < todayIdx;
                  const byStatus = {};
                  items.forEach((it) => {
                    const status = scheduleItemStatus(it, progress, isPast);
                    (byStatus[status.key] = byStatus[status.key] || { status, items: [] }).items.push(it);
                  });
                  const order = ["overdue", "review", "new", "done"];
                  const statusGroups = order.filter((k) => byStatus[k]);
                  return (
                    <div key={dow} className={`real-cal-cell${isToday ? " is-today" : ""}${!inUnit ? " is-outside" : ""}`}>
                      <div className="real-cal-date">
                        <span>{inUnit ? date.getDate() : ""}</span>
                        {isToday && <span className="real-cal-today-dot" />}
                      </div>
                      {inUnit && items.length > 0 && (
                        <div className="real-cal-items">
                          {statusGroups.map((k) => (
                            <div key={k} className="real-cal-group">
                              <div className="real-cal-group-label" style={{ color: byStatus[k].status.color }}>{byStatus[k].status.label} ({byStatus[k].items.length})</div>
                              {byStatus[k].items.map((it, i) => (
                                <div key={i} className="real-cal-chip" style={{ "--chip-color": byStatus[k].status.color }} title={`${byStatus[k].status.label}: ${it.name}`}>
                                  {it.sub ? "– " : ""}{it.name}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
