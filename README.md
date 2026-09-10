# Cardio-Respiratory Medical Study Suite (Next.js + Supabase)

An all-in-one medical curriculum tracking and study suite built for medical students. Powered by **Next.js (App Router)** and **Supabase (PostgreSQL + Auth)**.

## Core Features

- **Curriculum Tracker**: Multi-unit tracking with multi-pass progress (1st pass, 2nd pass, review, mastered), confidence ratings, study timer with session logging, standalone pass-logging modal, and real-time mastery calculation.
- **Library (QBank & Flashcards)**:
  - **Question Bank**: Multiple choice, active recall, and timed exams with confidence calibration, attempt tracking, and weak-point review.
  - **Spaced Repetition Flashcards**: Basic and Cloze drilling with escalating re-show intervals.
  - **Admin Importers**: Direct JSON question bank and flashcard card importers for the administrator.
- **Visual Analytics & Insights**: Topic mastery donuts, revision velocity, topic breakdown, and comprehensive study session history logs formatted with human-readable hours and minutes (`1h 30m`).
- **Study Planner & Calendar**: Spaced review recommendations, weekly schedule, exam countdowns, and daily topic limits.
- **Dedicated Settings Page (`/settings`)**:
  - Appearance (Light Mode / Night Mode toggle)
  - Audio & Sound (synthesized UI sound effects master toggle + test sound button)
  - Curriculum & Goals (active subject switcher, target review passes goal stepper + presets)
  - Data Backups (full JSON data export, active unit progress reset)
  - Account and session details with one-click sign out
- **Admin Access Management (`/access`)**: Redeem-code generation, batch labeling, status tracking, and revocation.
- **Silent Moon Companion (`/sm/*`)**: Ambient wellness, meditation, and audio sleep/study routines.

## Running Locally

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

3. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Build & Verification

```bash
npm run lint
npm run build
```
