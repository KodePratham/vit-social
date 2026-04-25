-- Enforce VIT-only accounts at the Supabase Auth table level.
-- Run this in the Supabase SQL Editor after reviewing the delete statement.

begin;

-- Removes existing Gmail and any other non-VIT accounts.
-- public.users rows are removed automatically through the auth.users cascade.
delete from auth.users
where email is null
  or lower(email) not like '%@vit.edu';

create or replace function public.enforce_vit_email_domain()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null or lower(new.email) not like '%@vit.edu' then
    raise exception 'Only @vit.edu email addresses are allowed';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_vit_email_domain on auth.users;

create trigger enforce_vit_email_domain
  before insert or update of email on auth.users
  for each row
  execute function public.enforce_vit_email_domain();

commit;
