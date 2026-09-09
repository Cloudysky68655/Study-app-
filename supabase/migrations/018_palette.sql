-- Adds a `palette` column to user_settings, independent from `theme`
-- (which now controls only card style/effects — Aurora Pulse / Solar Pop /
-- Minimal) and `color_mode` (light/dark). `palette` selects the color set
-- layered on top of whichever style + mode are active. NULL means "use the
-- style's own built-in colors" (unchanged legacy behavior), so existing
-- users are unaffected until they explicitly pick a palette.
alter table user_settings
  add column if not exists palette text;
