# Cardio-Respiratory Tracker — Project Overview

*Use this document to bring a new Claude chat up to speed. Paste the whole thing at the start of the conversation, then attach the current project zip.*

## What this is

A multi-device life/study tracker for a first-year medical student (University of Algiers 1), originally a single-file HTML study tracker, now a full **Next.js + Supabase** web app. It's a small "life OS" with six areas under one shell:

- **Today** — home/overview page. Preview of today's study sessions (with a working "Study" button per topic, not just a preview anymore), the habit completion hero card, study streak + subject breakdown, and a combined tasks/habits schedule with clickable checkboxes and subtask support.
- **Study** — multi-unit MCQ/anatomy study tracking, spaced-repetition scheduling, Tracker/Stats/History/Plan, study timer, standalone pass-logging, plus **QBank and Flashcards live here as tabs**, not separate top-level areas. Admins get a seventh, hidden **Access** tab for redeem-code management.
- **Tasks** — one-off task list with subtasks, due dates, category/project + time-slot tagging, and three grouping views (Category/Project, Time, Calendar).
- **Habits** — fully built. Daily habit tracking with streaks, a completion hero card, heatmap, weekly/monthly summary, best-day-of-week stats, category tagging with theme-coherent colors, and swipe-to-check gestures (opt-in).
- **Notes** — new top-level area. A freeform, Google Keep-style scratchpad, deliberately unlinked from any unit/topic. For the admin account only, notes can also arrive automatically via a connected Telegram bot.
- **QBank** (Study tab) — MCQ practice (multiple choice / active recall / timed exam), confidence calibration, per-question attempt logging, abandon support, and a "Review Your Weak Points" read-only review screen.
- **Flashcards** (Study tab) — Anki-style session drilling (not calendar-based spaced repetition): Basic and Cloze card types, escalating re-show intervals within a session, multiple concurrent sessions across topics, a Library view, and its own "Review Your Weak Points."

The site is also a small **paid product**: the owner sells access to premium content in person (cash), then hands out single-use redeem codes. There's still no payment processor, but code generation/listing/revocation is now done **from inside the app** (admin-only), not by hand-writing SQL.

## Tech stack

- **Next.js (App Router)** + React, all client components (`"use client"`)
- **Supabase**: Postgres DB + Auth (email/password), via `@supabase/ssr`'s `createBrowserClient`
- **Deployed on Vercel** (currently under the `getstudying.vercel.app` alias), auto-deploys on push
- **Code hosted on GitHub**, pushed via **GitHub Desktop only** — no terminal git workflow. Every code change is delivered as a **full project zip**.
- Tailwind base + a large custom `globals.css` with a full 5-theme system
- Sounds: hand-synthesized Web Audio API tones in `src/lib/sounds.js`
- No charting library — all charts are hand-rolled inline SVG
- One serverless API route (`src/app/api/telegram/webhook/route.js`) — the only piece of the app that isn't a client component, since Telegram calls it directly over HTTP. Uses the Supabase **service role key** (bypasses RLS) since the webhook has no user session of its own.

## Critical workflow constraints (read before doing anything)

1. **Always deliver a full zip of the whole project folder**, never individual files.
2. **Any new/changed SQL must be a copy-pasteable code block** for Supabase's SQL Editor — migrations are run manually there. If a migration hasn't been run, dependent features will hard-fail.
3. Migrations are numbered sequentially in `supabase/migrations/`. **Current highest: `017_telegram_notes.sql`.** Next new migration should be `018_...sql`.
4. Before editing any file, view/grep it first. This codebase has a lot of interdependent state across a handful of very large files (`study/page.js` is ~2,500+ lines); assumptions about structure are often wrong.
5. After any nontrivial edit, sanity-check syntax before packaging: brace/paren counts and a regex-based `<div>`/`</div>` balance check on every touched file, plus a Node `readFileSync` pass to catch encoding/syntax issues. This has caught several would-be-broken zips (including a missing icon import that would have failed the build).
6. **Verify the zip before sending it.**
7. The user tests thoroughly on the live deployed site and reports back with **annotated screenshots** — read these literally and trace the actual code path her exact symptom implies, rather than assuming the obvious cause. Several real bugs were only found this way.
8. No live browser access — CSS/animation fixes are reasoned from the cascade, not visually verified. Flag this honestly when a fix is a best-inference rather than a confirmed one.
9. The person's name is Suher. Her (hardcoded) admin email is `maghrabiasma11@gmail.com` — defined as `ADMIN_EMAIL` in both `src/app/study/page.js` and `src/app/notes/page.js`, and re-checked server-side in the RLS policies / security-definer functions for anything admin-gated. **If this email ever changes, it must be updated in all of those places at once**, not just the UI.

## Directory structure (current)

```
project/
  src/
    app/
      page.js                — landing, redirects to /today
      login/, signup/        — auth pages
      layout.js               — root layout
      globals.css              — theme system (5 themes), all shared styles
      today/page.js            — TODAY home page
      study/page.js            — STUDY module (huge file: Tracker/Stats/QBank tab/Flashcards tab/History/Plan/Access + StudyHub + timer + schedule builder)
      tasks/page.js             — TASKS module
      habits/page.js            — HABITS module
      notes/page.js             — NOTES module (incl. admin-only Telegram-linking UI)
      api/telegram/webhook/route.js — serverless route Telegram POSTs to; only non-client-component file in the app
      (no /dashboard, no /qbank route — both merged into /study)
    components/
      AppShell.js              — shared page shell: collapsible sidebar (Settings pinned top) + <BottomNav>. Renders bg-fluid blobs + BloomFallingFlowers app-wide.
      BottomNav.js             — Today/Study/Tasks/Habits/Notes bottom bar, animated pill indicator
      SidebarSettings.js       — Settings flyout: Theme/Night-day, UI Sounds, Swipe-to-check, Switch/Export/Reset/Log out (all nested inside Settings now)
      SidebarToggle.js         — hamburger icon, sidebar collapse toggle
      SwipeRow.js              — swipe-right-to-check gesture wrapper (touch events, direction-locked), used by Habits/Tasks rows
      BloomFallingFlowers.js   — Bloom theme's falling-petals decoration (shared, app-wide)
      QBankPractice.js         — extracted QBank Practice tab (was its own page, now embedded in Study)
      QBankManage.js           — extracted QBank admin question-bank manager
      AccessCodesManage.js     — admin-only redeem-code generator/list/revoke UI, embedded in Study's hidden "Access" tab (migration 015's RPCs)
      FlashcardsPractice.js    — Flashcards session hub/setup/practice-loop/weak-points-review
      FlashcardsManage.js      — Flashcards admin card importer (Basic + Cloze)
      FlashcardsLibrary.js     — studied-cards list (times studied, latest label)
      ThemeSwitcher.js, UnitPicker.js, Icons.js, NavActiveIndicator.js, SpringPress.js, PageHeader.js, Modal.js
      TodayStrip.js, useTodayStrip.js — legacy, now unused (superseded by the Today page) but left in place, harmless
      PracticeQuiz.js          — legacy standalone one-at-a-time MCQ quiz component; not imported/referenced anywhere in the current app (superseded by QBankPractice.js), left in place, harmless
    lib/
      supabaseClient.js
      topicData.js              — Cardio-Respiratory topic data + calcMastery/scheduling/calibration helpers
      units.js, unitDataFactory.js, unitData/*.js
      sounds.js
      flashcards.js              — cloze parsing (with hint support) + the escalating re-show interval engine (pure functions)
      celebrate.js                — shared "perfect day" celebration flood animation (used by Habits and Today)
  supabase/
    schema.sql
    migrations/002-017.sql
  TELEGRAM_SETUP.md            — step-by-step admin guide for wiring up the Telegram bot (BotFather, env vars, webhook registration, usage/caveats)
```

## Database schema (current state)

**Core tables** (unchanged from before): `modules`, `tasks` (legacy), `topic_progress`, `user_settings` (has `swipe_to_check` boolean).

**Tables from the previous stretch of work** (habits/tasks/flashcards/qbank-attempts — unchanged this round): `habits`, `habit_log`, `habit_tasks` (the real one-off Tasks table — name predates the Tasks feature, kept for backward compat), `flashcards`, `flashcard_sessions`, `flashcard_card_stats`, `qbank_attempts`. See in-repo `supabase/migrations/010–014` for exact column definitions.

**New this stretch:**
- `access_codes` — unchanged core design from migration 003 (still **zero RLS policies**, unreachable directly by any client), plus a new `label` column (migration 015) so generated batches can be tagged (e.g. "Suher batch — Aug"). The table stays locked down; it's opened up only through three new **security-definer** Postgres functions that re-check the caller's email server-side before touching anything:
  - `admin_generate_access_codes(unit_id, count, label)` — inserts up to 200 fresh random 8-char codes at once, returns them for copy/paste.
  - `admin_list_access_codes()` — every code with used/unused status, for the admin review table.
  - `admin_delete_access_code(code)` — deletes one code, only if still unused (redeemed codes are left alone as a record).
- `notes` — id, user_id, title, body, color (palette key like `"purple"`, mapped in-app to the active theme's own accent var — not a raw hex, so it stays coherent across all 5 themes), tag (freeform, optional), pinned, archived, trashed (all bool), created_at, updated_at (auto-kept-honest by a trigger, since the list sorts most-recently-edited-first Keep-style). RLS: owner-only (`auth.uid() = user_id`). Deliberately **not** linked to any unit/topic/module.
- `telegram_link_codes` — short-lived one-time codes the app generates so the admin can prove chat ownership via `/start <code>` to the bot. RLS restricted to the admin's email specifically (not just any owner), same defense-in-depth pattern as the access-codes functions.
- `telegram_links` — the resulting `telegram_chat_id <-> user_id` mapping (one row, admin-only). Only ever written by the webhook route via the service-role key, since the webhook has no Supabase user session of its own.

**Modified existing tables (this stretch):**
- `notes` (migration 017, additive to 016) — added `source` (`'app'`|`'telegram'`, default `'app'`) and `source_meta` (jsonb — e.g. pre-extracted links array from Telegram's message entities), so a Telegram-originated note can be told apart from one typed directly in the app and remembers which chat/message it came from.

## Navigation architecture

Two systems, both in `AppShell.js`, present on every page:

1. **Collapsible sidebar** — a single **Settings** flyout pinned to the top on every page. Settings contains: Theme + Night/Day (ThemeSwitcher), UI Sounds toggle, Swipe-to-check toggle, and — nested as "Actions" — Switch/Export/Reset/Log out, each shown only when the current page provides a handler for it. Below Settings, an optional module-specific sub-nav (Study's Tracker/Stats/QBank/Flashcards/History/Plan, plus a hidden **Access** item for the admin account; Habits' List/Month/Insights).
2. **BottomNav** — fixed bottom bar, now **five** items: Today / Study / Tasks / Habits / Notes, animated pill indicator, present on every page.

Both the decorative background blobs (Midnight Pulse) and the Bloom falling-flowers decoration are rendered once from `AppShell` (not per-page), so they're consistently visible everywhere the relevant theme is active.

## Today page (`src/app/today/page.js`)

Home/overview page, separate route from Study:
- Welcome hero with editable display name.
- **Today's Sessions preview** — a working **"Study" button** per session that hands the topic off to Study via `sessionStorage` (separate routes, no shared React state) and opens the same "what do you want to study with?" tool picker as Study's own session list, including a **Flashcards** option alongside Timer/QBank/Add-a-pass.
- **Study Streak card** — current/best streak, a 7-day activity strip, and a per-subject coverage breakdown.
- **Habits card** — reuses the exact same hero card component as the Habits page (ring + "Every habit checked off"-style messaging), plus a heatmap.
- **Schedule card** — combined tasks (due today only, via `due_date`) + today's habits, with clickable checkboxes (writes straight to `habit_log`/`habit_tasks`) and expandable subtasks per task.
- Completing the last habit for the day triggers the same "perfect day" celebration flood as the Habits page (shared via `lib/celebrate.js`).
- A completed (not abandoned) Flashcards session for a topic counts toward that topic's "today's session done" status, same as a QCM pass — wired via a `flashcardDoneTopicIdsToday` set on both Study and Today.

## Study module

**QBank and Flashcards are tabs inside Study**, not separate routes — clicking them in Study's sidebar just switches tabs, no navigation. The old standalone `/qbank` route is gone.

**Stats tab** merges the old separate Dashboard + Analytics tabs into one.

**History tab** has a 4-way filter: **All / Study / Quiz / Flashcards**. Quiz entries show an "Abandoned" badge when applicable; Flashcards entries show mastered/total + completed-vs-abandoned. A self-logged entry tagged "QCM practice" counts toward the Quiz bucket for filtering purposes even though it's stored as a regular topic entry.

**Study Time Trends** also picks up Flashcards session time (completed or abandoned — time spent studying counts either way, unlike "today's session done" which requires full completion).

**Passes-by-topic chart** — x-axis labels are horizontal, wrapped onto up to 3 short lines so long topic names don't get cropped. Tapping a point shows a tooltip with the exact pass count. The chart's scroll container is isolated (`min-width: 0` + explicit `width: 100%` + `touch-action: pan-x`) so swiping it doesn't drag the whole page.

**Plan → Calendar view** is a real 7-column week grid (weekday headers, every day gets a cell including rest days, today highlighted). Every scheduled item is shown grouped by status (Overdue/Review/New/Done) with internal per-cell scrolling — no "+N more" truncation.

**Unit heatmap** (Stats tab) shows the actual day-of-month number on each cell, and scales to fill the available card width.

**Access tab (admin only, new)** — a hidden seventh sidebar item (`{ key: "access", label: "Access", icon: IconLock }`, only added to the sub-nav when `isAdmin`), rendering `AccessCodesManage.js`. Lets the admin generate/list/revoke premium redeem codes from inside the app instead of the Supabase SQL Editor — see Database schema above for the underlying RPCs.

## QBank (`src/components/QBankPractice.js` + `QBankManage.js`)

- **"All units" option removed** from the practice setup — a unit is always required, defaulting to the active one.
- **Abandon button** on the practice-running screen — logs the run to `practice_history` as `status: 'abandoned'` instead of silently disappearing.
- **Per-question attempt logging** (`qbank_attempts`) on every finish/abandon — question, correct/incorrect, confidence, and the actual selected option index.
- **"Review Your Weak Points"** — a prominent, always-visible callout (disabled with an explanation when empty). Opens a read-only screen: each weak question shown with the full option list, correct answer highlighted green, your actual wrong pick highlighted red, no re-answering required. Reachable from both the setup screen and the results screen. Each item has a "Reviewed" dismiss button with a tap animation that marks it reviewed in the DB; a fresh wrong answer or fresh low-confidence answer on that same question automatically un-dismisses it.
- Live practice screen shows color-coded correct/incorrect highlighting on options but **no explicit "Correct answer"/"Your answer" text labels** — those are intentionally exclusive to the Review Your Weak Points screen.
- Re-clicking an already-selected answer option is a no-op (previously toggled it back off, which could silently clear the answer via a stray double-tap).
- Note: an older, simpler standalone quiz component (`PracticeQuiz.js`) still exists in the repo but is no longer wired up anywhere — QBankPractice.js is the live implementation.

## Flashcards (`src/components/FlashcardsPractice.js`, `FlashcardsManage.js`, `FlashcardsLibrary.js`, `src/lib/flashcards.js`)

**Not** Anki's calendar-based spaced repetition — this is **session-scoped drilling**. You pick topic(s) and a card pool, and cards you rate poorly come back later **within that same sitting**; a card only exits the session once rated Easy.

- **Card types**: Basic (front/back) and Cloze (`{{c::answer}}` or `{{c::answer::hint}}` — multiple blanks allowed per card, all hidden/revealed together as one card). While masked, a hint (if provided) shows in place of the answer.
- **Session setup**: pick one or more topics (each gets its own session — grouped by subject in the picker), card type filter (All/Basic/Cloze), pool (All cards / Weak only), order (Random/Never-studied-first/Weakest-first), and count.
- **Rating intervals** (session-relative, internal state only, never a visible countdown): Again escalates 1→3→7→15 min, Hard escalates 5→10→18 min, Normal is flat 10 min, Easy exits the session.
- **One active session per topic**, DB-enforced. Multiple topics run concurrently — a session hub lists them all with progress and "Continue"/"Abandon".
- **Visible timer** during practice (continuously ticking `mm:ss`, same pattern as QBank's). Saves correctly even if you exit mid-card.
- **Real 3D card flip** on tap/"Show answer" (perspective + rotateY, front/back as genuine separate faces with `backface-visibility: hidden`) — fixed bugs around Solar theme's sticker-tilt transform clobbering the flip, React DOM-node reuse between cards, one-directional flip, and a hover-transition/flip-transition collision on the faces.
- **Library** — every studied card, times-studied count, latest label, filterable.
- **"Review Your Weak Points"** — same read-only pattern as QBank's: cards last rated Again/Hard, shown with the answer directly, grouped by topic, with the same "Reviewed" dismiss + confirmation animation + auto-resurface-on-fresh-weakness behavior.
- Explicitly **does not** touch `topic_progress` or mastery — mastery is QCM-computed only. A completed (not abandoned) session counts toward "today's session done" for that topic, and session time feeds Study Time Trends.

## Habits

- Hero card ("X of Y done today" ring + motivational message), reused verbatim on the Today page.
- Current/best streak, 30-day rate, weekly/monthly summary, best-day-of-week stats, heatmap.
- Category color palette references the active **theme's own accent variables** (`var(--purple)`, `var(--pink)`, etc.) — new habits automatically get a palette coherent with whichever theme/mode is active. Existing habits keep their previously-saved hex colors.
- **Swipe-to-check** (opt-in via Settings): swipe right on a habit row to check it off. Implemented with native touch events and a direction lock, not raw Pointer Events.

## Tasks

- Subtasks with individual checkboxes; completing the last one auto-completes and removes the parent task.
- **Due date** field, shown on each row with overdue/due-today/upcoming color coding.
- Three grouping views: **Category/Project**, **Time**, and **Calendar** (Overdue/Today/Upcoming/No-date buckets).
- Same swipe-to-check support as Habits.
- Today page only shows tasks due **today** (exact date match), not all open tasks.

## Notes (`src/app/notes/page.js`) — new this stretch

A general-purpose, Keep-style scratchpad, intentionally separate from the study material tracked everywhere else in the app.

- **Views**: Notes / Archived / Trash, plus a search box (title + body + tag) and a tag filter row built from whatever tags currently exist on active notes.
- **Per-note actions**: pin (pinned notes float to their own section, unpins automatically on archive), archive/unarchive, trash/restore, permanent delete (with a confirm prompt), plus an optional color (mapped to the active theme's accent vars, not raw hex) and an optional freeform tag.
- **Links**: any URL pasted into a note body gets tappable link treatment; Telegram-sourced notes get pre-extracted, individually-labeled links straight from Telegram's own message entities (more reliable than regex, and handles multiple distinct links in one message).
- **Telegram integration (admin-only, RLS-enforced not just UI-hidden)**: from Notes, the admin can generate a one-time link code and either tap "Open in Telegram" or manually send `/start CODE` to the bot to connect a chat. Once linked, forwarding any message to the bot's DM creates a note within a second or two, tagged "Telegram" and amber-colored. Text messages save as-is; captioned media saves the caption as the body; uncaptioned media saves a placeholder note pointing back to Telegram (Notes is text-only for now — see "not built yet"). Full setup steps (BotFather, Vercel env vars, webhook registration, group-chat privacy caveat) are in `TELEGRAM_SETUP.md`.
- Backing route: `src/app/api/telegram/webhook/route.js`, the app's only serverless (non-client-component) route, authenticated via a Telegram-provided secret token header and using the Supabase service-role key to write on the admin's behalf.

## Design system

Five themes (Midnight Pulse/dark, Solar Pop/solar, Bloom/bloom, Sweet Stitch/stitch, Minimal/minimal), each light/dark. All colors are CSS custom properties. Progress bars are flat (no glow/pulse/spin effects) across every theme.

**Theme flash on page navigation** — fixed by defaulting `theme`/`colorMode` state to `null` (not `"dark"`) and skipping the class-apply effect until the real value has loaded from Supabase, so `<html>` simply keeps whatever the previous page already set during that gap instead of flashing to Midnight Pulse purple.

## What's explicitly NOT built yet

- Anki-style auto-splitting of multi-cluster cloze cards (`{{c1}}`/`{{c2}}` into separate cards) — explicitly decided against; all blanks in a cloze card show/hide together.
- Any card-count cap enforcement beyond what the person picks at session start.
- Full `isSessionDone`/flashcard-completion awareness in the Plan → Calendar view specifically (wired into Today and Study's session list/StudyHub, not into the calendar's day-completion indicators).
- Notes is **text-only** — photos/videos/documents forwarded via Telegram without a caption save only a placeholder note linking back to Telegram, not the media itself.
- Telegram → Notes is single-user/admin-only by design (one `telegram_links` row per user, and RLS restricts both Telegram tables to the admin's specific email) — not a general feature for every account.

## How to work with this user going forward

- She tests thoroughly on the live deployed site and reports back with **exact, literal symptoms**, often annotated screenshots — trace the actual code path implied, don't assume the obvious cause.
- She'll correct a misunderstanding directly and expects the correction to actually stick — don't re-apply an already-rejected interpretation.
- Wants **complete, working features**, not scaffolding, but is fine with iterative back-and-forth, including circling back to re-fix regressions.
- Prefers direct execution over lengthy discussion, but engages well with targeted clarifying questions (with concrete options) before a large new feature is built.
- Always explain *what* changed and *why*, and be explicit about whether a new SQL migration needs to be run before the code will work.
