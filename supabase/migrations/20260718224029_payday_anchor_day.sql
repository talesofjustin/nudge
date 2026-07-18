-- Lets the user align "monthly" summaries with their payday instead of the
-- calendar month. Null means "unset" — callers should treat that as day 1
-- (calendar month), so no backfill is needed for existing rows.
alter table public.user_settings
  add column payday_anchor_day integer
  check (payday_anchor_day is null or (payday_anchor_day between 1 and 31));
