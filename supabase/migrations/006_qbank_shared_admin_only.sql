-- Turn qbank_questions into a shared bank: every signed-in user can read
-- (so Practice works for everyone automatically, no import step needed
-- on their end), but only the admin account can add/edit/delete.
-- Run this in Supabase Dashboard -> SQL Editor -> New Query -> Run

drop policy if exists "own qbank_questions" on qbank_questions;

-- Anyone signed in can read the whole bank.
create policy "read qbank_questions" on qbank_questions
  for select using (auth.role() = 'authenticated');

-- Only the admin account (matched by email) can add, edit, or delete.
create policy "admin write qbank_questions" on qbank_questions
  for insert with check ((auth.jwt() ->> 'email') = 'maghrabiasma11@gmail.com');

create policy "admin update qbank_questions" on qbank_questions
  for update using ((auth.jwt() ->> 'email') = 'maghrabiasma11@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'maghrabiasma11@gmail.com');

create policy "admin delete qbank_questions" on qbank_questions
  for delete using ((auth.jwt() ->> 'email') = 'maghrabiasma11@gmail.com');
