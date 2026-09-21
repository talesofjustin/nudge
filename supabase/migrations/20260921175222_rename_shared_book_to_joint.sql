-- "Shared" (the account-setup preset answer, see add-account-dialog.tsx)
-- is renamed to "Joint" — its meaning as "a book for a joint account with
-- someone else" wasn't clear from the label alone. Any book a user
-- already has from picking that old preset gets the same rename so
-- existing accounts read consistently with the new copy going forward.
update public.books set name = 'Joint' where lower(name) = 'shared';
