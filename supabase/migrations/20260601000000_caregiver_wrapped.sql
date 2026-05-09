-- Caregiver Wrapped (v2.1)
-- Stores generated wrap snapshots so stats are stable across views and shares.

create table if not exists public.caregiver_wrappeds (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.care_circles(id) on delete cascade,
  member_id uuid not null references public.circle_members(id) on delete cascade,
  service_start_date timestamptz not null,
  service_end_date   timestamptz not null,
  total_days_active        integer not null,
  total_tasks_done         integer not null,
  total_tasks_claimed      integer not null,
  medication_on_time_ratio numeric(4,3) not null default 0,
  night_shift_count        integer not null default 0,
  emergency_response_count integer not null default 0,
  longest_streak_days      integer not null default 0,
  top_category             text,
  top_category_share       numeric(4,3) not null default 0,
  snapshot jsonb not null,
  share_url uuid not null default gen_random_uuid(),
  is_public boolean not null default false,
  generated_at timestamptz not null default now(),
  viewed_at    timestamptz,
  shared_at    timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists caregiver_wrappeds_circle_member_idx
  on public.caregiver_wrappeds (circle_id, member_id);
create unique index if not exists caregiver_wrappeds_share_url_idx
  on public.caregiver_wrappeds (share_url);

create table if not exists public.caregiver_wrapped_shares (
  id uuid primary key default gen_random_uuid(),
  wrapped_id uuid not null references public.caregiver_wrappeds(id) on delete cascade,
  platform text not null check (platform in ('twitter','instagram','email','telegram','copy','link')),
  shared_by_id uuid references public.circle_members(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists caregiver_wrapped_shares_wrapped_idx
  on public.caregiver_wrapped_shares (wrapped_id);

alter table public.caregiver_wrappeds        enable row level security;
alter table public.caregiver_wrapped_shares  enable row level security;

-- Members of the circle can read their own wraps.
create policy if not exists caregiver_wrappeds_member_read on public.caregiver_wrappeds
  for select using (
    exists (
      select 1 from public.circle_members cm
      where cm.circle_id = caregiver_wrappeds.circle_id
        and cm.user_id = auth.uid()
    )
  );

-- Public share URL: anyone can read if is_public.
create policy if not exists caregiver_wrappeds_public_read on public.caregiver_wrappeds
  for select using (is_public = true);

create policy if not exists caregiver_wrappeds_member_write on public.caregiver_wrappeds
  for insert with check (
    exists (
      select 1 from public.circle_members cm
      where cm.circle_id = caregiver_wrappeds.circle_id
        and cm.user_id = auth.uid()
    )
  );

create policy if not exists caregiver_wrapped_shares_member_read on public.caregiver_wrapped_shares
  for select using (
    exists (
      select 1
      from public.caregiver_wrappeds w
      join public.circle_members cm on cm.circle_id = w.circle_id
      where w.id = caregiver_wrapped_shares.wrapped_id
        and cm.user_id = auth.uid()
    )
  );

create policy if not exists caregiver_wrapped_shares_member_write on public.caregiver_wrapped_shares
  for insert with check (
    exists (
      select 1
      from public.caregiver_wrappeds w
      join public.circle_members cm on cm.circle_id = w.circle_id
      where w.id = caregiver_wrapped_shares.wrapped_id
        and cm.user_id = auth.uid()
    )
  );
