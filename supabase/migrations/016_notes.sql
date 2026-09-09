-- Notes module — freeform Google Keep-style scratchpad, unrelated to any
-- unit/topic (no linkage to topic_progress/qbank/flashcards on purpose).
-- Run this in Supabase Dashboard -> SQL Editor -> New Query -> Run

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  body text not null default '',
  color text not null default 'default',   -- palette key (see NOTE_COLORS in the app), not a raw hex — stays theme-aware
  tag text,                                 -- optional freeform category, e.g. "Ideas"; null = uncategorized
  pinned boolean not null default false,
  archived boolean not null default false,
  trashed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table notes enable row level security;

create policy "own notes" on notes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists notes_user_idx on notes(user_id, trashed, archived, pinned);

-- Keeps updated_at honest on every edit, since the notes list sorts by it
-- (most-recently-edited first, Keep-style) without the client needing to
-- remember to set it manually on every save.
create or replace function notes_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists notes_updated_at_trigger on notes;
create trigger notes_updated_at_trigger
before update on notes
for each row execute function notes_set_updated_at();
