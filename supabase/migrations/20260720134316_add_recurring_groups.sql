-- Recurring detection groups transactions by counterparty + interval, not
-- exact amount (a salary with holiday pay must not look "broken"). Each
-- group tracks a typical amount (median of its non-outlier occurrences) so
-- individual rows can be compared against it to flag outliers at display
-- time, without storing a redundant per-row outlier flag that could go
-- stale as the group is recomputed.
create table public.recurring_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  identity_key text not null,
  label text not null,
  interval_days integer not null,
  typical_amount numeric(12, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, identity_key)
);

alter table public.recurring_groups enable row level security;

create policy "recurring_groups_select_own" on public.recurring_groups
  for select using (user_id = (select auth.uid()));
create policy "recurring_groups_insert_own" on public.recurring_groups
  for insert with check (user_id = (select auth.uid()));
create policy "recurring_groups_update_own" on public.recurring_groups
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "recurring_groups_delete_own" on public.recurring_groups
  for delete using (user_id = (select auth.uid()));

alter table public.transactions
  add constraint transactions_recurring_group_id_fkey
  foreign key (recurring_group_id) references public.recurring_groups (id) on delete set null;
