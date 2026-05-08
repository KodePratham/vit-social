-- Allow both @vit.edu and @viit.ac.in across DB-level enforcement.

-- 1) Refresh email-domain CHECK constraint.
alter table public.users
  drop constraint if exists users_email_domain_check;

alter table public.users
  add constraint users_email_domain_check
  check (
    email ~* '^[A-Z0-9._%+-]+@(vit\\.edu|viit\\.ac\\.in)$'
  );

-- 2) Add explicit RLS policies for insert/update with both allowed domains.
-- These are append-only and do not require knowing existing policy names.
drop policy if exists "Users can insert own profile (allowed email domains)" on public.users;
create policy "Users can insert own profile (allowed email domains)"
  on public.users
  for insert
  to authenticated
  with check (
    auth.uid() = id
    and email ~* '^[A-Z0-9._%+-]+@(vit\\.edu|viit\\.ac\\.in)$'
  );

drop policy if exists "Users can update own profile (allowed email domains)" on public.users;
create policy "Users can update own profile (allowed email domains)"
  on public.users
  for update
  to authenticated
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and email ~* '^[A-Z0-9._%+-]+@(vit\\.edu|viit\\.ac\\.in)$'
  );
