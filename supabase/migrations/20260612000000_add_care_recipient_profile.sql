alter table public.care_recipients
add column if not exists care_profile jsonb not null default '{}'::jsonb;
