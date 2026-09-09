-- Adds the actually-chosen option index to qbank_attempts, so "Review
-- Your Weak Points" can show what the person picked (not just that it
-- was wrong) alongside the correct answer.
--
-- Run this in Supabase Dashboard -> SQL Editor -> New Query -> Run.

alter table qbank_attempts add column if not exists selected_index int;
