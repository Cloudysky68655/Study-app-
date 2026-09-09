-- Admin-only in-app access code management.
-- Run this in Supabase Dashboard -> SQL Editor -> New Query -> Run
--
-- What this does:
--   access_codes keeps its existing design from migration 003 — zero RLS
--   policies, unreachable directly by any client. This migration adds
--   three security-definer functions that check the caller's email
--   against the app's hardcoded admin address before doing anything,
--   so the admin can generate/list/revoke codes from inside the app
--   itself instead of the Supabase SQL Editor, without opening the
--   table up to anyone else.
--
--   1. admin_generate_access_codes(unit_id, count, label) — inserts
--      `count` fresh random 8-char codes tagged to unit_id (or 'all'),
--      returns the generated codes so the UI can display/copy them.
--   2. admin_list_access_codes() — returns every code with its
--      used/unused status, for the admin's review table.
--   3. admin_delete_access_code(code) — deletes ONE code, only if it's
--      still unused (already-redeemed codes are left alone as a record).
--
-- IMPORTANT: if the admin's email ever changes, update the email string
-- in all three functions below to match (and in ADMIN_EMAIL in
-- src/app/study/page.js).

alter table access_codes add column if not exists label text;

create or replace function admin_generate_access_codes(p_unit_id text, p_count int, p_label text default null)
returns setof text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  i int;
  v_code text;
begin
  v_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  if v_email <> 'maghrabiasma11@gmail.com' then
    raise exception 'not_authorized';
  end if;
  if p_count is null or p_count < 1 or p_count > 200 then
    raise exception 'invalid_count';
  end if;
  if p_unit_id is null or length(trim(p_unit_id)) = 0 then
    raise exception 'invalid_unit';
  end if;

  for i in 1..p_count loop
    v_code := upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    insert into access_codes (code, unit_id, label) values (v_code, p_unit_id, p_label);
    return next v_code;
  end loop;
  return;
end;
$$;

grant execute on function admin_generate_access_codes(text, int, text) to authenticated;

create or replace function admin_list_access_codes()
returns table (code text, unit_id text, used boolean, used_at timestamptz, created_at timestamptz, label text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  v_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  if v_email <> 'maghrabiasma11@gmail.com' then
    raise exception 'not_authorized';
  end if;
  return query
    select a.code, a.unit_id, a.used, a.used_at, a.created_at, a.label
    from access_codes a
    order by a.created_at desc;
end;
$$;

grant execute on function admin_list_access_codes() to authenticated;

create or replace function admin_delete_access_code(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_count int;
begin
  v_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  if v_email <> 'maghrabiasma11@gmail.com' then
    raise exception 'not_authorized';
  end if;
  delete from access_codes where code = p_code and used = false;
  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;

grant execute on function admin_delete_access_code(text) to authenticated;
