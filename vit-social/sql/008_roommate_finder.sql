-- Roommate finder: users opt in with hostel campus + gender; listed users see peers with matching campus + gender.

alter table public.users
  add column if not exists seeking_roommate boolean not null default false,
  add column if not exists roommate_hostel_campus text,
  add column if not exists roommate_gender text;

comment on column public.users.seeking_roommate is 'True when the user is listed on the roommate finder.';
comment on column public.users.roommate_hostel_campus is 'VIT hostel campus for roommate matching.';
comment on column public.users.roommate_gender is 'Gender for same-gender roommate matching (male, female, other).';

alter table public.users
  drop constraint if exists users_roommate_hostel_campus_check;

alter table public.users
  add constraint users_roommate_hostel_campus_check
  check (
    roommate_hostel_campus is null
    or roommate_hostel_campus in ('Kondhwa', 'Bibwewadi')
  );

alter table public.users
  drop constraint if exists users_roommate_gender_check;

alter table public.users
  add constraint users_roommate_gender_check
  check (
    roommate_gender is null
    or roommate_gender in ('male', 'female', 'other')
  );

alter table public.users
  drop constraint if exists users_roommate_seeker_fields_check;

alter table public.users
  add constraint users_roommate_seeker_fields_check
  check (
    not seeking_roommate
    or (
      roommate_hostel_campus is not null
      and roommate_gender is not null
    )
  );

create index if not exists users_roommate_finder_idx
  on public.users (seeking_roommate, roommate_hostel_campus, roommate_gender)
  where seeking_roommate = true;
