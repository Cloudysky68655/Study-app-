-- Premium access codes migration
-- Run this in Supabase Dashboard -> SQL Editor -> New Query -> Run
--
-- What this does:
--   1. Creates access_codes: one row per single-use code you generate
--      yourself and hand out in person. Each code is tied to one unit_id
--      (or 'all' to unlock every premium unit at once).
--   2. Adds premium_units (jsonb array of unit keys, e.g. ["endocrine"])
--      to user_settings — this is what the app checks to decide whether
--      a unit is locked for a given user.
--   3. Adds a redeem_access_code(code) function that does the
--      check-and-mark-used atomically (row-locked), so the same code
--      can never be redeemed twice even if someone tries it from two
--      tabs at once. RLS on access_codes has no policies at all — the
--      table can't be read or written directly by users, only through
--      this function, so nobody can browse for unused codes.

create table if not exists access_codes (
  code text primary key,
  unit_id text not null,          -- a key from src/lib/units.js, or 'all' to unlock every premium unit
  used boolean not null default false,
  used_by uuid references auth.users(id),
  used_at timestamptz,
  created_at timestamptz default now()
);

alter table access_codes enable row level security;
-- Intentionally no policies: this table is only ever touched through
-- redeem_access_code() below (security definer), never directly by clients.

alter table user_settings add column if not exists premium_units jsonb not null default '[]'::jsonb;

create or replace function redeem_access_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row access_codes%rowtype;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'not_signed_in');
  end if;

  select * into v_row from access_codes where code = p_code for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid_code');
  end if;
  if v_row.used then
    return jsonb_build_object('ok', false, 'error', 'already_used');
  end if;

  update access_codes set used = true, used_by = auth.uid(), used_at = now() where code = p_code;

  insert into user_settings (user_id, premium_units)
    values (auth.uid(), jsonb_build_array(v_row.unit_id))
  on conflict (user_id) do update
    set premium_units = (
      select coalesce(jsonb_agg(distinct v), '[]'::jsonb)
      from jsonb_array_elements_text(
        coalesce(user_settings.premium_units, '[]'::jsonb) || jsonb_build_array(v_row.unit_id)
      ) as v
    );

  return jsonb_build_object('ok', true, 'unit_id', v_row.unit_id);
end;
$$;

grant execute on function redeem_access_code(text) to authenticated;

-- ---------------------------------------------------------------------
-- To generate codes: run something like this, then copy the codes out
-- of the results panel to hand out. gen_random_uuid() needs the
-- pgcrypto extension, which Supabase enables by default.
--
-- insert into access_codes (code, unit_id)
-- select upper(substring(gen_random_uuid()::text, 1, 8)), 'endocrine'
-- from generate_series(1, 10)
-- returning code;
--
-- Use unit_id = 'all' for a code that unlocks every premium unit at once.
-- ---------------------------------------------------------------------
