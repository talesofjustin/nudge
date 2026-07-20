-- Appearance preference (light / dark / system) for the profile menu and
-- Settings > Appearance toggle. Null/'system' both mean "follow the OS".
alter table public.user_settings
  add column theme text check (theme in ('light', 'dark', 'system'));
