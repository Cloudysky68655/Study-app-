# E2E tests — setup guide

Runs a real headless browser against your **live deployed site**
(`getstudying.vercel.app`), using a disposable test account created and
destroyed on every run. Triggered manually from GitHub — nothing runs
automatically on push.

## Why GitHub Actions and not Claude running it directly

Claude's sandbox has no internet access, so it can't reach your live
Supabase project or deployed site directly. GitHub Actions runs in
GitHub's own cloud, which does have internet access, and is triggered by
a button click — closest equivalent to "run it when I ask," just
triggered from GitHub's UI instead of from inside a Claude chat.

## One-time setup

1. **Add 3 secrets to your GitHub repo** (not Vercel — this is separate):
   Repo → **Settings** → **Secrets and variables** → **Actions** →
   **New repository secret**, one at a time:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | from Supabase → Project Settings → API |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the publishable/anon key, same page |
   | `SUPABASE_SERVICE_ROLE_KEY` | the secret/service_role key, same page |

2. **Push this `tests/` folder and `.github/workflows/e2e-tests.yml`**
   via GitHub Desktop, same as any other change.

## Running it

1. On GitHub, go to the **Actions** tab.
2. Click **E2E Tests** in the left sidebar.
3. Click **Run workflow** (top right) → **Run workflow** again to confirm.
4. Wait ~1-2 minutes, then click into the run to see live logs — each
   step prints ✅ or ❌ with a reason.
5. If anything failed, scroll to the bottom of that run's page —
   there's a downloadable **e2e-results** artifact with a screenshot of
   the page at the moment each failure happened.

## What it actually checks

1. Creates a disposable test account directly via Supabase's admin API
   (pre-confirmed — real signup needs a real inbox to click a
   confirmation link, which this can't do, so account creation is
   scripted separately from the signup **form test**).
2. Signup page — confirms the form renders and can be filled (doesn't
   submit, since that needs email confirmation).
3. Login — real end-to-end, typing credentials into the actual form.
4. Tasks — add one, add a subtask, complete it.
5. Habits — add one, check it off for today.
6. Notes — create one, pin it, archive it.
7. QBank — open practice, start a session, answer a question (skipped
   with a clear reason if the active unit has no imported questions yet).
8. Flashcards — open session setup (doesn't fully run a session yet).
9. Study — attempts to open "log a pass."
10. Cleanup — deletes the test account and, via cascade, all the rows it
    created (tasks/habits/notes/etc.) so nothing lingers in your database.

## Honest limitation

I wrote every selector by reading the actual component source rather
than guessing, but I could not run this myself before handing it to you
— my sandbox can't reach your live site to dry-run it. **The first run
may surface a mismatched selector or two**, especially around the more
interactive flows (QBank option-clicking, the habit grid's per-day
checkboxes, Flashcards' multi-step topic picker). If a step fails on
first run, paste me the failure message and I'll fix that specific
selector — much faster to correct one real failure than to have
guessed everything blind and had it silently pass on the wrong thing.
