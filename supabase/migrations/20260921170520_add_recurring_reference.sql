-- Amount-based clustering (see 20260723091220) separates two recurring
-- charges from the same counterparty only when their amounts happen to
-- differ enough — that's luck, not identification. A stable reference
-- extracted from the raw description (e.g. an insurance Polisnummer) is a
-- real identifier: two charges under different policy numbers are
-- genuinely different recurring items even if their amounts are close,
-- and the same policy's amount can drift (a renewal price change) without
-- becoming a different item. See lib/recurring.ts and
-- lib/parse-raw-description.ts.
alter table public.transactions
  add column recurring_reference text;

alter table public.recurring_groups
  add column reference text;

-- Reset entirely, same rationale as the previous amount-clustering reset
-- (20260723091220): grouping decisions made without knowing about
-- available references shouldn't be trusted. The app rebuilds every group
-- correctly under the improved model the next time recurring data is
-- computed (on import, and whenever /recurring is visited), backfilling
-- recurring_reference from each transaction's already-stored
-- raw_description along the way.
update public.transactions
set recurring_group_id = null
where recurring_group_id is not null;

update public.transactions
set is_recurring = false
where is_recurring = true;

delete from public.recurring_groups;
