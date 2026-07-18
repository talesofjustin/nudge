-- Separate the raw bank-imported description text from the user's own
-- short label. Existing description values are copied forward as a raw
-- backup (we can't tell which were already hand-edited), then the
-- description column is made nullable so future imports start blank.
alter table public.transactions add column raw_description text;

update public.transactions set raw_description = description where raw_description is null;

alter table public.transactions alter column description drop not null;
