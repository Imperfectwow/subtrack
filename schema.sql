-- ============================================================
-- SubTrack — סכמת מסד נתונים מלאה
-- Supabase / PostgreSQL
-- ============================================================

-- הפעל את הרחבות הנדרשות
create extension if not exists "uuid-ossp";
create extension if not exists "postgis"; -- לחישוב מרחקים גיאוגרפיים


-- ============================================================
-- 1. ENUMS — סוגי ערכים קבועים
-- ============================================================

do $$ begin
  create type user_role as enum (
    'super_admin',   -- אתה — גישה לכל המערכת
    'admin',         -- מנהל רשות מקומית
    'coordinator',   -- רכז בבית ספר
    'assistant'      -- מסייעת
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type absence_status as enum (
    'open',          -- נפתח, ממתין לשיבוץ
    'matching',      -- האלגוריתם מחפש
    'pending',       -- הצעה נשלחה למסייעת, ממתין לאישור
    'confirmed',     -- מסייעת אישרה
    'cancelled',     -- בוטל
    'no_show'        -- מסייעת לא הגיעה
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type assignment_status as enum (
    'offered',       -- הצעה נשלחה
    'accepted',      -- מסייעת קיבלה
    'confirmed',     -- שיבוץ סופי אושר
    'declined',      -- מסייעת דחתה
    'expired',       -- פג תוקף (לא ענתה תוך X דקות)
    'cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type whatsapp_direction as enum (
    'outbound',      -- מהמערכת למשתמש
    'inbound'        -- מהמשתמש למערכת
  );
exception when duplicate_object then null; end $$;


-- ============================================================
-- 2. MUNICIPALITIES — רשויות מקומיות
-- ============================================================

create table if not exists municipalities (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  slug          text not null unique,        -- לכתובת URL: tel-aviv, haifa...
  logo_url      text,
  contact_email text,
  contact_phone text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table municipalities is 'רשויות מקומיות — כל רשות היא tenant נפרד';


-- ============================================================
-- 3. SCHOOLS — בתי ספר
-- ============================================================

create table if not exists schools (
  id                uuid primary key default uuid_generate_v4(),
  municipality_id   uuid not null references municipalities(id) on delete cascade,
  name              text not null,
  address           text,
  location          geography(point, 4326),  -- קואורדינטות GPS
  principal_name    text,
  principal_phone   text,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table schools is 'בתי ספר — שייך לרשות מקומית';

create index if not exists idx_schools_municipality on schools(municipality_id);
create index if not exists idx_schools_location on schools using gist(location);


-- ============================================================
-- 4. PROFILES — פרופיל משתמש (מרחיב את auth.users של Supabase)
-- ============================================================

create table if not exists profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  municipality_id   uuid references municipalities(id) on delete set null,
  role              user_role not null default 'assistant',
  full_name         text not null,
  phone             text,
  whatsapp_phone    text,                    -- מספר וואטסאפ (יכול להיות שונה)
  avatar_url        text,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table profiles is 'פרופיל מורחב לכל משתמש במערכת';

create index if not exists idx_profiles_municipality on profiles(municipality_id);
create index if not exists idx_profiles_role on profiles(role);


-- ============================================================
-- 5. ASSISTANTS — פרטי מסייעות (בנוסף לפרופיל)
-- ============================================================

create table if not exists assistants (
  id                  uuid primary key references profiles(id) on delete cascade,
  municipality_id     uuid not null references municipalities(id) on delete cascade,
  current_location    geography(point, 4326),   -- מיקום נוכחי (מתעדכן מהאפליקציה)
  location_updated_at timestamptz,
  subjects            text[] not null default '{}',  -- ['מתמטיקה', 'אנגלית', ...]
  grades              text[] not null default '{}',  -- ['א', 'ב', 'ז', ...]
  rating              numeric(3,2) not null default 5.00 check (rating between 0 and 5),
  total_assignments   int not null default 0,
  is_available        boolean not null default true,
  bank_account        text,                          -- לצורך תשלום
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table assistants is 'פרטים נוספים למסייעות — דירוג, מיקום, מקצועות';

create index if not exists idx_assistants_municipality on assistants(municipality_id);
create index if not exists idx_assistants_location on assistants using gist(current_location);
create index if not exists idx_assistants_available on assistants(is_available);


-- ============================================================
-- 6. ABSENCES — דיווחי היעדרות
-- ============================================================

create table if not exists absences (
  id                uuid primary key default uuid_generate_v4(),
  municipality_id   uuid not null references municipalities(id) on delete cascade,
  school_id         uuid not null references schools(id) on delete cascade,
  reported_by       uuid references profiles(id) on delete set null,  -- מי דיווח (רכז / מורה)
  teacher_name      text not null,             -- שם המורה הנעדר
  teacher_phone     text,
  subject           text not null,             -- מקצוע
  grade             text not null,             -- כיתה
  absence_date      date not null default current_date,
  start_time        time not null default '08:00',
  end_time          time,
  status            absence_status not null default 'open',
  reported_via      text not null default 'app',  -- 'app' | 'whatsapp' | 'phone'
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table absences is 'דיווחי היעדרות מורים';

create index if not exists idx_absences_municipality on absences(municipality_id);
create index if not exists idx_absences_school on absences(school_id);
create index if not exists idx_absences_date on absences(absence_date);
create index if not exists idx_absences_status on absences(status);


-- ============================================================
-- 7. ASSIGNMENTS — שיבוצי מסייעות
-- ============================================================

create table if not exists assignments (
  id              uuid primary key default uuid_generate_v4(),
  absence_id      uuid not null references absences(id) on delete cascade,
  assistant_id    uuid not null references assistants(id) on delete cascade,
  municipality_id uuid not null references municipalities(id) on delete cascade,
  status          assignment_status not null default 'offered',
  offered_at      timestamptz not null default now(),
  responded_at    timestamptz,               -- מתי המסייעת הגיבה
  expires_at      timestamptz not null default (now() + interval '10 minutes'),
  offer_rank      int not null default 1,    -- סדר הצעה (1 = ראשון שהציעו לו)
  match_score     numeric(5,2),             -- ניקוד האלגוריתם
  distance_km     numeric(6,2),             -- מרחק מבית הספר בק"מ
  decline_reason  text,
  created_at      timestamptz not null default now()
);

comment on table assignments is 'שיבוצי מסייעות להיעדרויות';

create index if not exists idx_assignments_absence on assignments(absence_id);
create index if not exists idx_assignments_assistant on assignments(assistant_id);
create index if not exists idx_assignments_status on assignments(status);
create index if not exists idx_assignments_expires on assignments(expires_at) where status = 'offered';


-- ============================================================
-- 8. WHATSAPP_LOGS — לוג הודעות וואטסאפ
-- ============================================================

create table if not exists whatsapp_logs (
  id              uuid primary key default uuid_generate_v4(),
  municipality_id uuid references municipalities(id) on delete set null,
  absence_id      uuid references absences(id) on delete set null,
  assignment_id   uuid references assignments(id) on delete set null,
  profile_id      uuid references profiles(id) on delete set null,
  phone           text not null,
  direction       whatsapp_direction not null,
  message_type    text not null default 'text',  -- 'text' | 'template' | 'interactive'
  template_name   text,
  body            text,
  status          text not null default 'sent',  -- 'sent' | 'delivered' | 'read' | 'failed'
  external_id     text,                          -- ה-ID מ-WhatsApp API
  created_at      timestamptz not null default now()
);

comment on table whatsapp_logs is 'לוג כל הודעות הוואטסאפ שנשלחו/התקבלו';

create index if not exists idx_whatsapp_logs_absence on whatsapp_logs(absence_id);
create index if not exists idx_whatsapp_logs_phone on whatsapp_logs(phone);
create index if not exists idx_whatsapp_logs_created on whatsapp_logs(created_at desc);


-- ============================================================
-- 9. RATINGS — דירוגי מסייעות אחרי שיבוץ
-- ============================================================

create table if not exists ratings (
  id              uuid primary key default uuid_generate_v4(),
  assignment_id   uuid not null references assignments(id) on delete cascade,
  assistant_id    uuid not null references assistants(id) on delete cascade,
  rated_by        uuid references profiles(id) on delete set null,
  score           int not null check (score between 1 and 5),
  comment         text,
  created_at      timestamptz not null default now()
);

comment on table ratings is 'דירוגים של מסייעות אחרי שיבוץ';

create unique index if not exists idx_ratings_unique on ratings(assignment_id);  -- דירוג אחד לשיבוץ


-- ============================================================
-- 10. INVITATIONS — הזמנות למשתמשים חדשים
-- ============================================================

create table if not exists invitations (
  id              uuid        primary key default uuid_generate_v4(),
  token           text        not null unique,
  email           text        not null,
  municipality_id uuid        not null references municipalities(id) on delete cascade,
  role            user_role   not null default 'assistant',
  created_by      uuid        not null references profiles(id) on delete cascade,
  expires_at      timestamptz not null default (now() + interval '48 hours'),
  used_at         timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists idx_invitations_token           on invitations (token);
create index if not exists idx_invitations_municipality_id on invitations (municipality_id);
create index if not exists idx_invitations_email           on invitations (email);

comment on table invitations is 'קישורי הזמנה חד-פעמיים לצירוף משתמשים חדשים';


-- ============================================================
-- 11. FUNCTIONS — פונקציות עזר
-- ============================================================

-- עדכון updated_at אוטומטי
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- הפעל על כל הטבלאות הרלוונטיות
drop trigger if exists trg_municipalities_updated on municipalities;
create trigger trg_municipalities_updated before update on municipalities for each row execute function update_updated_at();
drop trigger if exists trg_schools_updated on schools;
create trigger trg_schools_updated before update on schools for each row execute function update_updated_at();
drop trigger if exists trg_profiles_updated on profiles;
create trigger trg_profiles_updated before update on profiles for each row execute function update_updated_at();
drop trigger if exists trg_assistants_updated on assistants;
create trigger trg_assistants_updated before update on assistants for each row execute function update_updated_at();
drop trigger if exists trg_absences_updated on absences;
create trigger trg_absences_updated before update on absences for each row execute function update_updated_at();

-- עדכון דירוג ממוצע של מסייעת אחרי כל דירוג חדש
create or replace function update_assistant_rating()
returns trigger as $$
begin
  update assistants
  set rating = (
    select round(avg(score)::numeric, 2)
    from ratings
    where assistant_id = new.assistant_id
  )
  where id = new.assistant_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_update_rating on ratings;
create trigger trg_update_rating after insert on ratings for each row execute function update_assistant_rating();

-- מציאת מסייעות זמינות לפי מרחק ממיקום בית הספר
create or replace function find_available_assistants(
  p_school_id     uuid,
  p_subject       text,
  p_radius_km     float default 5.0,
  p_limit         int default 10
)
returns table (
  assistant_id    uuid,
  full_name       text,
  phone           text,
  whatsapp_phone  text,
  rating          numeric,
  distance_km     numeric,
  subjects        text[],
  match_score     numeric
) as $$
declare
  v_school_location geography;
begin
  -- קבל את מיקום בית הספר
  select location into v_school_location from schools where id = p_school_id;

  return query
  select
    a.id as assistant_id,
    p.full_name,
    p.phone,
    p.whatsapp_phone,
    a.rating,
    round((st_distance(a.current_location, v_school_location) / 1000)::numeric, 2) as distance_km,
    a.subjects,
    -- ניקוד משוקלל: 50% מרחק, 30% דירוג, 20% התאמת מקצוע
    round((
      (1 - least(st_distance(a.current_location, v_school_location) / 1000, p_radius_km) / p_radius_km) * 50
      + (a.rating / 5.0) * 30
      + (case when p_subject = any(a.subjects) then 1 else 0 end) * 20
    )::numeric, 2) as match_score
  from assistants a
  join profiles p on p.id = a.id
  where
    a.is_available = true
    and p.is_active = true
    and st_dwithin(a.current_location, v_school_location, p_radius_km * 1000)
  order by match_score desc
  limit p_limit;
end;
$$ language plpgsql security definer set search_path = public, extensions, pg_temp;


-- ============================================================
-- 11. ROW LEVEL SECURITY — אבטחת נתונים
-- ============================================================

-- הפעל RLS על כל הטבלאות
alter table municipalities    enable row level security;
alter table schools           enable row level security;
alter table profiles          enable row level security;
alter table assistants        enable row level security;
alter table absences          enable row level security;
alter table assignments       enable row level security;
alter table whatsapp_logs     enable row level security;
alter table ratings           enable row level security;
alter table invitations       enable row level security;

-- פונקציה עזר: מה ה-role של המשתמש המחובר?
create or replace function my_role()
returns user_role as $$
  select role from profiles where id = auth.uid();
$$ language sql security definer stable set search_path = public, pg_temp;

-- פונקציה עזר: לאיזו רשות שייך המשתמש המחובר?
create or replace function my_municipality_id()
returns uuid as $$
  select municipality_id from profiles where id = auth.uid();
$$ language sql security definer stable set search_path = public, pg_temp;


-- MUNICIPALITIES
drop policy if exists "super_admin sees all"                     on municipalities;
drop policy if exists "admin sees own municipality"              on municipalities;
drop policy if exists "authenticated reads active municipalities" on municipalities;
drop policy if exists "super_admin manages"                      on municipalities;
create policy "super_admin sees all"                     on municipalities for select using (my_role() = 'super_admin');
create policy "admin sees own municipality"              on municipalities for select using (id = my_municipality_id());
create policy "authenticated reads active municipalities" on municipalities for select to authenticated using (is_active = true);
create policy "super_admin manages"                      on municipalities for all    using (my_role() = 'super_admin');

-- SCHOOLS
drop policy if exists "super_admin sees all schools"       on schools;
drop policy if exists "users see own municipality schools"  on schools;
drop policy if exists "admin manages schools"              on schools;
create policy "super_admin sees all schools"       on schools for select using (my_role() = 'super_admin');
create policy "users see own municipality schools"  on schools for select using (municipality_id = my_municipality_id());
create policy "admin manages schools"              on schools for all using (my_role() in ('super_admin', 'admin') and municipality_id = my_municipality_id());

-- PROFILES
drop policy if exists "users see own profile"    on profiles;
drop policy if exists "admin sees municipality"  on profiles;
drop policy if exists "super_admin sees all"     on profiles;
drop policy if exists "users update own profile" on profiles;
drop policy if exists "admin manages profiles"   on profiles;
create policy "users see own profile"    on profiles for select using (id = auth.uid());
create policy "admin sees municipality"  on profiles for select using (my_role() in ('super_admin', 'admin', 'coordinator') and municipality_id = my_municipality_id());
create policy "super_admin sees all"     on profiles for select using (my_role() = 'super_admin');
create policy "users update own profile" on profiles for update using (id = auth.uid());
create policy "admin manages profiles"   on profiles for all using (my_role() in ('super_admin', 'admin') and municipality_id = my_municipality_id());

-- ASSISTANTS
drop policy if exists "see assistants in municipality" on assistants;
drop policy if exists "assistant updates own"          on assistants;
drop policy if exists "admin manages assistants"       on assistants;
create policy "see assistants in municipality" on assistants for select using (municipality_id = my_municipality_id() or my_role() = 'super_admin');
create policy "assistant updates own"          on assistants for update using (id = auth.uid());
create policy "admin manages assistants"       on assistants for all using (my_role() in ('super_admin', 'admin') and municipality_id = my_municipality_id());

-- ABSENCES
drop policy if exists "see absences in municipality"  on absences;
drop policy if exists "coordinator creates absence"   on absences;
drop policy if exists "coordinator updates absence"   on absences;
create policy "see absences in municipality"  on absences for select using (municipality_id = my_municipality_id() or my_role() = 'super_admin');
create policy "coordinator creates absence"   on absences for insert with check (municipality_id = my_municipality_id() and my_role() in ('coordinator', 'admin', 'super_admin'));
create policy "coordinator updates absence"   on absences for update using (municipality_id = my_municipality_id() and my_role() in ('coordinator', 'admin', 'super_admin'));

-- ASSIGNMENTS
drop policy if exists "see assignments in municipality" on assignments;
drop policy if exists "assistant sees own assignments"  on assignments;
drop policy if exists "system manages assignments"      on assignments;
drop policy if exists "assistant responds"              on assignments;
create policy "see assignments in municipality" on assignments for select using (municipality_id = my_municipality_id() or my_role() = 'super_admin');
create policy "assistant sees own assignments"  on assignments for select using (assistant_id = auth.uid());
create policy "system manages assignments"      on assignments for all using (my_role() in ('super_admin', 'admin', 'coordinator'));
create policy "assistant responds"              on assignments for update using (assistant_id = auth.uid());

-- WHATSAPP_LOGS
drop policy if exists "admin sees logs" on whatsapp_logs;
create policy "admin sees logs" on whatsapp_logs for select using (my_role() in ('super_admin', 'admin', 'coordinator') and (municipality_id = my_municipality_id() or my_role() = 'super_admin'));

-- RATINGS
drop policy if exists "see ratings in municipality" on ratings;
drop policy if exists "coordinator rates"           on ratings;
create policy "see ratings in municipality" on ratings for select using (my_role() in ('super_admin', 'admin', 'coordinator') and exists (select 1 from assignments a where a.id = assignment_id and a.municipality_id = my_municipality_id()));
create policy "coordinator rates"           on ratings for insert with check (my_role() in ('coordinator', 'admin'));

-- INVITATIONS
drop policy if exists "read own municipality invitations"  on invitations;
drop policy if exists "super_admin sees all invitations"   on invitations;
drop policy if exists "create invitations"                 on invitations;
drop policy if exists "super_admin creates invitations"    on invitations;
drop policy if exists "admin revokes invitations"          on invitations;
drop policy if exists "super_admin revokes invitations"    on invitations;
create policy "read own municipality invitations"  on invitations for select to authenticated using (municipality_id = my_municipality_id() and my_role() in ('admin', 'coordinator'));
create policy "super_admin sees all invitations"   on invitations for select to authenticated using (my_role() = 'super_admin');
create policy "create invitations"                 on invitations for insert to authenticated with check (municipality_id = my_municipality_id() and my_role() in ('admin', 'coordinator'));
create policy "super_admin creates invitations"    on invitations for insert to authenticated with check (my_role() = 'super_admin');
create policy "admin revokes invitations"          on invitations for delete to authenticated using (municipality_id = my_municipality_id() and my_role() in ('admin', 'coordinator') and used_at is null);
create policy "super_admin revokes invitations"    on invitations for delete to authenticated using (my_role() = 'super_admin' and used_at is null);


-- ============================================================
-- 12. USE_INVITATION — atomic token consumption
-- ============================================================

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
  select email into v_user_email from auth.users where id = v_user_id;
  if v_user_email is null then raise exception 'not_authenticated'      using errcode = 'P0001'; end if;

  select id, email, municipality_id, role, expires_at, used_at
  into v_invite from invitations where token = p_token for update;
  if not found                          then raise exception 'invitation_not_found'    using errcode = 'P0002'; end if;
  if v_invite.used_at is not null       then raise exception 'invitation_already_used' using errcode = 'P0003'; end if;
  if v_invite.expires_at < now()        then raise exception 'invitation_expired'      using errcode = 'P0004'; end if;
  if lower(v_invite.email) <> lower(v_user_email)
                                        then raise exception 'email_mismatch'          using errcode = 'P0005'; end if;
  if exists (select 1 from profiles where id = v_user_id)
                                        then raise exception 'profile_already_exists'  using errcode = 'P0006'; end if;

  update invitations set used_at = now() where id = v_invite.id;

  insert into profiles (id, municipality_id, role, full_name, phone, whatsapp_phone, is_active)
  values (
    v_user_id, v_invite.municipality_id, v_invite.role,
    trim(p_full_name), trim(p_phone),
    coalesce(nullif(trim(p_whatsapp_phone), ''), trim(p_phone)),
    true
  )
  returning * into v_profile;

  return row_to_json(v_profile);
end;
$$;


-- ============================================================
-- 13. SEED DATA — נתוני בדיקה
-- ============================================================

-- רשויות
insert into municipalities (id, name, slug, contact_email) values
  ('00000000-0000-4000-8000-000000000001', 'עיריית תל אביב-יפו', 'tel-aviv', 'edu@tlv.gov.il'),
  ('00000000-0000-4000-8000-000000000002', 'עיריית חיפה', 'haifa', 'edu@haifa.gov.il')
on conflict (id) do nothing;

-- בתי ספר (עם קואורדינטות אמיתיות)
insert into schools (municipality_id, name, address, location) values
  ('00000000-0000-4000-8000-000000000001', 'יסודי הרצל', 'רחוב הרצל 12, תל אביב',   st_point(34.7741, 32.0853)::geography),
  ('00000000-0000-4000-8000-000000000001', 'חטיבת בן-גוריון', 'שדרות בן-גוריון 5, תל אביב', st_point(34.7695, 32.0873)::geography),
  ('00000000-0000-4000-8000-000000000001', 'תיכון וייצמן', 'רחוב ויצמן 30, תל אביב',   st_point(34.7912, 32.0854)::geography),
  ('00000000-0000-4000-8000-000000000001', 'אקדמיית איינשטיין', 'רחוב אלנבי 80, תל אביב', st_point(34.7729, 32.0672)::geography),
  ('00000000-0000-4000-8000-000000000002', 'יסודי גולדה', 'רחוב הנביאים 10, חיפה',    st_point(34.9896, 32.7940)::geography)
on conflict do nothing;


-- ============================================================
-- סיום
-- ============================================================
-- 
-- שלבים הבאים:
-- 1. הרץ את הסקריפט הזה ב-Supabase SQL Editor
-- 2. צור משתמשים דרך Supabase Auth (Dashboard > Authentication > Users)
-- 3. הוסף רשומות ל-profiles עם role מתאים
-- 4. התחל לבנות את ה-Next.js עם @supabase/ssr
--
-- ============================================================