-- Same learning mechanism as recipient_book_rules, for categories: "Always
-- categorise [recipient] as [category]?"
create table public.recipient_category_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  recipient text not null,
  category_id uuid not null references public.categories (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, recipient)
);

alter table public.recipient_category_rules enable row level security;

create policy "recipient_category_rules_select_own" on public.recipient_category_rules
  for select using (user_id = (select auth.uid()));
create policy "recipient_category_rules_insert_own" on public.recipient_category_rules
  for insert with check (user_id = (select auth.uid()));
create policy "recipient_category_rules_update_own" on public.recipient_category_rules
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "recipient_category_rules_delete_own" on public.recipient_category_rules
  for delete using (user_id = (select auth.uid()));
