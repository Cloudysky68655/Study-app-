-- Adds a type tag to each question: 'exam_like' (practice-style, written
-- to resemble exam questions) or 'official_exam' (pulled directly from a
-- real past exam). Defaults to 'exam_like' for anything imported without
-- specifying a type, so existing rows keep working unchanged.
-- Run this in Supabase Dashboard -> SQL Editor -> New Query -> Run

alter table qbank_questions
  add column if not exists question_type text not null default 'exam_like'
  check (question_type in ('exam_like', 'official_exam'));

create index if not exists qbank_questions_type_idx on qbank_questions(question_type);
