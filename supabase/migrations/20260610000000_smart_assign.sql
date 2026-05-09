-- Smart Assign (v2.0 Phase 2)
-- Adds per-member routing preferences and a routing_decisions log for telemetry.

alter table public.users
  add column if not exists category_preferences text[] not null default '{}',
  add column if not exists load_capacity_pct integer not null default 100;

alter table public.care_circles
  add column if not exists auto_execute_assignments boolean not null default false;

create table if not exists public.routing_decisions (
  id uuid primary key default gen_random_uuid(),
  care_circle_id text not null references public.care_circles(id) on delete cascade,
  extracted_item_id text references public.extracted_items(id) on delete cascade,
  candidates jsonb not null,
  chosen_member_id text references public.users(id) on delete set null,
  auto_executed boolean not null default false,
  accepted boolean,
  reassigned_within_4h boolean,
  decided_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists routing_decisions_circle_decided_idx
  on public.routing_decisions (care_circle_id, decided_at desc);

create index if not exists routing_decisions_item_idx
  on public.routing_decisions (extracted_item_id);

alter table public.routing_decisions enable row level security;

drop policy if exists "routing_decisions readable by circle members" on public.routing_decisions;
create policy "routing_decisions readable by circle members"
  on public.routing_decisions for select
  using (
    exists (
      select 1 from public.circle_members cm
      join public.users u on u.id = cm.user_id
      where cm.care_circle_id = routing_decisions.care_circle_id
        and u.auth_user_id = auth.uid()
    )
  );

drop policy if exists "routing_decisions writable by circle members" on public.routing_decisions;
create policy "routing_decisions writable by circle members"
  on public.routing_decisions for insert
  with check (
    exists (
      select 1 from public.circle_members cm
      join public.users u on u.id = cm.user_id
      where cm.care_circle_id = routing_decisions.care_circle_id
        and u.auth_user_id = auth.uid()
    )
  );

drop policy if exists "routing_decisions updatable by circle members" on public.routing_decisions;
create policy "routing_decisions updatable by circle members"
  on public.routing_decisions for update
  using (
    exists (
      select 1 from public.circle_members cm
      join public.users u on u.id = cm.user_id
      where cm.care_circle_id = routing_decisions.care_circle_id
        and u.auth_user_id = auth.uid()
    )
  );
