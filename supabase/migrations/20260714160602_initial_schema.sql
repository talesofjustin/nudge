-- Initial schema: spaces, categories, accounts, transactions, budgets.
-- Every table is scoped to auth.users via user_id + RLS. New users are
-- seeded with a default category set on signup; spaces start empty.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- spaces
-- Optional second axis per transaction (e.g. Private/Business for the
-- original author, but generic/renameable per user). Starts empty for every
-- user — the app treats "zero spaces" as a single undivided view, so no
-- default rows are seeded here.
-- ---------------------------------------------------------------------------
create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.spaces enable row level security;

create policy "spaces_select_own" on public.spaces
  for select using (user_id = (select auth.uid()));
create policy "spaces_insert_own" on public.spaces
  for insert with check (user_id = (select auth.uid()));
create policy "spaces_update_own" on public.spaces
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "spaces_delete_own" on public.spaces
  for delete using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- categories
-- Replaces the old "labels" naming. Every new user is seeded with a default
-- set (see handle_new_user below); users may add, edit, or delete their own
-- beyond those.
-- ---------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color text not null check (color ~* '^#[0-9a-f]{6}$'),
  icon text not null,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;

create policy "categories_select_own" on public.categories
  for select using (user_id = (select auth.uid()));
create policy "categories_insert_own" on public.categories
  for insert with check (user_id = (select auth.uid()));
create policy "categories_update_own" on public.categories
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "categories_delete_own" on public.categories
  for delete using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- accounts
-- e.g. bank / PayPal / credit card.
-- ---------------------------------------------------------------------------
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  type text not null default 'bank'
    check (type in ('bank', 'paypal', 'credit_card', 'cash', 'other')),
  created_at timestamptz not null default now()
);

alter table public.accounts enable row level security;

create policy "accounts_select_own" on public.accounts
  for select using (user_id = (select auth.uid()));
create policy "accounts_insert_own" on public.accounts
  for insert with check (user_id = (select auth.uid()));
create policy "accounts_update_own" on public.accounts
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "accounts_delete_own" on public.accounts
  for delete using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- transactions
-- category_id and space_id are both nullable: an uncategorized transaction
-- needs review, and space is an optional second axis. There is no separate
-- "reviewed" status column — a transaction counts as categorized/reviewed
-- exactly when category_id is not null. Any dashboard aggregate or count
-- must filter on `category_id is not null` accordingly.
-- ---------------------------------------------------------------------------
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  space_id uuid references public.spaces (id) on delete set null,
  amount numeric(12, 2) not null,
  description text not null,
  occurred_at timestamptz not null default now(),
  is_recurring boolean not null default false,
  recurring_group_id uuid,
  created_at timestamptz not null default now()
);

comment on column public.transactions.category_id is
  'Null = needs review. A transaction is "categorized" iff this is not null — no separate status column.';

create index transactions_user_id_idx on public.transactions (user_id);
create index transactions_account_id_idx on public.transactions (account_id);
create index transactions_category_id_idx on public.transactions (category_id);
create index transactions_space_id_idx on public.transactions (space_id);
create index transactions_recurring_group_id_idx on public.transactions (recurring_group_id)
  where recurring_group_id is not null;

alter table public.transactions enable row level security;

create policy "transactions_select_own" on public.transactions
  for select using (user_id = (select auth.uid()));
create policy "transactions_insert_own" on public.transactions
  for insert with check (user_id = (select auth.uid()));
create policy "transactions_update_own" on public.transactions
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "transactions_delete_own" on public.transactions
  for delete using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- budgets
-- Per category, per calendar month. `month` is always the first of the
-- month so (user_id, category_id, month) can be uniquely constrained.
-- ---------------------------------------------------------------------------
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  month date not null check (date_trunc('month', month) = month),
  amount numeric(12, 2) not null,
  created_at timestamptz not null default now(),
  unique (user_id, category_id, month)
);

alter table public.budgets enable row level security;

create policy "budgets_select_own" on public.budgets
  for select using (user_id = (select auth.uid()));
create policy "budgets_insert_own" on public.budgets
  for insert with check (user_id = (select auth.uid()));
create policy "budgets_update_own" on public.budgets
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "budgets_delete_own" on public.budgets
  for delete using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Seed default categories for every new user.
-- ---------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.categories (user_id, name, color, icon) values
    (new.id, 'Commute', '#60A5FA', 'car'),
    (new.id, 'Food & drink', '#FBBF24', 'utensils'),
    (new.id, 'Fitness', '#F97066', 'dumbbell'),
    (new.id, 'Insurance', '#7C3AED', 'shield'),
    (new.id, 'Investments', '#34D399', 'trending-up'),
    (new.id, 'Leisure', '#A855F7', 'heart'),
    (new.id, 'Housing', '#FB923C', 'home'),
    (new.id, 'Groceries', '#A3E635', 'shopping-cart'),
    (new.id, 'Subscriptions', '#818CF8', 'refresh-cw'),
    (new.id, 'Taxes', '#4C1D95', 'landmark'),
    (new.id, 'Travel', '#2DD4BF', 'plane');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
