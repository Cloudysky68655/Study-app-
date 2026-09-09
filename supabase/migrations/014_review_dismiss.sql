-- Lets "Review Your Weak Points" items be marked as reviewed and drop off
-- the list, for both QBank and Flashcards.
--
-- Run this in Supabase Dashboard -> SQL Editor -> New Query -> Run.

alter table qbank_attempts add column if not exists reviewed boolean not null default false;
alter table flashcard_card_stats add column if not exists reviewed boolean not null default false;
