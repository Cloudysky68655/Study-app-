-- Confidence calibration system for QBank practice/exam questions.
-- Run this in Supabase Dashboard -> SQL Editor -> New Query -> Run
--
-- Every QBank question answer can now be tagged with a confidence level
-- (high / normal / low). When that confidence turns out to be
-- miscalibrated against the actual correct/incorrect result, it nudges
-- the topic's mastery score and raises a "needs review" flag; when it's
-- well-calibrated (high confidence + correct), it gives a small boost.
--
-- calibration_adj: a running, clamped (-20..20) adjustment folded into
--   calcMastery() alongside the existing understanding/qcm average.
-- review_flag: set true the moment a miscalibration happens; stays true
--   until the person dismisses it from the Tracker tab.

alter table topic_progress
  add column if not exists calibration_adj integer not null default 0,
  add column if not exists review_flag boolean not null default false;
