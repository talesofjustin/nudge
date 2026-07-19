-- Tracks whether the user has dismissed the envelope-method tip on
-- /budget, so it doesn't reappear every visit once dismissed.
alter table public.user_settings
  add column budget_tip_dismissed boolean not null default false;
