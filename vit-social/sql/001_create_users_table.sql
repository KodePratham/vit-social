-- public.users: app profile row for each Supabase Auth user.
-- Run in Supabase SQL Editor (or via migration). Order: 001 → 002 → 003 if backfill needed.

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists users_email_idx on public.users (email);

comment on table public.users is 'Application user profiles; rows mirror auth.users via trigger.';

alter table public.users enable row level security;

create policy "Users can select own row"
  on public.users
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update own row"
  on public.users
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

grant select, update on table public.users to authenticated;
