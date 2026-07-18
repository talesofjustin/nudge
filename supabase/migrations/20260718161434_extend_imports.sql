-- Extend the existing imports history table (20260715110614_imports.sql)
-- with the space it was imported into and the statement period actually
-- covered by the imported rows, so /import can show "what's missing".
alter table public.imports
  add column space_id uuid references public.spaces (id) on delete set null,
  add column skipped_count integer not null default 0,
  add column statement_start_date date,
  add column statement_end_date date;
