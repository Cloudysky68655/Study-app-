# Cardio-Respiratory Tracker — Project Overview

*Use this document to bring a new chat up to speed. It documents the application architecture, routing, database schema, design system, and operational guidelines.*

## What this is

A comprehensive, multi-device medical study suite and curriculum tracker designed for medical students (originally built for first-year medicine at the University of Algiers 1). Built with **Next.js (App Router) + Supabase (Postgres + Auth)**, it provides an all-in-one study platform:

- **Study / Topics Tracker** (`/study`, `/tracker`) — Multi-unit curriculum tracking with multi-pass progress (1st pass, 2nd pass, review, mastered), confidence ratings, study timer with session logging, standalone pass-logging modal, and real-time mastery calculation.
- **Library** (`/library`, `/qbank`, `/flashcards`) — Unified study content hub containing:
  - **QBank** — MCQ question bank practice with multiple choice, active recall, timed exams, confidence calibration, attempt logging, and "Review Your Weak Points".
  - **Flashcards** — Spaced repetition drilling with Basic and Cloze card formats, escalating re-show intervals, topic filtering, and review library.
  - **Content Management** (admin-only) — In-app JSON question bank and flashcard card importers.
- **Stats & Analytics** (`/stats`, `/dashboard`, `/log`, `/history`) — Visual analytics dashboard with mastery donuts, revision velocity, topic breakdown, and comprehensive study session history logs formatted with human-readable hours and minutes (`1h 30m`).
- **Study Planner & Calendar** (`/plan`, `/schedule`) — Weekly study schedule, spaced review recommendations, examination countdowns, and configurable daily topic targets.
- **Settings** (`/settings`) — Dedicated full-page settings center for:
  - Appearance (Light / Night Mode toggle)
  - Audio feedback (synthesized UI sound effects toggle + interactive sound tester)
  - Curriculum & goals (current unit display, subject switcher, target review passes goal stepper and presets)
  - Data management (complete JSON data export, active unit progress reset)
  - Account and session information with one-click sign out
- **Access Codes** (`/access`, admin-only) — Built-in premium redeem code generation, batch labeling, status tracking, and revocation.
- **Silent Moon Companion** (`/sm/*`) — Specialized audio, meditation, and wellness sub-module for deep focus and sleep routines.

The site includes premium-unit lock infrastructure (redeem codes, admin generation panel, and coming-soon status toggles). The admin account (`maghrabiasma11@gmail.com`) automatically has full access; non-admin accounts access free units directly and redeem codes for premium units.

---

## Tech Stack

- **Next.js 15+ (App Router)** with React client architecture (`"use client"` across interactive views)
- **Supabase**: PostgreSQL database + Supabase Auth via `@supabase/ssr` (`createBrowserClient`)
- **Tailwind CSS v4** + custom stylesheet in `src/app/globals.css` with responsive utilities and theme variables
- **Recharts** for reactive mastery charts and analytics
- **Audio Synthesis**: Hand-crafted Web Audio API synthesizer in `src/lib/sounds.js` (zero external sound asset dependencies)
- **Icons**: `lucide-react` icons unified in `src/components/Icons.js`
- **Deployment**: Production build verified for Cloud Run / Vercel (`npm run build`)

---

## Navigation & Page Routing

The application uses a unified navigation structure provided by `src/components/AppShell.js` and `src/components/BottomNav.js`:

1. **Desktop Sidebar Rail (screens ≥ 768px)**:
   - Vertical navigation rail with active state indicators and indicator dots.
   - Pinned links: Today/Study, Library, Stats, Plan, Access (admin only).
   - **Pinned Settings Link** at the bottom of the rail leading directly to `/settings`.
2. **Mobile Floating / Bottom Navigation Bar (`BottomNav.js`)**:
   - Touch-friendly bottom bar with icon and label for each primary area:
     - Today (`/today` -> `/study`)
     - Library (`/library`)
     - Stats (`/stats`)
     - Plan (`/plan`)
     - **Settings** (`/settings`)
3. **Route Mapping**:
   - `/` — Landing page with session verification; redirects to `/study` if authenticated, `/login` if unauthenticated.
   - `/study` — Primary study suite interface mounting `StudySuite.js`.
   - `/tracker` — Direct alias to Study Topics Tracker view.
   - `/library`, `/qbank`, `/flashcards` — Mounts StudySuite with the Library tab active.
   - `/stats`, `/dashboard`, `/log`, `/history` — Mounts StudySuite with the Stats / History tab active.
   - `/plan`, `/schedule` — Mounts StudySuite with the Planner tab active.
   - `/settings` — Dedicated Settings page mounting `SettingsView.js`.
   - `/access` — Admin-only Access Codes management view.
   - `/login`, `/signup`, `/terms` — Supabase authentication and terms pages.
   - `/sm/*` — Silent Moon companion routes.

---

## Dedicated Settings Architecture

The Settings experience was converted from an ephemeral slide-up sheet into a first-class page (`/settings`):

- **Route Component**: `src/app/settings/page.js` renders `<StudySuite initialTab="settings" activeNav="settings" />`.
- **View Component**: `src/components/SettingsView.js` houses all preferences:
  - **Appearance**: Light Mode vs. Night Mode toggle with instant DOM updates (`html.mode-dark` / `html.mode-light`) and cloud persistence.
  - **Audio & Sound**: Master switch for Web Audio sound effects, plus a live "Test Sound" button to verify volume and output.
  - **Curriculum & Goals**: Subject switcher dialog trigger (`UnitPicker.js`), review pass goal stepper (3, 5, 7, 10 pass presets + increment/decrement), and planner link.
  - **Data & Backups**: JSON progress exporter and unit progress reset with safety confirmation modal.
  - **Session & Account**: Active user email and session details display with sign-out action.

---

## Directory Structure (Current Clean State)

```
project/
  src/
    app/
      page.js                         — Root entry, session-aware redirect
      layout.js                       — Root layout with fonts, metadata, and SpringPress
      globals.css                     — Core styling, CSS variables, dark/light modes, components
      login/page.js, signup/page.js   — Authentication pages
      terms/page.js                   — Terms of use & privacy consent
      today/page.js                   — Redirects to /study
      study/page.js                   — Main study suite entry
      tracker/page.js                 — Alias to study tracker
      library/page.js                 — Study library (QBank + Flashcards)
      qbank/page.js                   — Direct route to QBank
      flashcards/page.js              — Direct route to Flashcards
      stats/page.js                   — Visual analytics and insights
      dashboard/page.js, log/page.js, history/page.js — Aliases to stats/logs
      plan/page.js, schedule/page.js  — Study planner and calendar
      settings/page.js                — Dedicated full-page Settings route
      access/page.js                  — Admin access code management route
      api/telegram/webhook/route.js   — Telegram integration webhook
      sm/                             — Silent Moon wellness sub-app routes
    components/
      AppShell.js                     — Shared layout: desktop rail sidebar + bottom nav
      BottomNav.js                    — Mobile bottom bar with Today, Library, Stats, Plan, Settings
      StudySuite.js                   — Core study orchestrator (Tracker, QBank, Flashcards, Stats, Plan, Settings)
      SettingsView.js                 — Full-page settings view (Appearance, Audio, Goals, Backups, Account)
      QBankPractice.js                — MCQ practice loop, confidence grading, attempt logging
      QBankManage.js                  — Admin MCQ question bank manager & JSON import
      FlashcardsPractice.js           — Spaced repetition flashcard session runner (Basic & Cloze)
      FlashcardsManage.js             — Admin flashcard importer
      FlashcardsLibrary.js            — Studied cards index with review frequency
      AccessCodesManage.js            — Admin redeem-code generator, search, and revocation
      UnitPicker.js                   — Subject/curriculum switcher with coming-soon & unlock states
      PageHeader.js                   — Consistent header component across views
      Modal.js                        — Shared dialog modal component
      BloomFallingFlowers.js          — Ambient falling petal animation
      SpringPress.js                  — Press interaction feedback
      Icons.js                        — Centralized Lucide icon exports
      sm/                             — Silent Moon components (TabBar, TopBar, Icons)
    lib/
      supabaseClient.js               — Browser Supabase client (`createBrowserClient`)
      supabaseAdmin.js                — Server-side service-role client
      topicData.js                    — Default topic definitions and mastery calculations
      units.js                        — Subject units index (Cardio, Genetics, Urinary, etc.)
      unitDataFactory.js              — Generator for standardized unit topic schemas
      unitData/*.js                   — Specific curriculum topic data files
      flashcards.js                   — Spaced repetition engine & cloze parsers
      sounds.js                       — Web Audio API sound synthesizer
      palettes.js                     — Color palette definitions and contrast ink calculations
      accents.js                      — Theme accent utility helpers
      smContent.js, smHabits.js       — Silent Moon content and tracking helpers
    styles/
      silentmoon.css                  — Silent Moon specific styles
  supabase/
    schema.sql                        — Baseline database schema
    migrations/*.sql                  — Incremental database migrations
  prompts/
    qbank-generation-prompt.md        — AI generation prompt for QBank schema
    flashcards-generation-prompt.md   — AI generation prompt for Flashcards schema
  TELEGRAM_SETUP.md                   — Telegram integration guide
  PROJECT_OVERVIEW.md                 — This system architecture document
  README.md                           — Setup and run instructions
  metadata.json                       — Application metadata and capabilities
```

---

## Code Cleanup & Removed Legacy Files

All obsolete, redundant, or orphaned components and libraries have been safely removed:

1. **Superseded by Dedicated Settings Page**:
   - `src/components/SlideUpSheet.js` — Removed (modal slide-up sheet is no longer used for settings).
   - `src/components/SidebarSettings.js` — Removed (superseded by `src/components/SettingsView.js`).
   - Obsolete CSS rules for `.sheet-overlay`, `.sheet-panel`, and `.sidebar-settings-*` in `globals.css` were pruned.
2. **Unused / Legacy Components**:
   - `src/components/Illustrations.js` — Removed (unused vector graphics).
   - `src/components/ModuleSwitcher.js` — Removed (superseded by `UnitPicker.js`).
   - `src/components/NavActiveIndicator.js` — Removed (replaced by CSS active indicator classes).
   - `src/components/PageSkeleton.js` — Removed.
   - `src/components/PracticeQuiz.js` — Removed (superseded by `QBankPractice.js`).
   - `src/components/SidebarToggle.js` — Removed.
   - `src/components/StreakCelebration.js` — Removed.
   - `src/components/SwipeRow.js` — Removed.
   - `src/components/ThemeSwitcher.js` — Removed (theme logic integrated into `SettingsView.js`).
   - `src/components/TodayStrip.js` — Removed.
   - `src/components/study/` (`HistoryTab.js`, `ManageTab.js`, `PracticeTab.js`, `PracticePanel.js`) — Removed (legacy prototype components superseded by root components).
3. **Unused Library Utilities**:
   - `src/lib/appearance.js` — Removed.
   - `src/lib/useTodayStrip.js` — Removed.
   - `src/lib/useTodaySummary.js` — Removed.
   - `src/lib/habitStreaks.js` — Removed.

---

## Database Schema Overview

The application utilizes Supabase Postgres with Row Level Security (RLS):

- **`topic_progress`**: Tracks per-user study progress on topics (first pass, second pass, third pass, mastered, confidence, notes).
- **`user_settings`**: User preferences including `color_mode` (dark/light), `sound_enabled`, `target_passes`, and `premium_units`.
- **`qbank_questions`** & **`qbank_attempts`**: Question repository and user practice attempt history.
- **`flashcards`**, **`flashcard_sessions`**, **`flashcard_card_stats`**: Flashcard decks, review logs, and per-card mastery intervals.
- **`access_codes`**: Premium unlock codes, secured via security-definer Postgres RPCs (`admin_generate_access_codes`, `admin_list_access_codes`, `admin_delete_access_code`).
- **`app_config`**: Global application configuration including `coming_soon_units` list managed by the admin account.

---

## Admin Account & Security

- **Admin Email**: `maghrabiasma11@gmail.com`
- Server-side security functions check caller's JWT email directly in SQL for code generation and configuration updates.
- Client-side checks dynamically reveal administrative controls:
  - Access Codes tab in Study navigation
  - Question Bank & Flashcard content importers
  - "Coming Soon" unit status toggles in the Unit Picker

---

## Verification & Build Compliance

- Linting passes cleanly via `npm run lint`.
- Production build compiles cleanly via `npm run build`.
- Zero broken imports or unresolved references.
