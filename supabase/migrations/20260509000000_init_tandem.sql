create extension if not exists "pgcrypto";

create table if not exists public.users (
  id text primary key,
  auth_user_id uuid references auth.users(id) on delete set null,
  name text not null,
  role text not null,
  avatar text not null,
  phone text,
  is_default_caregiver boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.care_circles (
  id text primary key,
  name text not null,
  created_by text references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.care_recipients (
  id text primary key,
  care_circle_id text not null references public.care_circles(id) on delete cascade,
  name text not null,
  age integer not null,
  context text not null,
  address text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.circle_members (
  id uuid primary key default gen_random_uuid(),
  care_circle_id text not null references public.care_circles(id) on delete cascade,
  user_id text not null references public.users(id) on delete cascade,
  member_role text not null default 'family',
  created_at timestamptz not null default now(),
  unique (care_circle_id, user_id)
);

create table if not exists public.timeline_items (
  id text primary key,
  care_circle_id text not null references public.care_circles(id) on delete cascade,
  type text not null check (type in ('note', 'document', 'appointment', 'task', 'voice update', 'meeting summary', 'care signal')),
  title text not null,
  description text not null,
  author_id text not null references public.users(id) on delete restrict,
  timestamp timestamptz not null default now(),
  linked_task_ids text[] not null default '{}',
  linked_record_id text,
  severity text check (severity in ('normal', 'watch', 'alert')),
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id text primary key,
  care_circle_id text not null references public.care_circles(id) on delete cascade,
  title text not null,
  category text not null check (category in ('appointment', 'transport', 'medication', 'admin', 'finance', 'check-in', 'home safety')),
  assignee_id text references public.users(id) on delete set null,
  due_date timestamptz not null,
  status text not null check (status in ('unclaimed', 'claimed', 'done', 'blocked')),
  priority text not null check (priority in ('low', 'medium', 'high')),
  linked_record_id text,
  linked_timeline_id text references public.timeline_items(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.documents (
  id text primary key,
  care_circle_id text not null references public.care_circles(id) on delete cascade,
  document_type text not null,
  title text not null,
  summary text not null,
  uploaded_by_id text not null references public.users(id) on delete restrict,
  uploaded_at timestamptz not null default now(),
  storage_path text,
  important_dates text[] not null default '{}',
  institutions text[] not null default '{}',
  care_items text[] not null default '{}',
  extraction_json jsonb not null default '{}'::jsonb
);

create table if not exists public.care_signals (
  id text primary key,
  care_circle_id text not null references public.care_circles(id) on delete cascade,
  label text not null,
  description text not null,
  timestamp timestamptz not null default now(),
  severity text not null check (severity in ('normal', 'watch', 'alert'))
);

create table if not exists public.handovers (
  id text primary key,
  care_circle_id text not null references public.care_circles(id) on delete cascade,
  created_at timestamptz not null default now(),
  range_label text not null,
  current_situation text not null,
  upcoming_appointments text[] not null default '{}',
  active_tasks text[] not null default '{}',
  medication_reminders text[] not null default '{}',
  unresolved_admin text[] not null default '{}',
  recent_concerns text[] not null default '{}',
  who_is_doing_what text[] not null default '{}',
  suggested_next_actions text[] not null default '{}'
);

create index if not exists tasks_care_circle_due_idx on public.tasks (care_circle_id, due_date);
create index if not exists timeline_care_circle_time_idx on public.timeline_items (care_circle_id, timestamp desc);
create index if not exists care_signals_care_circle_time_idx on public.care_signals (care_circle_id, timestamp desc);

alter table public.users enable row level security;
alter table public.care_circles enable row level security;
alter table public.care_recipients enable row level security;
alter table public.circle_members enable row level security;
alter table public.timeline_items enable row level security;
alter table public.tasks enable row level security;
alter table public.documents enable row level security;
alter table public.care_signals enable row level security;
alter table public.handovers enable row level security;

create policy "Authenticated users can read users" on public.users for select to authenticated using (true);
create policy "Authenticated users can read care circles" on public.care_circles for select to authenticated using (true);
create policy "Authenticated users can read care recipients" on public.care_recipients for select to authenticated using (true);
create policy "Authenticated users can read circle members" on public.circle_members for select to authenticated using (true);
create policy "Authenticated users can read timeline items" on public.timeline_items for select to authenticated using (true);
create policy "Authenticated users can read tasks" on public.tasks for select to authenticated using (true);
create policy "Authenticated users can read documents" on public.documents for select to authenticated using (true);
create policy "Authenticated users can read care signals" on public.care_signals for select to authenticated using (true);
create policy "Authenticated users can read handovers" on public.handovers for select to authenticated using (true);

create policy "Authenticated users can write timeline items" on public.timeline_items for all to authenticated using (true) with check (true);
create policy "Authenticated users can write tasks" on public.tasks for all to authenticated using (true) with check (true);
create policy "Authenticated users can write documents" on public.documents for all to authenticated using (true) with check (true);
create policy "Authenticated users can write handovers" on public.handovers for all to authenticated using (true) with check (true);

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "Authenticated users can read document files"
on storage.objects for select to authenticated
using (bucket_id = 'documents');

create policy "Authenticated users can upload document files"
on storage.objects for insert to authenticated
with check (bucket_id = 'documents');
