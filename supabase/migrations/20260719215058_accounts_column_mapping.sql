-- Saves the column mapping chosen on an account's first import (date,
-- amount, recipient, description columns, decimal format, debit/credit
-- column + its money-out value) so later imports for the same account
-- skip the mapping step entirely.
alter table public.accounts
  add column column_mapping jsonb;
