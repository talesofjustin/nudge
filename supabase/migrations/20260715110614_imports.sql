-- Import history: one row per successful CSV import, shown on /import.
create table public.imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  filename text,
  row_count integer not null,
  created_at timestamptz not null default now()
);

alter table public.imports enable row level security;

create policy "imports_select_own" on public.imports
  for select using (user_id = (select auth.uid()));
create policy "imports_insert_own" on public.imports
  for insert with check (user_id = (select auth.uid()));
create policy "imports_update_own" on public.imports
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "imports_delete_own" on public.imports
  for delete using (user_id = (select auth.uid()));
