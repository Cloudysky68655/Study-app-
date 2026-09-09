-- Practice/exam attempt history for the QBank Practice tab.
-- Run this in Supabase Dashboard -> SQL Editor -> New Query -> Run
--
-- Each row is one completed practice run (whatever scope was chosen —
-- a single topic, a whole subject, or a whole unit). Personal to each
-- user (their own attempts only), separate from the shared question
-- bank itself.

create table if not exists practice_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scope_label text not null,       -- e.g. "Cardio-Respiratory → Anatomy → Thoracic wall"
  unit_id text,                    -- set only when the whole run was scoped to one unit
  topic_id text,                   -- set only when the whole run was scoped to one exact topic
  total int not null,
  correct int not null,
  pct int not null,
  minutes_spent int,
  created_at timestamptz default now()
);

alter table practice_history enable row level security;

create policy "own practice_history" on practice_history
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists practice_history_user_idx on practice_history(user_id, created_at desc);
