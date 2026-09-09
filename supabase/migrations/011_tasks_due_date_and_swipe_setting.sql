-- Adds a due date to one-off tasks (for the new Calendar grouping view and
-- for Today filtering to "due today" only), and a user-level preference
-- to enable/disable swipe-to-check gestures on Habits/Tasks rows.
--
-- Run this in Supabase Dashboard -> SQL Editor -> New Query -> Run.

alter table habit_tasks add column if not exists due_date date;

create index if not exists habit_tasks_due_date_idx on habit_tasks(due_date);

alter table user_settings add column if not exists swipe_to_check boolean default false;
