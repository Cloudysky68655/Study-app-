-- Lets the admin flip any premium unit between two states for everyone
-- else: the normal "locked, redeem a code" screen, or a plain "Coming
-- soon" screen with no lock icon / redeem field at all. This is a
-- single global row (not per-user) so the toggle affects every
-- non-admin account at once.
-- Run this in Supabase Dashboard -> SQL Editor -> New Query -> Run

create table if not exists app_config (
  id boolean primary key default true,
  coming_soon_units jsonb not null default '[]'::jsonb,
  constraint app_config_singleton check (id = true)
);

insert into app_config (id, coming_soon_units)
  values (true, '[]'::jsonb)
  on conflict (id) do nothing;

alter table app_config enable row level security;

-- Anyone signed in can read the current toggle state.
create policy "read app_config" on app_config
  for select using (auth.role() = 'authenticated');

-- Only the admin account can change it.
create policy "admin update app_config" on app_config
  for update using ((auth.jwt() ->> 'email') = 'maghrabiasma11@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'maghrabiasma11@gmail.com');
