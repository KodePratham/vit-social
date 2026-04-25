-- Add GitHub profile links and friend request support.
-- Run after 005_enforce_vit_email_domain.sql.

alter table public.users
  add column if not exists github_account text;

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.users (id) on delete cascade,
  receiver_id uuid not null references public.users (id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint friend_requests_no_self check (requester_id <> receiver_id),
  constraint friend_requests_status_check check (status in ('pending', 'accepted', 'rejected'))
);

create index if not exists friend_requests_requester_id_idx
  on public.friend_requests (requester_id);

create index if not exists friend_requests_receiver_id_idx
  on public.friend_requests (receiver_id);

create unique index if not exists friend_requests_one_active_pair_idx
  on public.friend_requests (
    least(requester_id, receiver_id),
    greatest(requester_id, receiver_id)
  )
  where status in ('pending', 'accepted');

alter table public.friend_requests enable row level security;

create or replace function public.touch_friend_request_response()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status <> old.status and new.status in ('accepted', 'rejected') then
    new.responded_at = coalesce(new.responded_at, now());
  end if;

  return new;
end;
$$;

drop trigger if exists touch_friend_request_response on public.friend_requests;

create trigger touch_friend_request_response
  before update on public.friend_requests
  for each row
  execute function public.touch_friend_request_response();

drop policy if exists "Users can view their friend requests" on public.friend_requests;
drop policy if exists "Users can create friend requests" on public.friend_requests;
drop policy if exists "Users can respond to received friend requests" on public.friend_requests;

create policy "Users can view their friend requests"
  on public.friend_requests
  for select
  to authenticated
  using ((select auth.uid()) in (requester_id, receiver_id));

create policy "Users can create friend requests"
  on public.friend_requests
  for insert
  to authenticated
  with check (
    (select auth.uid()) = requester_id
    and requester_id <> receiver_id
    and status = 'pending'
  );

create policy "Users can respond to received friend requests"
  on public.friend_requests
  for update
  to authenticated
  using ((select auth.uid()) = receiver_id and status = 'pending')
  with check ((select auth.uid()) = receiver_id and status in ('accepted', 'rejected'));

grant select, insert on table public.friend_requests to authenticated;
grant update (status, responded_at) on table public.friend_requests to authenticated;
