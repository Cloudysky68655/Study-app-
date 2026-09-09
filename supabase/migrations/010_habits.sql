-- Habits module: daily habits with streaks, per-day completion log, and
-- lightweight one-off tasks (with optional subtasks). Mirrors the Ledger
-- reference app, but stored per-user in Postgres instead of localStorage.
--
-- Run this in Supabase Dashboard -> SQL Editor -> New Query -> Run.

-- One row per habit. Frequency / qty / category-icon config live in JSON so
-- the shape can evolve without a migration each time.
create table if not exists habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  category text default 'Other',
  color text default '#8b5cf6',
  icon text,                                   -- emoji shown for this habit's category
  time_slot text,                              -- optional free-text slot e.g. "Morning"
  frequency jsonb default '{"type":"daily"}'::jsonb,  -- {type:'daily'|'weekdays'|'xperweek', days?:[0-6], timesPerWeek?:int}
  qty jsonb,                                   -- null, or {target:number, unit:string}
  archived boolean default false,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- One row per (habit, day) that has any entry. Absence of a row = not done.
create table if not exists habit_log (
  user_id uuid references auth.users(id) on delete cascade not null,
  habit_id uuid references habits(id) on delete cascade not null,
  day date not null,
  done boolean default false,
  qty numeric,
  note text,
  updated_at timestamptz default now(),
  primary key (user_id, habit_id, day)
);

-- One-off tasks (not streak-based). Subtasks are embedded JSON.
create table if not exists habit_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  category text,
  time_slot text,
  subtasks jsonb default '[]'::jsonb,          -- [{id, name, done}]
  done boolean default false,
  sort_order int default 0,
  created_at timestamptz default now()
);

create index if not exists habits_user_idx on habits(user_id);
create index if not exists habit_log_user_idx on habit_log(user_id);
create index if not exists habit_log_habit_idx on habit_log(habit_id);
create index if not exists habit_tasks_user_idx on habit_tasks(user_id);

-- Row Level Security: every user only ever sees their own rows.
alter table habits enable row level security;
alter table habit_log enable row level security;
alter table habit_tasks enable row level security;

create policy "own habits" on habits for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own habit_log" on habit_log for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own habit_tasks" on habit_tasks for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
