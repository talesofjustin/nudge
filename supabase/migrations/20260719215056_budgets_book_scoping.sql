-- Categories answer "what was this spent on"; books answer "whose money
-- was it" — a budget needs both, or a business lunch and a personal lunch
-- eat the same Food & drink budget. book_id null = global budget (used
-- when the user has no books); existing rows already become null for the
-- new column automatically, so nothing further to backfill.
alter table public.budgets
  add column book_id uuid references public.books (id) on delete cascade;

alter table public.budgets
  drop constraint budgets_user_id_category_id_month_key;

alter table public.budgets
  add constraint budgets_user_id_book_id_category_id_month_key
  unique (user_id, book_id, category_id, month);
