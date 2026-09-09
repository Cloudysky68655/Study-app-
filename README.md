# Cardio-Respiratory Tracker (Next.js + Supabase)

This replaces your single-file HTML tracker with a real multi-page, multi-device app:
login/signup, a Postgres database (via Supabase) instead of `localStorage`, and your
four themes ported as CSS variables.

## 1. Set up the database

1. Go to your Supabase project → **SQL Editor** → **New query**.
2. Open `supabase/schema.sql` in this folder, paste its entire contents in, and click **Run**.
   This creates the tables (`modules`, `tasks`, `logs`, `user_settings`) and locks each
   row to its owner (Row Level Security), so users can only ever see their own data.

## 2. Install and run locally

Open a terminal in this folder and run:

```bash
npm install
npm run dev
```

Then open http://localhost:3000 — it'll redirect you to `/login`. Click "Sign up",
create an account (Supabase will email a confirmation link — check your inbox), confirm,
then log in.

Your Supabase URL and public key are already filled in in `.env.local`.

## 3. Push to GitHub

```bash
git init
git add .
git commit -m "Initial Next.js + Supabase tracker"
git branch -M main
git remote add origin <your-new-github-repo-url>
git push -u origin main
```

(`.env.local` is gitignored on purpose — it won't be pushed.)

## 4. Deploy on Vercel

1. Go to vercel.com → **Add New Project** → import this GitHub repo.
2. In the import screen, expand **Environment Variables** and add:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://acxkuejfngplexowytzg.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon/publishable key
3. Click **Deploy**. Every future `git push` auto-redeploys.

## What's included right now

- Email/password auth (Supabase Auth)
- Modules (subjects) and tasks, stored per-user in Postgres
- Status cycling per task: new → learning → review → mastered
- Overall mastery progress bar
- Your 4 themes (dark/solar/bloom/stitch) as a switcher, saved per-user in the database

## What's not ported yet (from your original file)

Your original tracker had a lot more: the auto-schedule generator, pass-count/mastery
scoring rules, the daily log view, deadline countdown, data export, and the background
click-effects (flower bursts, sparks, etc.). The architecture now supports all of it —
it's just a matter of porting each piece from your old `<script>` logic into a React
component that reads/writes Supabase instead of the local `state` object. Happy to do
these next, one at a time, once this base is running for you.
