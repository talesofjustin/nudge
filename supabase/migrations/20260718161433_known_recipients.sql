-- Recipients the user has flagged as their own accounts, so transactions
-- to/from them can be treated as transfers instead of income/expense.
create table public.known_recipients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  recipient text not null,
  is_own_account boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, recipient)
);

alter table public.known_recipients enable row level security;

create policy "known_recipients_select_own" on public.known_recipients
  for select using (user_id = (select auth.uid()));
create policy "known_recipients_insert_own" on public.known_recipients
  for insert with check (user_id = (select auth.uid()));
create policy "known_recipients_update_own" on public.known_recipients
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "known_recipients_delete_own" on public.known_recipients
  for delete using (user_id = (select auth.uid()));
