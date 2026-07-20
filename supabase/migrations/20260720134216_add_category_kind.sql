-- Money moved into savings/investments is still the user's — counting it
-- as an expense makes budgets meaningless. 'saving' categories are tracked
-- and displayed separately from 'spending' ones everywhere spend totals
-- are computed.
alter table public.categories
  add column kind text not null default 'spending' check (kind in ('spending', 'saving'));

-- Redefine the default-category seed so new signups get Investments
-- correctly marked as a saving category from the start.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.categories (user_id, name, color, icon, kind) values
    (new.id, 'Salary', '#34D399', 'wallet', 'spending'),
    (new.id, 'Commute', '#60A5FA', 'car', 'spending'),
    (new.id, 'Food & drink', '#FBBF24', 'utensils', 'spending'),
    (new.id, 'Fitness', '#F97066', 'dumbbell', 'spending'),
    (new.id, 'Insurance', '#7C3AED', 'shield', 'spending'),
    (new.id, 'Investments', '#34D399', 'trending-up', 'saving'),
    (new.id, 'Leisure', '#A855F7', 'heart', 'spending'),
    (new.id, 'Housing', '#FB923C', 'home', 'spending'),
    (new.id, 'Groceries', '#A3E635', 'shopping-cart', 'spending'),
    (new.id, 'Subscriptions', '#818CF8', 'refresh-cw', 'spending'),
    (new.id, 'Taxes', '#4C1D95', 'landmark', 'spending'),
    (new.id, 'Travel', '#2DD4BF', 'plane', 'spending');
  return new;
end;
$$;

update public.categories set kind = 'saving' where name = 'Investments';
