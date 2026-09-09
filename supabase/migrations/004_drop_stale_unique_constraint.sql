-- Fix: drop leftover unique constraint that predates multi-unit support
-- Run this in Supabase Dashboard -> SQL Editor -> New Query -> Run
--
-- Migration 002 replaced topic_progress's PRIMARY KEY with one that
-- includes unit_id, so two different units can never collide on the
-- same topic_id. But a separate UNIQUE constraint named
-- topic_progress_user_id_topic_id_key — apparently created before that
-- migration, under a name migration 002 didn't know to look for — was
-- never dropped. It still enforces "one row per (user_id, topic_id)"
-- across the WHOLE account, ignoring unit_id entirely.
--
-- Since every unit reuses subject keys like "anatomy", "histology",
-- "physiology" (see src/lib/unitDataFactory.js's makeId), topic ids
-- such as "anatomy-0-0" exist in almost every unit. Saving a topic in
-- a second unit whose id happens to match one already saved in a
-- different unit hits this old constraint and fails with:
--   duplicate key value violates unique constraint
--   "topic_progress_user_id_topic_id_key"
--
-- This migration removes that stale constraint. The real primary key
-- from migration 002, on (user_id, unit_id, topic_id), stays in place
-- and keeps doing its job — this only removes the extra, too-narrow one.

alter table topic_progress drop constraint if exists topic_progress_user_id_topic_id_key;

-- Sanity check — run after, and confirm the only unique/primary key
-- constraint left on topic_progress covers all three columns:
-- select conname, pg_get_constraintdef(oid)
-- from pg_constraint
-- where conrelid = 'topic_progress'::regclass and contype in ('p','u');
