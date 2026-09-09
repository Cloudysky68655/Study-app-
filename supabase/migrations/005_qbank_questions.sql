-- QBank questions, tagged directly to Study's existing unit_id/topic_id
-- Run this in Supabase Dashboard -> SQL Editor -> New Query -> Run
--
-- Design note: questions are tagged with the SAME unit_id/topic_id values
-- Study already uses (e.g. unit_id='endocrine', topic_id='anatomy-0-0').
-- That's what lets the "Practice" button inside Study's topic modal find
-- the right questions with a direct match — no separate mapping table.

create table if not exists qbank_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  unit_id text not null,
  topic_id text not null,
  question text not null,
  options jsonb not null,   -- [{ "text": "...", "correct": true }, { "text": "...", "correct": false }, ...]
  explanation text,
  created_at timestamptz default now()
);

alter table qbank_questions enable row level security;

create policy "own qbank_questions" on qbank_questions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists qbank_questions_topic_idx on qbank_questions(user_id, unit_id, topic_id);
