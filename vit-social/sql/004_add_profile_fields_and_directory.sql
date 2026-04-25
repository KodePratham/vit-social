-- Add editable profile fields and allow signed-in users to see the member directory.

alter table public.users
  add column if not exists bio text,
  add column if not exists instagram_account text,
  add column if not exists twitter_account text,
  add column if not exists linkedin_account text;

create or replace function public.touch_users_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_users_updated_at on public.users;

create trigger touch_users_updated_at
  before update on public.users
  for each row
  execute function public.touch_users_updated_at();

drop policy if exists "Users can select own row" on public.users;
drop policy if exists "Authenticated users can select all users" on public.users;

create policy "Authenticated users can select all users"
  on public.users
  for select
  to authenticated
  using (true);
