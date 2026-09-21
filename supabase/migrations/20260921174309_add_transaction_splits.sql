-- One transaction can be divided into multiple categorized parts without
-- becoming multiple transactions — the transaction stays one row
-- everywhere (import, list, recurring, duplicate detection); splitting
-- only changes how its amount is categorized for reporting. A
-- transaction with zero splits behaves exactly as today: its own
-- category_id/description remain the source of truth. Once it has
-- splits, those columns are left as-is (not nulled — "un-split" restores
-- the prior category with no data loss) but stop being used in spend
-- calculations, which sum the splits instead. Split amounts must sum to
-- the parent transaction's amount — enforced in the UI, not here.
create table public.transaction_splits (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  book_id uuid references public.books (id) on delete set null,
  amount numeric(12, 2) not null,
  note text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index transaction_splits_transaction_id_idx on public.transaction_splits (transaction_id);

alter table public.transaction_splits enable row level security;

create policy "transaction_splits_select_own" on public.transaction_splits
  for select using (user_id = (select auth.uid()));
create policy "transaction_splits_insert_own" on public.transaction_splits
  for insert with check (user_id = (select auth.uid()));
create policy "transaction_splits_update_own" on public.transaction_splits
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "transaction_splits_delete_own" on public.transaction_splits
  for delete using (user_id = (select auth.uid()));
