-- Recurring grouping changes unit from "one group per counterparty" to
-- "one group per counterparty + amount cluster" (see lib/recurring.ts).
-- Existing groups were built under the old model and are wrong — e.g. a
-- sender with two genuinely different recurring charges (motor tax vs.
-- car tax from the same tax office) collapsed into one group, with the
-- second charge wrongly treated as an outlier of the first.
--
-- Reset entirely rather than trying to migrate the old identity_key
-- format in place: the app rebuilds every group correctly under the new
-- model the next time recurring data is computed (on import, and now also
-- whenever /recurring is visited). Manually-flagged transactions are
-- included in this reset too — the whole point is that grouping decisions
-- made under the old (wrong) model shouldn't be trusted, and the new
-- clustering will recreate a correct group for any real recurring pattern,
-- manual or detected.
update public.transactions
set recurring_group_id = null
where recurring_group_id is not null;

update public.transactions
set is_recurring = false
where is_recurring = true;

delete from public.recurring_groups;
