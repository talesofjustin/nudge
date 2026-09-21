-- Links each transaction back to the specific statement import it came
-- from, so the import-review queue can identify exactly which rows
-- belong to a given import — account + date range alone is ambiguous
-- when two imports for the same account overlap. Only new imports (from
-- this point on) populate it; existing transactions are left null
-- (unattributed to any import) since which historical import produced
-- them can't be reconstructed after the fact. A null import_id simply
-- never appears in the review queue, which is the correct behavior for
-- data that predates this feature.
alter table public.transactions
  add column import_id uuid references public.imports (id) on delete set null;

create index transactions_import_id_idx on public.transactions (import_id)
  where import_id is not null;
