-- Three-layer book resolution: a transaction's own book_id (explicit
-- override) beats a recipient rule, which beats the account's default,
-- which otherwise leaves the transaction unassigned for review.
alter table public.accounts
  add column default_book_id uuid references public.books (id) on delete set null;

create table public.recipient_book_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  recipient text not null,
  book_id uuid not null references public.books (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, recipient)
);

alter table public.recipient_book_rules enable row level security;

create policy "recipient_book_rules_select_own" on public.recipient_book_rules
  for select using (user_id = (select auth.uid()));
create policy "recipient_book_rules_insert_own" on public.recipient_book_rules
  for insert with check (user_id = (select auth.uid()));
create policy "recipient_book_rules_update_own" on public.recipient_book_rules
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "recipient_book_rules_delete_own" on public.recipient_book_rules
  for delete using (user_id = (select auth.uid()));

-- Backfill: where every one of an account's transactions already shares
-- the exact same (non-null) book, that's unambiguous — set it as the
-- account's default. Accounts with no book history, or a genuine mix,
-- are left with no default (mixed / ask-per-transaction), and every
-- existing transaction-level book_id is left exactly as it was — nothing
-- is overwritten, only null gaps get filled in below.
with account_book_stats as (
  select
    account_id,
    count(*) as total_tx,
    count(book_id) as tx_with_book,
    count(distinct book_id) filter (where book_id is not null) as distinct_books
  from public.transactions
  group by account_id
)
update public.accounts a
set default_book_id = (
  select t.book_id from public.transactions t
  where t.account_id = a.id and t.book_id is not null
  limit 1
)
from account_book_stats s
where a.id = s.account_id
  and s.distinct_books = 1
  and s.tx_with_book = s.total_tx;

-- Now that unambiguous accounts have a default, resolve any of their
-- transactions that were never assigned a book at all — this is the
-- account-default layer applied retroactively to historical NULLs only;
-- it never touches a transaction that already has its own value.
update public.transactions t
set book_id = a.default_book_id
from public.accounts a
where t.account_id = a.id
  and t.book_id is null
  and a.default_book_id is not null;
