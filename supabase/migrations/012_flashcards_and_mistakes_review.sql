-- Flashcards (Anki-style session drilling, admin-authored shared deck) +
-- QBank per-question attempt logging (for "Review Your Mistakes") +
-- abandon support for both Quiz and Flashcard sessions.
--
-- Run this in Supabase Dashboard -> SQL Editor -> New Query -> Run.

-- ============================================================
-- 1. FLASHCARDS — the shared card bank, admin-authored.
--    Same shared-read / admin-write pattern as qbank_questions.
--    Basic cards use front/back. Cloze cards use cloze_text, which
--    contains one or more {{c::...}} blanks — all hidden/revealed
--    together as a single card (no Anki-style per-cluster splitting).
-- ============================================================
create table if not exists flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,  -- uploader (admin)
  unit_id text not null,
  topic_id text not null,
  card_type text not null default 'basic' check (card_type in ('basic', 'cloze')),
  front text,        -- basic cards only
  back text,         -- basic cards only
  cloze_text text,   -- cloze cards only, e.g. "The {{c::mitral}} valve sits between {{c::LA}} and {{c::LV}}."
  created_at timestamptz default now()
);

alter table flashcards enable row level security;

create policy "read flashcards" on flashcards
  for select using (auth.role() = 'authenticated');

create policy "admin write flashcards" on flashcards
  for insert with check ((auth.jwt() ->> 'email') = 'maghrabiasma11@gmail.com');

create policy "admin update flashcards" on flashcards
  for update using ((auth.jwt() ->> 'email') = 'maghrabiasma11@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'maghrabiasma11@gmail.com');

create policy "admin delete flashcards" on flashcards
  for delete using ((auth.jwt() ->> 'email') = 'maghrabiasma11@gmail.com');

create index if not exists flashcards_topic_idx on flashcards(unit_id, topic_id);

-- ============================================================
-- 2. FLASHCARD_SESSIONS — one row per practice session. Personal to
--    each user. card_state is the live re-show queue: each entry
--    tracks the card's current label, when it's next due, and how
--    many times in a row it's been rated Again/Hard (drives the
--    escalating interval). Nothing here is ever shown to the user
--    directly — it's internal scheduling state only.
--
--    The partial unique index enforces "one active session per topic"
--    at the database level: a second insert for the same user+topic
--    while one is still 'active' will fail, so the app just checks for
--    (and resumes) an existing active session before starting a new one.
-- ============================================================
create table if not exists flashcard_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  unit_id text not null,
  topic_id text not null,
  status text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  mode text not null default 'all' check (mode in ('all', 'mistakes')),
  card_state jsonb not null default '[]'::jsonb,
  -- [{ card_id, label: 'again'|'hard'|'normal'|'easy'|null, due_at: iso|null,
  --    again_streak: int, hard_streak: int, shown_count: int }]
  seconds_spent int not null default 0,
  started_at timestamptz default now(),
  completed_at timestamptz,
  updated_at timestamptz default now()
);

alter table flashcard_sessions enable row level security;

create policy "own flashcard_sessions" on flashcard_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create unique index if not exists flashcard_sessions_one_active_per_topic
  on flashcard_sessions(user_id, topic_id) where status = 'active';

create index if not exists flashcard_sessions_user_idx on flashcard_sessions(user_id, updated_at desc);

-- ============================================================
-- 3. FLASHCARD_CARD_STATS — durable per-user per-card record, updated
--    on every rating regardless of session outcome. Powers both the
--    Flashcards Library (times studied / latest label) and the
--    Flashcards "Review Your Mistakes" pool (latest_label in
--    ('again','hard'), filtered by topic via a join to flashcards).
-- ============================================================
create table if not exists flashcard_card_stats (
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references flashcards(id) on delete cascade,
  times_studied int not null default 0,
  latest_label text check (latest_label in ('again', 'hard', 'normal', 'easy')),
  last_studied_at timestamptz,
  primary key (user_id, card_id)
);

alter table flashcard_card_stats enable row level security;

create policy "own flashcard_card_stats" on flashcard_card_stats
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- 4. QBANK_ATTEMPTS — per-question attempt log. Doesn't exist today
--    (practice_history only stores session-level summaries), so
--    "Review Your Mistakes" can only see attempts logged from here
--    forward. Only the most recent attempt per question matters for
--    the mistakes pool: latest wrong, or latest right-but-low-confidence.
-- ============================================================
create table if not exists qbank_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references qbank_questions(id) on delete cascade,
  unit_id text not null,
  topic_id text not null,
  correct boolean not null,
  confidence text check (confidence in ('low', 'normal', 'high')),
  answered_at timestamptz default now()
);

alter table qbank_attempts enable row level security;

create policy "own qbank_attempts" on qbank_attempts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists qbank_attempts_latest_idx on qbank_attempts(user_id, question_id, answered_at desc);
create index if not exists qbank_attempts_topic_idx on qbank_attempts(user_id, unit_id, topic_id);

-- ============================================================
-- 5. Abandon support for Quiz (practice_history didn't distinguish
--    completed vs. abandoned runs before now).
-- ============================================================
alter table practice_history
  add column if not exists status text not null default 'completed'
  check (status in ('completed', 'abandoned'));
