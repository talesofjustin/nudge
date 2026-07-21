-- Cash isn't importable from a bank statement, so it doesn't belong
-- alongside the other account types that exist specifically to receive an
-- imported CSV. Existing cash accounts become 'other' rather than being
-- deleted or left in a now-invalid state.
update public.accounts set type = 'other' where type = 'cash';

alter table public.accounts drop constraint accounts_type_check;
alter table public.accounts add constraint accounts_type_check
  check (type in ('bank', 'paypal', 'credit_card', 'other'));
