-- ============================================================
-- Seed: Super Admin Account
-- Run this AFTER logging in with Google at least once.
-- Paste into: Supabase Dashboard → SQL Editor → Run
-- ============================================================

do $$
declare
  v_user_id uuid;
begin
  -- Find the auth user by Google email
  select id into v_user_id
  from auth.users
  where email = 'alexander.zavoloko@gmail.com'
  limit 1;

  if v_user_id is null then
    raise exception 'User not found. Log in with Google first, then re-run this script.';
  end if;

  -- Upsert the profile as super_admin
  insert into public.profiles (id, role, full_name, is_active)
  values (v_user_id, 'super_admin', 'Alexander', true)
  on conflict (id) do update
    set role       = 'super_admin',
        full_name  = coalesce(nullif(profiles.full_name, ''), 'Alexander'),
        is_active  = true,
        updated_at = now();

  raise notice 'Super admin created for user: %', v_user_id;
end;
$$;
