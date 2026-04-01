-- 1. Reduce invite TTL from 7 days to 48 hours
alter table invitations
  alter column expires_at set default (now() + interval '48 hours');

-- 2. Atomic token consumption: validate + mark-used + create profile in one transaction.
--    Replaces the two-round-trip approach in the API route that had a TOCTOU race.
--    Called via supabase.rpc('use_invitation', { ... }) from an authenticated session.
create or replace function public.use_invitation(
  p_token          text,
  p_full_name      text,
  p_phone          text,
  p_whatsapp_phone text default ''
)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id        uuid := auth.uid();
  v_user_email     text;
  v_invite         record;
  v_profile        record;
begin
  -- Resolve authenticated user's email
  select email into v_user_email
  from auth.users
  where id = v_user_id;

  if v_user_email is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  -- Lock the invitation row to prevent concurrent consumption
  select id, email, municipality_id, role, expires_at, used_at
  into v_invite
  from invitations
  where token = p_token
  for update;

  if not found then
    raise exception 'invitation_not_found' using errcode = 'P0002';
  end if;

  if v_invite.used_at is not null then
    raise exception 'invitation_already_used' using errcode = 'P0003';
  end if;

  if v_invite.expires_at < now() then
    raise exception 'invitation_expired' using errcode = 'P0004';
  end if;

  if lower(v_invite.email) <> lower(v_user_email) then
    raise exception 'email_mismatch' using errcode = 'P0005';
  end if;

  if exists (select 1 from profiles where id = v_user_id) then
    raise exception 'profile_already_exists' using errcode = 'P0006';
  end if;

  -- Mark invitation consumed before inserting profile (fail fast on double-use)
  update invitations set used_at = now() where id = v_invite.id;

  -- Create profile — municipality and role come from the trusted invite row
  insert into profiles (id, municipality_id, role, full_name, phone, whatsapp_phone, is_active)
  values (
    v_user_id,
    v_invite.municipality_id,
    v_invite.role,
    trim(p_full_name),
    trim(p_phone),
    coalesce(nullif(trim(p_whatsapp_phone), ''), trim(p_phone)),
    true
  )
  returning * into v_profile;

  return row_to_json(v_profile);
end;
$$;
