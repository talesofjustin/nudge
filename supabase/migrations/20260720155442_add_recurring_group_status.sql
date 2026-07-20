-- Detection is a suggestion, never an automatic write: a recurring group
-- starts 'detected' and only flips a transaction's is_recurring flag once
-- the user explicitly confirms it (or dismisses it, which un-flags its
-- transactions and stops it resurfacing as a suggestion).
alter table public.recurring_groups
  add column status text not null default 'detected' check (status in ('detected', 'confirmed', 'dismissed'));

-- Safety backfill: earlier versions of recompute set is_recurring=true the
-- moment a pattern was detected, with no confirmation step. Every group
-- defaults to 'detected' above, so reset the flag on anything only ever
-- linked to a group — it re-flips true the moment the group (or the
-- transaction itself) is actually confirmed. Transactions flagged
-- recurring by hand with no group are untouched; that manual flag was
-- always its own confirmation.
update public.transactions
set is_recurring = false
where recurring_group_id is not null;
