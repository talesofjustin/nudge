-- Add "Salary" to the default seeded categories. Replaces the
-- handle_new_user() trigger function from the initial schema — only
-- affects future signups, existing users' categories are untouched.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.categories (user_id, name, color, icon) values
    (new.id, 'Salary', '#34D399', 'wallet'),
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
