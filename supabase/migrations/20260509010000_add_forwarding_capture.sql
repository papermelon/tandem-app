create table if not exists public.telegram_users (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id text not null unique,
  user_id text references public.users(id) on delete set null,
  display_name text,
  username text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.capture_events (
  id text primary key,
  care_circle_id text not null references public.care_circles(id) on delete cascade,
  platform text not null check (platform in ('telegram', 'web')),
  source_type text not null check (source_type in ('text', 'image', 'document', 'voice')),
  status text not null check (status in ('processing', 'pending_review', 'saved', 'ignored', 'failed')),
  platform_message_id text,
  platform_sender_id text,
  sender_name text,
  original_file_path text,
  original_file_name text,
  original_file_mime_type text,
  raw_text text,
  extracted_text text,
  ai_summary text,
  extraction_json jsonb not null default '{}'::jsonb,
  preview_message_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.extracted_items (
  id text primary key,
  capture_event_id text not null references public.capture_events(id) on delete cascade,
  care_circle_id text not null references public.care_circles(id) on delete cascade,
  item_type text not null check (item_type in ('appointment', 'task', 'medication', 'note', 'document', 'concern')),
  title text not null,
  summary text not null,
  status text not null check (status in ('pending', 'approved', 'deleted')) default 'pending',
  assigned_to_id text references public.users(id) on delete set null,
  due_at timestamptz,
  priority text check (priority in ('low', 'medium', 'high')),
  category text check (category in ('appointment', 'transport', 'medication', 'admin', 'finance', 'check-in', 'home safety')),
  structured_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists capture_events_care_circle_status_idx on public.capture_events (care_circle_id, status, created_at desc);
create index if not exists extracted_items_capture_status_idx on public.extracted_items (capture_event_id, status);

alter table public.telegram_users enable row level security;
alter table public.capture_events enable row level security;
alter table public.extracted_items enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'telegram_users' and policyname = 'Authenticated users can read telegram users') then
    create policy "Authenticated users can read telegram users" on public.telegram_users for select to authenticated using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'capture_events' and policyname = 'Authenticated users can read capture events') then
    create policy "Authenticated users can read capture events" on public.capture_events for select to authenticated using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'extracted_items' and policyname = 'Authenticated users can read extracted items') then
    create policy "Authenticated users can read extracted items" on public.extracted_items for select to authenticated using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'capture_events' and policyname = 'Authenticated users can write capture events') then
    create policy "Authenticated users can write capture events" on public.capture_events for all to authenticated using (true) with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'extracted_items' and policyname = 'Authenticated users can write extracted items') then
    create policy "Authenticated users can write extracted items" on public.extracted_items for all to authenticated using (true) with check (true);
  end if;
end $$;
