-- Telegram -> Notes integration — ADMIN ONLY.
-- Run this in Supabase Dashboard -> SQL Editor -> New Query -> Run
--
-- What this does:
--   1. Adds source/source_meta to notes, so a note created by the
--      Telegram bot can be told apart from one typed in the app, and can
--      remember which chat/message it came from.
--   2. telegram_link_codes: short-lived one-time codes the app generates
--      (client-side, RLS-protected) so the person can prove "this
--      Telegram chat is me" by sending /start <code> to the bot.
--   3. telegram_links: the resulting chat_id <-> user_id mapping, one row
--      per user. Only ever INSERTed by the webhook (via the service role
--      key, which bypasses RLS) since the webhook has no Supabase user
--      session of its own — Telegram is calling it directly over HTTP.
--
--   Both tables are restricted to the admin's email at the RLS layer
--   itself (not just hidden in the UI) — the same defense-in-depth
--   pattern as the access-codes admin functions in migration 015. If the
--   admin's email ever changes, update the email string in both policies
--   below (and ADMIN_EMAIL in src/app/notes/page.js).

alter table notes add column if not exists source text not null default 'app' check (source in ('app', 'telegram'));
alter table notes add column if not exists source_meta jsonb;

create table if not exists telegram_link_codes (
  code text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  used boolean not null default false
);

alter table telegram_link_codes enable row level security;

create policy "admin only telegram_link_codes" on telegram_link_codes for all
  using (auth.uid() = user_id and lower(coalesce(auth.jwt() ->> 'email', '')) = 'maghrabiasma11@gmail.com')
  with check (auth.uid() = user_id and lower(coalesce(auth.jwt() ->> 'email', '')) = 'maghrabiasma11@gmail.com');

create table if not exists telegram_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  telegram_chat_id bigint not null unique,
  telegram_username text,
  linked_at timestamptz not null default now()
);

alter table telegram_links enable row level security;

create policy "admin only telegram_links" on telegram_links for all
  using (auth.uid() = user_id and lower(coalesce(auth.jwt() ->> 'email', '')) = 'maghrabiasma11@gmail.com')
  with check (auth.uid() = user_id and lower(coalesce(auth.jwt() ->> 'email', '')) = 'maghrabiasma11@gmail.com');

create index if not exists telegram_link_codes_user_idx on telegram_link_codes(user_id);
