-- Invite-only onboarding: one-time signed links for new users.
-- Admins / coordinators create invitations; each token is single-use + expiring.

create table invitations (
  id              uuid        primary key default uuid_generate_v4(),
  token           text        not null unique,
  email           text        not null,
  municipality_id uuid        not null references municipalities(id) on delete cascade,
  role            user_role   not null default 'assistant',
  created_by      uuid        not null references profiles(id) on delete cascade,
  expires_at      timestamptz not null default (now() + interval '7 days'),
  used_at         timestamptz,
  created_at      timestamptz not null default now()
);

create index on invitations (token);
create index on invitations (municipality_id);
create index on invitations (email);

comment on table invitations is 'קישורי הזמנה חד-פעמיים לצירוף משתמשים חדשים';

alter table invitations enable row level security;

-- Admins and coordinators can read invitations belonging to their own municipality
create policy "read own municipality invitations"
  on invitations for select
  to authenticated
  using (municipality_id = my_municipality_id() and my_role() in ('admin', 'coordinator'));

-- Super-admin sees everything
create policy "super_admin sees all invitations"
  on invitations for select
  to authenticated
  using (my_role() = 'super_admin');

-- Admins and coordinators can INSERT invitations for their own municipality only
create policy "create invitations"
  on invitations for insert
  to authenticated
  with check (municipality_id = my_municipality_id() and my_role() in ('admin', 'coordinator'));

-- Token validation and marking-used is done server-side via service-role or via
-- a dedicated API route — no client-side UPDATE/DELETE allowed.
