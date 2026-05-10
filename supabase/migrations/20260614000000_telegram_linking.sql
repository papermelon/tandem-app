-- Telegram account linking
-- Links a Telegram sender to a signed-in Tandem user and their active care circle.

alter table public.telegram_users
  add column if not exists telegram_chat_id text,
  add column if not exists default_care_circle_id text references public.care_circles(id) on delete set null,
  add column if not exists default_care_recipient_id text references public.care_recipients(id) on delete set null,
  add column if not exists linked_at timestamptz;

create table if not exists public.telegram_link_tokens (
  token text primary key,
  user_id text not null references public.users(id) on delete cascade,
  care_circle_id text not null references public.care_circles(id) on delete cascade,
  care_recipient_id text references public.care_recipients(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists telegram_link_tokens_user_idx
  on public.telegram_link_tokens (user_id, created_at desc);

alter table public.telegram_link_tokens enable row level security;

drop policy if exists "telegram link tokens readable by owner" on public.telegram_link_tokens;
create policy "telegram link tokens readable by owner"
  on public.telegram_link_tokens for select
  using (
    exists (
      select 1 from public.users u
      where u.id = telegram_link_tokens.user_id
        and u.auth_user_id = auth.uid()
    )
  );

drop policy if exists "telegram link tokens writable by owner" on public.telegram_link_tokens;
create policy "telegram link tokens writable by owner"
  on public.telegram_link_tokens for insert
  with check (
    exists (
      select 1 from public.users u
      where u.id = telegram_link_tokens.user_id
        and u.auth_user_id = auth.uid()
    )
  );
