-- Multi-unit support migration
-- Run this in Supabase Dashboard -> SQL Editor -> New Query -> Run
--
-- BEFORE RUNNING: export your data first as a safety net — open the app,
-- go to the Log tab -> Export. Supabase's free tier has no automatic
-- backups, and this script changes a primary key, so it's worth the 10
-- seconds even though the migration itself is written to be non-destructive.
--
-- What this does:
--   1. Adds a unit_id column to topic_progress, backfills every existing
--      row as "cardio-respiratory" (today's only real unit), then widens
--      the primary key to (user_id, unit_id, topic_id) so a second unit
--      can never collide with this one's topic ids.
--   2. Adds active_unit_id to user_settings so "which unit is open right
--      now" persists per user, across devices. New signups get NULL here
--      (they'll see the unit picker); this migration intentionally does
--      NOT default it for existing rows below — see step 2b.
--   2b. Backfills active_unit_id = 'cardio-respiratory' for any
--      user_settings row that already exists today, so nobody who's
--      already using the tracker gets unexpectedly bounced to a picker
--      screen for a unit list that (for now) only has one real option.

-- 1. topic_progress: add + backfill unit_id, then widen the primary key
alter table topic_progress add column if not exists unit_id text;
update topic_progress set unit_id = 'cardio-respiratory' where unit_id is null;
alter table topic_progress alter column unit_id set not null;

alter table topic_progress drop constraint if exists topic_progress_pkey;
alter table topic_progress add primary key (user_id, unit_id, topic_id);

-- 2. user_settings: add active_unit_id (nullable — NULL means "show picker")
alter table user_settings add column if not exists active_unit_id text;

-- 2b. Only backfill rows that exist *right now*, at migration time.
-- Anyone who signs up after this runs starts with NULL and sees the
-- picker, which is the intended behavior once more units exist.
update user_settings set active_unit_id = 'cardio-respiratory' where active_unit_id is null;

-- Sanity check — run this after and confirm every row has a unit_id:
-- select count(*) from topic_progress where unit_id is null;  -- should be 0
