-- Tracks whether the user has dismissed the reactive "want to track
-- business separately?" nudge, so it never re-asks after a no. There is no
-- corresponding "shown" state — the suggestion is recomputed from current
-- account/book counts on every load, and this column only ever flips false
-- -> true.
alter table public.user_settings
  add column book_suggestion_dismissed boolean not null default false;
