# Cardio-Respiratory Tracker — Project Overview

*Use this document to bring a new Claude chat up to speed. Paste the whole thing at the start of the conversation, then attach the current project zip.*

## What this is

A multi-device life/study tracker for a first-year medical student (University of Algiers 1), originally a single-file HTML study tracker, now a full **Next.js + Supabase** web app. It's a small "life OS" with six areas under one shell:

- **Today** — home/overview page. Preview of today's study sessions, the habit completion hero card, study streak + subject breakdown, and a combined tasks/habits schedule — grouped by **Category or Time** (user's choice), with each group's display order freely reorderable via ▲▼ controls, persisted per-mode in localStorage.
- **Study** — multi-unit MCQ/anatomy study tracking, spaced-repetition scheduling, Tracker/Stats/History/Plan, study timer, standalone pass-logging, QBank and Flashcards as tabs, and (admin-only) an **Access Codes** tab for generating/revoking premium redeem codes in-app.
- **Tasks** — one-off task list with subtasks, due dates, category/project + time-slot tagging, and three grouping views: Category/Project, Time, and a real 7-day-week **Calendar** month grid (weekday headers, prev/next nav, per-day task-count badges, tap a day to see its tasks). Each task row now renders as a solid, deterministically-colored block from the active palette (see "Style + color palette system" below).
- **Habits** — daily habit tracking with streaks, heatmap, weekly/monthly summary, category color-coding, swipe-to-check gestures (opt-in). Each habit row is now a full solid-color block using that habit's own chosen color (which is itself a palette-role CSS var, so it repaints automatically when the palette changes), and the Current Streak / Best Streak / 30-Day Rate stat cards each use a different palette color.
- **QBank** (Study tab) — MCQ practice, confidence calibration, per-question attempt logging, abandon support, "Review Your Weak Points."
- **Flashcards** (Study tab) — Anki-style session drilling, Basic and Cloze card types, escalating re-show intervals, Library view, own "Review Your Weak Points."
- **Notes** (bottom-nav tab) — a fully freeform Google Keep-style scratchpad, deliberately **not** linked to any unit/topic. Color-coded cards (7 theme-aware accent colors + default, pulled from the same palette-role vars as everywhere else), pin-to-top, tag/category filter chips, Archive and Trash as separate soft-delete views (never hard-deletes without an explicit action), search across title/body/tag, and a **Telegram integration** (admin-only) that turns forwarded Telegram messages into notes automatically, including making the actual clickable words/phrases from the original message tappable in place (not a disconnected link-button row).

The site currently has premium-unit lock infrastructure fully built (redeem codes, admin generation panel) but **is not currently charging anything — every unit is free to use**, by deliberate choice, not a technical limitation. The admin account (`maghrabiasma11@gmail.com`) always sees every unit unlocked client-side; everyone else needs a redeem code per unit.

## Tech stack

- **Next.js (App Router)** + React, all client components (`"use client"`)
- **Supabase**: Postgres DB + Auth (email/password), via `@supabase/ssr`'s `createBrowserClient`
- **Deployed on Vercel** (`getstudying.vercel.app`), auto-deploys on push
- **Code hosted on GitHub**, pushed via **GitHub Desktop only** — no terminal git workflow. Every code change is delivered as a **full project zip**.
- Tailwind base + a large custom `globals.css` with the style + palette system (see below)
- Sounds: hand-synthesized Web Audio API tones in `src/lib/sounds.js`
- No charting library — all charts are hand-rolled inline SVG
- A Next.js API route (`src/app/api/telegram/webhook`) for the Telegram bot integration, and a service-role Supabase admin client (`src/lib/supabaseAdmin.js`, server-only) used exclusively by that route
- A Playwright E2E test suite (`tests/e2e/`), run manually via a GitHub Actions workflow (`.github/workflows/e2e-tests.yml`)

## Style + color palette system (rebuilt this stretch)

The old 5-theme system (each theme bundling a fixed shape/effect style *and* a fixed color palette together) was split into two fully independent choices:

1. **Style** (`theme-*` class, 3 selectable options — down from 5): controls card shape/effects only (rounded corners, rotation, fonts). Selectable via the 3 dots in Settings:
   - **Aurora Pulse** (`theme-dark` internally — renamed display-only, key unchanged to avoid a large refactor)
   - **Solar Pop** (the "cartoony" style)
   - **Minimal**
   - Bloom and Sweet Stitch were retired from the picker (their CSS still exists in `globals.css`, just unreachable from the UI — lower-risk than deleting it outright).
2. **Palette** (`palette-{key}` class, nullable): an independent color choice layered on top of whichever style is active. 18 palettes, each with a real light **and** dark variant, defined in `src/app/globals.css` and mirrored (for the picker UI) in `src/lib/palettes.js`. `null`/no palette selected = falls back to the style's own original built-in colors, so this shipped fully non-breaking for existing accounts.
3. **Color mode** (`mode-dark`/`mode-light`) — unchanged, still the night/light toggle.

All three combine on `<html>` as `theme-{style}${palette ? ' palette-'+key : ''} mode-{mode}`. `ThemeSwitcher.js` owns applying the class and persisting all three to `user_settings` (`theme`, `palette`, `color_mode` columns); every page (Study, Today, Tasks, Habits, Notes) holds its own `theme`/`colorMode`/`palette` state and passes it down via `themeProps`, so switching persists app-wide, not per-page.

**Each palette's 4 swatch bands map to 4 distinct CSS var roles** (`--purple`, `--pink`, `--orange`, `--amber`) instead of collapsing to one repeated "hero" color — this was a deliberate fix after early versions read as one dominant hue reused everywhere. `--green`/`--yellow`/`--red` are derived from those. Every one of those 7 roles also has a matching **`-ink` variable** (e.g. `--purple-ink`) — a real white/near-black text color computed from that role's own luminance at generation time — so any component can fill a card solid with a palette color and get guaranteed-readable text via `inkFor()` (`src/lib/palettes.js`) without per-component contrast logic.

**No gradients anywhere in the accent system** — per explicit preference, `--grad-primary`/`--grad-warm` and every other multi-color blend (the welcome banner, buttons, background ambient blobs, card glass sheen, the retired Sweet Stitch rainbow bar, Habits' "perfect day" shimmer) were all flattened to solid colors. If a future change reintroduces a gradient anywhere, that's a regression against explicit instruction, not a stylistic default to fall back on.

**Colored-block redesign (in progress)** — per reference screenshots the user provided (Habitz app, a colorful list app), the goal is for each card/row/tile to be its own flat block of a *different* palette color, evenly distributing the whole palette across a page, rather than a neutral card with small colored accents. **Done so far:** Habits (every row + all 3 stat cards), Tasks (every row, deterministic per-task color via `roleForId()`), Today (new `.today-stat-strip` — 4 tiles cycling `ROLE_CYCLE`, see below), Study (new "Subject progress" `.subj-block` list — was a neutral thin-progress-bar list, now flat colored blocks cycling `ROLE_CYCLE`). **Not yet done:** Notes composer/cards and chip/badge/tag styling sitewide haven't had a dedicated pass since the flat-card system landed (may already look fine incidentally since Notes already used palette-role colors — needs a live visual check, not assumed done). Notes' per-note color picker already effectively satisfies the *concept* of this pattern since users manually pick from the same 7 palette roles.

## Reference-matching redesign (new, this stretch — separate effort from the palette system above)

The user is now driving a **UI reconstruction pass** against a mood board of external reference apps (mainly "Habitz" — a Portuguese-language habit tracker with flat colored rows, bottom nav with icon-above-label + underline active indicator — and a couple of dashboard apps like "CyberClinic"/"FoxHR" with bold-number colored-tile stat strips). Explicit goal stated by the user: **"I want to look at your build and can't distinguish it from these references."** Full methodology brief (inspect-first, reference-is-source-of-truth-for-visuals/app-is-source-of-truth-for-functionality, page-by-page reconstruction, no AI-invented design drift) was provided as a system-prompt-style document at the start of this effort — treat it as still-active guidance for any further work in this direction, not just a one-time instruction.

**Root-cause finding or things looked barely different even after real component-level changes:** the base `.card` rule (used by literally every page) was still a frosted-glass panel — `backdrop-filter: blur(22px) saturate(180%)`, soft glowing top-border, drop shadow — which is the opposite of the references' flat/matte/no-blur look. Fixing shared primitives (`.card`, `.btn-primary`, `.bg-fluid .blob` ambient opacity) mattered far more than adding new one-off components, since those cascade to every page at once. Lesson for future sessions: when a reference-matching pass "doesn't feel different," check the shared base primitives before adding more new markup.

**Done so far (this stretch), in order:**
1. `.bottom-nav` rebuilt from a floating pill island into a full-width flush bar, icon-above-label, thin underline active-indicator (was a full pill background) — matches Habitz's nav exactly.
2. New Today `.today-stat-strip` (see above).
3. Base `.card` flattened app-wide: no blur/saturate, no glowing border, solid `var(--panel-solid)` background, near-flat shadow, bigger radius (26px).
4. `.btn-primary` flattened: solid `var(--purple)` fill (was `--grad-primary`), no glow shadow, pill radius, heavier weight (800).
5. `.bg-fluid .blob` ambient background glow opacity dropped from `.4` to `.12` in the default theme (already `.12` in other themes — default was the outlier).
6. Study's Subject progress list converted to `.subj-block` colored blocks (see above).
7. `PageHeader.js` typography tightened — bolder weight, tighter letter-spacing on `h1`, eyebrow label switched from accent-amber to neutral `var(--soft)` to match the reference's quieter small-caps labels.

**Not yet done / likely next:** further live-usage-driven correction — this is working as intended now (see v5 below, caught directly from a live screenshot).

**v5 (real regression, caught from a live annotated screenshot — "I hate this gradient" on the Today welcome banner):** the base `--grad-primary`/`--grad-warm` vars were flat by v2, but **all 18 palettes independently redefined `--grad-primary` and `--grad-warm` as real 4-stop `linear-gradient()`s** in their own `html.palette-*` blocks — these silently override the base the moment any palette is selected, so every palette user was seeing a real gradient on `.tv-welcome` (and anywhere else those vars are used) the entire time, regardless of the v2–v4 flattening work. Root cause: I'd only grepped/checked the base `:root` and default-theme rules earlier, not every palette override — lesson reinforced in the overview now: **always `grep -rn "linear-gradient\|radial-gradient\|conic-gradient" src/` across the whole tree**, not just the file section being edited, before declaring "no gradients" done. Fixed via a scripted regex replace: all 36 `linear-gradient(...)` definitions (18 palettes × 2 vars) replaced with `var(--purple)` / `var(--amber)` respectively — solid, already-defined palette-role colors, so each palette still looks distinctly itself, just flat. Verified with a full-tree grep afterward: zero `*-gradient(` matches left anywhere in `src/`.

**v6 ("this doesn't change with color palette" — heatmap legend + a full-tree hardcoded-purple sweep):** the v5 fix only covered *literal `*-gradient()` functions*. This round covers a different, related bug class: **decorative accents hardcoded to the default theme's specific purple hex (`#8b5cf6`/`rgba(139,92,246,...)`) instead of referencing `var(--purple)`**, so they stayed visually frozen regardless of which of the 18 palettes was active. Caught directly from a live screenshot circling the Study → Stats heatmap legend swatches (still purple under the Peach/Solar palette shown). Full-tree grep found this was not isolated to the heatmap — fixed everywhere found:
- Study's "Passes by topic" heatmap legend (`.hm1`/`.hm2`/`.hm3`) — now `color-mix(in srgb, var(--purple) N%, transparent)` at 3 opacity steps instead of fixed rgba.
- Habits' heatmap cells (`.h-hcell[data-level]`) — same fix, also made the 3-level progression internally consistent (was inconsistently amber/purple/amber before).
- Tasks/Study schedule "filled" day cells (`.sched-day.filled`), the real calendar's "is today" highlight (`.real-cal-cell.is-today`), the sidebar's active-nav liquid indicator glow, the Today welcome banner's drop shadow, the Study session timer button's glow, three inline-styled badges in Study ("N topics", "Quiz", "Today"), the topic-title text glow, and the default (non-Solar/Bloom/Stitch) tap celebration ripple effect — all switched from hardcoded hex/rgba to `var(--purple)` or `color-mix(in srgb, var(--purple) N%, transparent)`.
- **Deliberately left alone, confirmed correct:** `.theme-dot.dot-dark` (a fixed preview swatch in the theme picker — supposed to always show that exact color), `.today-hero` (confirmed dead CSS, unused in any JSX), and Bloom/Solar's own burst-effect colors (those are that Style's own fixed decorative identity, same category as Solar's hard-shadow card border — intentionally not palette-reactive, per the Style/Palette split described above).

Process takeaway added to this doc for future sessions: a "not tracking the palette" bug is a **different bug class** from a "there's a real gradient" bug — checking for one doesn't catch the other. Both need their own full-tree grep (`linear-gradient\|radial-gradient\|conic-gradient` for the former, the default theme's own hex/rgb literals like `139,92,246`/`#8b5cf6` for the latter) before calling either "done."

Left untouched, correctly (both v5 and v6): Solar Pop's hard drop-shadow + border + slight card rotation on `.tv-welcome`/`.card`, and Bloom/Solar's own tap-burst colors — these are that Style's own intentional fixed decorative identity (one of the 3 selectable Style options, orthogonal to Palette), not a leftover bug.

**v7 (explicit user preference, not a bug fix):** the base `.card` flatten from v2 was applied app-wide, including Aurora Pulse dark mode (`theme-dark.mode-dark`) — the user said she actually likes that theme's *original* frosted-glass card look (`backdrop-filter: blur(22px) saturate(180%)`, soft top-border highlight, glowing hover shadow) and wants it back, specifically for that one theme+mode combo. Restored via a scoped `html.theme-dark.mode-dark .card` override (base rule + matching hover-state override) sitting after the flat base `.card` rule, so it wins by CSS specificity/order without touching any other theme or Aurora Pulse's own light mode (`theme-dark.mode-light`, which correctly stays flat — it was already carved out separately before this stretch). Every other theme (Solar, Bloom, Stitch, Minimal) is unaffected and stays flat per the reference-matching work.

**v4 additions (chips/badges/notes/hover consistency pass):**
8. `.note-card` flattened to match the app-wide `.card` treatment — was still `var(--panel)` (translucent in the default dark theme) with a visible border; now solid `var(--panel-solid)`, no border, bigger radius (20px), flat shadow.
9. `.note-tag-filter-chip.active` was still `var(--grad-primary)` — switched to solid `var(--purple)` + `var(--purple-ink)` text for guaranteed contrast, consistent with every other palette-role fill in the app.
10. `.tv-badge` background was a hardcoded `rgba(255,255,255,.08)` (invisible/wrong in light themes) — switched to `var(--panel-solid)`.
11. `.note-tag-chip` and `.note-toolbar-btn:hover` were hardcoded translucent-white overlays (same light-theme bug as #10) — switched to `rgba(var(--shadow-rgb),.08)`, which is already the app's theme-aware pattern for subtle fills.
12. **Real regression catch:** `.card:hover` (in the `@media (hover:hover)` block) still had the old glowing box-shadow + `inset 0 1px 0 rgba(255,255,255,.16)` highlight left over from the glass-panel era — this was silently fighting the flat `.card` base rule from v2/v3 on every hover. Flattened to a plain soft shadow, no inset highlight.

Everything above was verified by reading the CSS/JSX directly (incl. a script-based JSX tag-balance check on every file touched), not by rendering — same caveat as before, no npm/build access in this sandbox.

Helper functions live in `src/lib/palettes.js`: `PALETTES` (the 18-entry list w/ swatch previews), `getPalette(key)`, `inkFor(colorVar)` (returns the matching auto-contrast ink var), `ROLE_CYCLE` (stable 7-role round-robin order), `roleForId(id)` (deterministic hash-based role assignment for items without a manually chosen color).

## Free-tier reality check (discussed previously, worth remembering)

- **Supabase free tier** (500MB DB storage, 5GB bandwidth/month, 50k MAU, auto-pauses after **7 days of inactivity**): storage is not a near-term concern for a text-only app like this. The **actual** near-term risk is the 7-day auto-pause killing the site during any gap in usage (e.g. a school break), unrelated to content volume.
- **Vercel Hobby plan explicitly bans commercial use.** The app currently charges nothing, so this isn't live right now — but the moment premium units are actually sold again, this technically applies. Low realistic enforcement risk at personal scale, but not zero.
- **Stripe does not support businesses based in Algeria directly** — would need a foreign entity (commonly a US LLC via a formation service) to use it properly. This is why the app's premium flow was built around manual cash + redeem codes in the first place, not just a workflow preference.

## Critical workflow constraints (read before doing anything)

1. **Always deliver a full zip of the whole project folder**, never individual files.
2. **Any new/changed SQL must be a copy-pasteable code block** for Supabase's SQL Editor — migrations are run manually there. If a migration hasn't been run, dependent features will hard-fail.
3. Migrations are numbered sequentially in `supabase/migrations/`. **Current highest: `018_palette.sql`** (adds a nullable `palette` text column to `user_settings`; `null` = use the style's built-in colors, fully backwards compatible). Next new migration should be `019_...sql`.
4. Before editing any file, view/grep it first. This codebase has a lot of interdependent state across a handful of very large files (`study/page.js` is ~2,600+ lines, `globals.css` is ~1,600+ lines); assumptions about structure are often wrong.
5. After any nontrivial edit, sanity-check syntax before packaging: brace/paren counts, a regex-based `<div>`/`</div>` balance check on every touched file, a `node --check` pass on any `.js`/`.mjs` file, and (for CSS) an `{`/`}` count on `globals.css` specifically since it's large enough that a mismatched brace is easy to miss by eye.
6. **Verify the zip before sending it.**
7. The user tests thoroughly on the live deployed site and reports back with **exact, literal symptoms**, often annotated screenshots — trace the actual code path implied, don't assume the obvious cause. Several real bugs were only found this way: a CSS specificity bug where `.h-add-card input[type=text]{width:100%}` was silently overriding a more specific `.h-icon-pick-btn{width:46px}` and causing the habit-form category/icon fields to visually overlap and feel unclickable; a hardcoded `title="Cardio-Respiratory"` in Study's `PageHeader` that made unit-switching look completely broken (the underlying topic data was switching correctly the whole time — only the header text was frozen); a bottom-nav/content overlap caused by `.app-main`'s padding-bottom not accounting for `env(safe-area-inset-bottom)`.
8. **This coding environment has no outbound network access at all** (confirmed via direct test — even basic requests are blocked with `host_not_allowed`). Claude cannot reach the live deployed site, Supabase, npm registry, or any external API from the sandbox. This means:
   - Claude cannot run live tests against the deployed app directly — that's *why* the E2E test suite runs via GitHub Actions instead of in-session.
   - Any code touching external services (Telegram API, Supabase admin calls, etc.) is written from careful source-reading, not dry-run — flag this honestly rather than implying it was verified live.
   - CSS/color changes in particular can't be visually verified — several rounds of the palette/gradient work above were corrected based on the user's live screenshots and direct pushback ("I still see gradients" caught remaining ambient-glow gradients that had been judged as "not really color gradients" and left in on the first pass — the user's read on what counts overrides Claude's own judgment call once stated).
9. No live browser access — CSS/animation fixes are reasoned from the cascade, not visually verified. Flag this honestly when a fix is a best-inference rather than a confirmed one.
10. The person's name is Suher.
11. **Don't assume — ask.** Several bugs this stretch turned out to be much narrower than they first sounded ("manual plan not working" was expected/correct behavior — duration hadn't been saved yet; "unit switch doesn't work" was a cosmetic header bug, not a data bug). A couple of quick concrete-option questions up front consistently saved a lot of blind exploration in a 2,600-line file.

## Directory structure (current)

```
project/
  src/
    app/
      page.js                — landing, redirects to /today
      login/, signup/        — auth pages
      layout.js               — root layout
      globals.css              — style (theme-*) + palette (palette-*) system, all shared styles
      today/page.js            — TODAY home page
      study/page.js            — STUDY module (huge file: Tracker/Stats/QBank tab/Flashcards tab/History/Plan/Access Codes tab + StudyHub + timer + schedule builder)
      tasks/page.js             — TASKS module (calendar month-grid view; task rows now solid palette-colored blocks)
      habits/page.js             — HABITS module (habit rows + stat cards now solid palette-colored blocks)
      notes/page.js              — NOTES module
      api/
        telegram/webhook/route.js — Telegram bot webhook
    components/
      AppShell.js              — shared page shell: collapsible sidebar (toggle is a fixed, non-sliding element) + <BottomNav>.
      BottomNav.js             — Today/Study/Tasks/Habits/Notes bottom bar
      SidebarSettings.js, SidebarToggle.js, SwipeRow.js, BloomFallingFlowers.js
      QBankPractice.js, QBankManage.js
      FlashcardsPractice.js, FlashcardsManage.js, FlashcardsLibrary.js
      AccessCodesManage.js      — admin-only premium redeem-code generation/listing/revocation
      ThemeSwitcher.js          — style dots + palette grid picker + night/light toggle; owns applying the combined html class and persisting theme/palette/color_mode
      UnitPicker.js, Icons.js, NavActiveIndicator.js, SpringPress.js, PageHeader.js, Modal.js
      TodayStrip.js, useTodayStrip.js — legacy, unused, harmless
  lib/
      supabaseClient.js         — browser client (anon key)
      supabaseAdmin.js           — SERVER-ONLY service-role client (never import into a "use client" file)
      palettes.js                — the 18-palette list (swatch previews), inkFor(), ROLE_CYCLE, roleForId()
      topicData.js, units.js, unitDataFactory.js, unitData/*.js
      sounds.js, flashcards.js, celebrate.js
  supabase/
    schema.sql
    migrations/002-018.sql
  tests/
    e2e/
      run.mjs                   — Playwright E2E smoke test
      package.json               — isolated deps (own package.json, doesn't touch the app's dependency tree)
      README.md                  — setup guide
  .github/
    workflows/
      e2e-tests.yml               — manual-trigger-only CI workflow for the E2E suite
  prompts/
    qbank-generation-prompt.md   — reusable AI prompt matched to QBankManage's exact import JSON schema
    flashcards-generation-prompt.md — same, for Flashcards' import schema
  TELEGRAM_SETUP.md              — full setup guide for the Telegram integration
```

## Database schema (current state)

**Core tables** (mostly unchanged): `modules`, `tasks` (legacy name — actually the Tasks feature), `topic_progress`, `user_settings`.

**`user_settings`** now holds `theme` (style key), `color_mode` (light/dark), and `palette` (nullable palette key, migration 018) — all three independent, all three persisted per-account.

**Habits/QBank/Flashcards tables**: unchanged — `habits`, `habit_log`, `habit_tasks`, `qbank_questions`, `qbank_attempts`, `flashcards`, `flashcard_sessions`, `flashcard_card_stats`, `practice_history`, `access_codes`.

**Notes/Telegram tables**: `notes` (id, user_id, title, body, `color` palette key, `tag`, `pinned`, `archived`, `trashed` soft-delete, `source`, `source_meta` jsonb, timestamps), `telegram_link_codes` and `telegram_links` (both admin-only at the RLS layer itself, same defense-in-depth pattern as `access_codes`).

**`access_codes`** — has `label` (optional batch tag). Gated entirely through three security-definer Postgres functions (`admin_generate_access_codes`, `admin_list_access_codes`, `admin_delete_access_code`) that re-check the caller's email server-side; the table itself has zero direct RLS policies.

## Navigation architecture

Two systems, both in `AppShell.js`, present on every page:

1. **Collapsible sidebar** — Settings flyout pinned to the top (now including the style + palette picker), optional module-specific sub-nav below (Study's Tracker/Stats/QBank/Flashcards/History/Plan/**Access** [admin-only]/**Hub**; Habits' List/Month/Insights).
2. **BottomNav** — fixed bottom bar: **Today / Study / Tasks / Habits / Notes**. `.app-main`'s bottom padding accounts for `env(safe-area-inset-bottom)` so it doesn't overlap the last card on devices with a home-indicator inset.

**The sidebar toggle button is a permanently fixed element** (`left: 10px`, never animates its position). The sidebar itself still fully collapses to zero width when hidden.

## Today page — schedule grouping

The combined tasks/habits schedule card supports two grouping modes (Category / Time, switchable via a pill toggle), and **each group's display order is user-reorderable** via ▲▼ buttons — order persists per-mode in localStorage. Habits use their own `time_slot` field in Time mode, matching how Tasks already worked.

## Tasks — Calendar view

A real 7-column month grid: weekday headers, every day gets a cell (including padding days from adjacent months, dimmed), today highlighted, prev/next month nav + a "Today" jump button. Each day cell shows a small numeric badge with that day's task count, color-coded (purple = pending, red = has overdue items, green = all done). Tapping a day selects it and shows that day's tasks below.

## Notes module

- **Freeform, Google Keep-style** — deliberately not linked to any unit/topic.
- **Composer**: collapsed "Take a note..." bar that expands to title + body + tag + color picker.
- **Layout**: a real JS-computed multi-column layout (round-robin distribution into N plain flexbox columns) — not CSS `column-count`, not measured CSS-Grid masonry (both were tried and broke in different ways). Trades perfect Pinterest-style packing for reliability.
- **Color palette**: 7 keys mapped to the same palette-role CSS vars used everywhere else in the app, so a note looks right in every style/palette/mode combination.
- **Pin / Archive / Trash**: pin surfaces to its own section; archive and trash are separate views, never hard-delete without an explicit "Delete forever" / "Empty trash" action.
- **Search** across title/body/tag; **tag filter chips** row (datalist-autocompletes from previously-used tags).
- **Link handling**: any note with a detected URL shows it as a tappable inline element. Telegram-sourced notes render links inline at their exact original position using Telegram's own entity character offsets.

### Telegram integration (admin-only)

Forward any Telegram message to a bot and it becomes a note automatically. Admin-only, enforced at the RLS layer, not just the UI.

- Bot linking via a one-time code (`/start CODE` in Telegram), generated from Notes → Connect Telegram.
- Webhook verifies every request via a shared secret header before doing anything.
- Captures **all** links in a message using Telegram's own entity data rather than regex-guessing.
- Media with no caption saves as a placeholder note pointing back to Telegram (Notes is text-only; the file itself isn't downloaded).
- Full setup walkthrough lives in `TELEGRAM_SETUP.md`.

## Access Codes (admin panel)

`src/components/AccessCodesManage.js`, reachable via a new "Access" tab in Study's sidebar — only rendered for the admin account, on top of server-side function-level gating. Generate N codes for a unit (or all premium units) with an optional batch label, copy-to-clipboard, filter by Unused/Redeemed/All, revoke unused codes (redeemed ones are kept as a record, never deleted).

The admin account additionally sees every unit as unlocked (`premiumUnits={isAdmin ? ["all"] : (settings?.premium_units || [])}` in `study/page.js`) — a client-side display branch keyed to the admin's email; writes nothing to the database, zero effect on any other account. **This has been reverted to this exact behavior once already** after a misread request briefly made every unit free for all users — the app is free-for-everyone-right-now by explicit product choice on content pricing, but unit *access* itself is still meant to be admin-only-unlocked/redeem-code-gated for everyone else; don't conflate the two.

## Testing

`tests/e2e/` — a Playwright smoke-test suite, triggered manually via GitHub Actions, not run automatically on push and not run by Claude directly (the coding sandbox has no outbound network access). Current state: **16/16 checks passing**. Setup and full explanation in `tests/e2e/README.md`.

## AI content-generation prompts

`prompts/qbank-generation-prompt.md` and `prompts/flashcards-generation-prompt.md` — reusable prompts matched exactly to `QBankManage.js`'s and `FlashcardsManage.js`'s real import JSON schemas.

## What's explicitly NOT built yet

- Real payment processing (Stripe doesn't directly support Algeria-based businesses — would need a foreign entity or a facilitator service).
- The app is **not currently charging anything** — every unit is free by choice, despite the admin access-code infrastructure existing and being fully functional. Non-admin accounts still need a redeem code per unit; only the price is currently $0, not the access gate itself.
- Checklist-style notes (explicitly deselected in favor of the current freeform-text scope).
- Full inline-editing of Telegram-sourced links inside the Notes editor modal (editor textarea can't render clickable inline links — a real, acknowledged limitation).
- Anki-style auto-splitting of multi-cluster cloze cards.
- Full `isSessionDone`/flashcard-completion awareness in the Plan → Calendar view specifically.
- CI running automatically on every push (deliberately kept manual-trigger-only).
- **Colored-block redesign is only partially rolled out** — Today's stat/summary blocks and Study's subject/topic cards still use the old neutral-card style, not yet the solid-per-item palette-color treatment applied to Habits and Tasks.

## How to work with this user going forward

- She tests thoroughly on the live deployed site and reports back with **exact, literal symptoms**, often annotated screenshots — trace the actual code path implied, don't assume the obvious cause.
- **Appreciates directness about tool/environment limitations** rather than confident-sounding guesses.
- Will correct a misunderstanding directly and expects the correction to actually stick — e.g. "I said just unlocked for me" after a misread request had briefly made all units free for everyone; the fix was reverted immediately and precisely, not renegotiated.
- Wants **complete, working features**, not scaffolding, but is fine with iterative back-and-forth, including circling back to re-fix regressions — sometimes multiple real attempts in a row.
- Prefers direct execution over lengthy discussion, but engages well with targeted clarifying questions (with concrete options) before a large new feature is built — this is how the Notes module's scope, the Telegram integration's scope, and the style/palette split were all nailed down before code was written.
- Has strong, specific opinions on visual design and will push back precisely rather than vaguely — "there's definitely still a hero color," "I hate gradients," "I still see gradients" (after a first pass judged ambient soft-glow effects as "not really gradients" and left them in — her read overrides that judgment call once stated). Take design feedback literally and go back through systematically (grep for the actual CSS mechanism, e.g. `linear-gradient`/`radial-gradient`) rather than assuming a partial fix addressed the complaint.
- Always explain *what* changed and *why*, and be explicit about whether a new SQL migration needs to be run before the code will work.

## Access control / admin feature work (new track, separate from the visual reconstruction above)

**Coming-soon toggle for premium units (this session):** Non-admin users no longer see the lock icon, "PREMIUM" badge, or the "Enter a code to unlock"/redeem-code UI at all for any unit the admin has flagged — instead they see a plain "Coming soon" card (clock icon, no click action, no redeem field anywhere on the page for that unit). Admin still sees every unit's real state (locked/unlocked) plus a small per-unit toggle button ("SHOW COMING SOON" / "SHOW LOCK") to flip that global flag. **Requires a new migration to be run before this works: `supabase/migrations/019_coming_soon_units.sql`** — creates a single-row `app_config` table (`coming_soon_units jsonb`) with RLS mirroring the existing admin-only write pattern from `006_qbank_shared_admin_only.sql` (`auth.jwt() ->> 'email' = 'maghrabiasma11@gmail.com'` for writes, any authenticated read). Until that migration runs, the app still works fine — `UnitPicker` just falls back to the old locked/redeem behavior for everyone, since the `app_config` fetch fails silently and `comingSoonUnits` defaults to `[]`.

Implementation: `study/page.js` fetches `app_config.coming_soon_units` alongside its other startup queries, holds it in `comingSoonUnits` state, and passes it + `isAdmin` + a `toggleComingSoon()` handler down to `UnitPicker`. The toggle does an optimistic local update then writes to Supabase, reverting with a toast on failure (e.g. migration not yet applied).

**Stat/block components now inherit the active Style, not just Palette:** `.today-stat-tile` (Today page) and `.subj-block` (Study's Subject progress list) were built as bespoke CSS classes that never picked up Solar Pop's hard-shadow/border/rotation, Bloom's asymmetric radius, Stitch's dashed border, or Minimal's flat-square treatment — they only ever got their own flat palette-role fill color, which is why they looked visually disconnected from the rest of whichever Style was active (called out directly from a live screenshot: "make these cards match the chosen style"). Fixed by simply adding `card` to both elements' `className` (`className="card today-stat-tile"` / `className="card subj-block"`) so they inherit every existing Style-specific `.card` override automatically — no new CSS selectors needed, since the more specific/later tile-only padding and radius rules in the stylesheet still win over the base `.card` values by source order.

**Signup terms/privacy consent:** added a required checkbox on `/signup` (blocks submission until checked, mirrors the pattern of disabling the submit button rather than silently failing) linking to a new plain-language `/terms` page covering both terms of use and a short privacy notice (what's collected, why, who sees it — nobody but the user, stored in Supabase behind RLS — and that it's a free personal project, not a formal commercial ToS). `/login` was deliberately left untouched — it only signs in existing accounts (`signInWithPassword`), it doesn't create new ones, so re-showing consent there isn't needed; consent belongs at the point of account creation only.
