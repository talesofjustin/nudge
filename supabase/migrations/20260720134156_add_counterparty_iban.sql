-- Counterparty identity: an IBAN is unambiguous where a recipient name
-- isn't. Transactions get it straight from an explicit column mapping or
-- (as a fallback) parsed from the raw description's "IBAN:" field.
alter table public.transactions
  add column counterparty_iban text;

-- Rule/decision tables key on identity, preferring IBAN over name. A
-- generated column keeps that precedence enforced at the constraint level
-- rather than in application code: two rules can't collide on identity
-- (whichever one they were actually keyed on), and a name-only rule still
-- works exactly as before once no IBAN is known.
alter table public.known_recipients
  add column counterparty_iban text,
  add column identity_key text generated always as (coalesce(counterparty_iban, lower(recipient))) stored;
alter table public.known_recipients drop constraint known_recipients_user_id_recipient_key;
alter table public.known_recipients add constraint known_recipients_user_id_identity_key_key unique (user_id, identity_key);

alter table public.recipient_book_rules
  add column counterparty_iban text,
  add column identity_key text generated always as (coalesce(counterparty_iban, lower(recipient))) stored;
alter table public.recipient_book_rules drop constraint recipient_book_rules_user_id_recipient_key;
alter table public.recipient_book_rules add constraint recipient_book_rules_user_id_identity_key_key unique (user_id, identity_key);

alter table public.recipient_category_rules
  add column counterparty_iban text,
  add column identity_key text generated always as (coalesce(counterparty_iban, lower(recipient))) stored;
alter table public.recipient_category_rules drop constraint recipient_category_rules_user_id_recipient_key;
alter table public.recipient_category_rules add constraint recipient_category_rules_user_id_identity_key_key unique (user_id, identity_key);
