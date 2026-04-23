-- One-time: copy users already in auth.users before the trigger existed.

insert into public.users (id, email, full_name, avatar_url)
select
  u.id,
  u.email,
  nullif(
    trim(
      coalesce(
        u.raw_user_meta_data->>'full_name',
        u.raw_user_meta_data->>'name',
        ''
      )
    ),
    ''
  ),
  nullif(
    trim(
      coalesce(
        u.raw_user_meta_data->>'avatar_url',
        u.raw_user_meta_data->>'picture',
        ''
      )
    ),
    ''
  )
from auth.users u
where not exists (select 1 from public.users p where p.id = u.id)
on conflict (id) do update
set
  email = excluded.email,
  full_name = excluded.full_name,
  avatar_url = excluded.avatar_url,
  updated_at = now();
