-- Per-user locale settings used for CSV import parsing (decimal separator,
-- timezone). Both nullable: null means "not set yet" — the app falls back to
-- per-file auto-detection (decimal separator) or a sensible default
-- (timezone), rather than a table default masking that distinction.
create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  decimal_separator text check (decimal_separator in ('period', 'comma')),
  timezone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "user_settings_select_own" on public.user_settings
  for select using (user_id = (select auth.uid()));
create policy "user_settings_insert_own" on public.user_settings
  for insert with check (user_id = (select auth.uid()));
create policy "user_settings_update_own" on public.user_settings
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "user_settings_delete_own" on public.user_settings
  for delete using (user_id = (select auth.uid()));
