-- Duplicate matching needs to know whether occurred_at carries a real
-- time-of-day (parsed from the raw description, e.g. ING's "Datum/Tijd")
-- or is just a date defaulted to midnight — comparing the latter across
-- transactions would produce false "same time" matches. occurred_at
-- itself stays the single source of truth for when a transaction
-- happened; this only records how precise that value is.
alter table public.transactions
  add column has_precise_time boolean not null default false;
