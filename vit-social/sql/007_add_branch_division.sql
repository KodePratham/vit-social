-- Branch and class division for directory / discovery (nullable for existing rows until users set them).

alter table public.users
  add column if not exists branch text,
  add column if not exists division text;

comment on column public.users.branch is 'Program branch code, e.g. CS, IT.';
comment on column public.users.division is 'Class division letter within the branch, e.g. A, B.';
