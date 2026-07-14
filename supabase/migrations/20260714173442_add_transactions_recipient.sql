-- Separate recipient from description. The import wizard originally merged
-- the two into a single description string ("Payee — Memo") as a stopgap;
-- this undoes that before any real data exists.
alter table public.transactions
  add column recipient text;
