BEGIN;

-- Allow both campus domains at the DB layer.
CREATE OR REPLACE FUNCTION public.is_allowed_campus_email(email_text text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $function$
  SELECT
    email_text IS NULL
    OR lower(split_part(trim(email_text), '@', 2)) IN ('vit.edu', 'viit.ac.in');
$function$;

-- Drop older users CHECK constraints that hardcoded @vit.edu
-- (or referenced older versions of this helper), regardless of constraint name.
DO $$
DECLARE
  constraint_row record;
BEGIN
  FOR constraint_row IN
    SELECT c.conname
    FROM pg_constraint c
    WHERE c.conrelid = 'public.users'::regclass
      AND c.contype = 'c'
      AND (
        pg_get_constraintdef(c.oid, true) ILIKE '%@vit.edu%'
        OR pg_get_constraintdef(c.oid, true) ILIKE '%is_allowed_campus_email%'
      )
  LOOP
    EXECUTE format(
      'ALTER TABLE public.users DROP CONSTRAINT IF EXISTS %I',
      constraint_row.conname
    );
  END LOOP;
END
$$;

-- Ensure a single canonical constraint exists in NOT VALID mode
-- so historical bad rows do not fail this migration.
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_email_allowed_domains_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_email_allowed_domains_check
  CHECK (public.is_allowed_campus_email(email))
  NOT VALID;

COMMIT;

-- Optional after cleaning old invalid rows:
-- ALTER TABLE public.users VALIDATE CONSTRAINT users_email_allowed_domains_check;
