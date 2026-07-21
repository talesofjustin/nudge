-- Categories are user-reorderable by drag; sort_order is the persisted
-- order, respected everywhere categories are listed. Existing rows are
-- backfilled in their current (creation) order so nothing visibly
-- reshuffles the first time this ships.
alter table public.categories add column sort_order integer not null default 0;

with ordered as (
  select id, row_number() over (partition by user_id order by created_at) - 1 as rn
  from public.categories
)
update public.categories c
set sort_order = ordered.rn
from ordered
where c.id = ordered.id;
