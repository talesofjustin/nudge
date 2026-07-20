-- Distinguishes categories the user chose from ones a recipient rule
-- applied automatically on import, and tracks whether the user has
-- consciously passed over an auto-applied one. reviewed_at is set the
-- moment the category picker is used on a row, regardless of whether the
-- chosen value changes — opening and confirming is the review, not a
-- separate action.
alter table public.transactions
  add column category_source text check (category_source in ('manual', 'auto')),
  add column reviewed_at timestamptz;
