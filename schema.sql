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

create type user_role as enum (
  'super_admin',   -- אתה — גישה לכל המערכת
  'admin',         -- מנהל רשות מקומית
  'coordinator',   -- רכז בבית ספר
  'assistant'      -- מסייעת
);

create type absence_status as enum (
  'open',          -- נפתח, ממתין לשיבוץ
  'matching',      -- האלגוריתם מחפש
  'pending',       -- הצעה נשלחה למסייעת, ממתין לאישור
  'confirmed',     -- מסייעת אישרה
  'cancelled',     -- בוטל
  'no_show'        -- מסייעת לא הגיעה
);

create type assignment_status as enum (
  'offered',       -- הצעה נשלחה
  'accepted',      -- מסייעת קיבלה
  'declined',      -- מסייעת דחתה
  'expired',       -- פג תוקף (לא ענתה תוך X דקות)
  'cancelled'
);

create type whatsapp_direction as enum (
  'outbound',      -- מהמערכת למשתמש
  'inbound'        -- מהמשתמש למערכת
);


-- ============================================================
-- 2. MUNICIPALITIES — רשויות מקומיות
-- ============================================================

create table municipalities (
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

create table schools (
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

create index idx_schools_municipality on schools(municipality_id);
create index idx_schools_location on schools using gist(location);


-- ============================================================
-- 4. PROFILES — פרופיל משתמש (מרחיב את auth.users של Supabase)
-- ============================================================

create table profiles (
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

create index idx_profiles_municipality on profiles(municipality_id);
create index idx_profiles_role on profiles(role);


-- ============================================================
-- 5. ASSISTANTS — פרטי מסייעות (בנוסף לפרופיל)
-- ============================================================

create table assistants (
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

create index idx_assistants_municipality on assistants(municipality_id);
create index idx_assistants_location on assistants using gist(current_location);
create index idx_assistants_available on assistants(is_available);


-- ============================================================
-- 6. ABSENCES — דיווחי היעדרות
-- ============================================================

create table absences (
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

create index idx_absences_municipality on absences(municipality_id);
create index idx_absences_school on absences(school_id);
create index idx_absences_date on absences(absence_date);
create index idx_absences_status on absences(status);


-- ============================================================
-- 7. ASSIGNMENTS — שיבוצי מסייעות
-- ============================================================

create table assignments (
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

create index idx_assignments_absence on assignments(absence_id);
create index idx_assignments_assistant on assignments(assistant_id);
create index idx_assignments_status on assignments(status);
create index idx_assignments_expires on assignments(expires_at) where status = 'offered';


-- ============================================================
-- 8. WHATSAPP_LOGS — לוג הודעות וואטסאפ
-- ============================================================

create table whatsapp_logs (
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

create index idx_whatsapp_logs_absence on whatsapp_logs(absence_id);
create index idx_whatsapp_logs_phone on whatsapp_logs(phone);
create index idx_whatsapp_logs_created on whatsapp_logs(created_at desc);


-- ============================================================
-- 9. RATINGS — דירוגי מסייעות אחרי שיבוץ
-- ============================================================

create table ratings (
  id              uuid primary key default uuid_generate_v4(),
  assignment_id   uuid not null references assignments(id) on delete cascade,
  assistant_id    uuid not null references assistants(id) on delete cascade,
  rated_by        uuid references profiles(id) on delete set null,
  score           int not null check (score between 1 and 5),
  comment         text,
  created_at      timestamptz not null default now()
);

comment on table ratings is 'דירוגים של מסייעות אחרי שיבוץ';

create unique index idx_ratings_unique on ratings(assignment_id);  -- דירוג אחד לשיבוץ


-- ============================================================
-- 10. FUNCTIONS — פונקציות עזר
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
create trigger trg_municipalities_updated before update on municipalities for each row execute function update_updated_at();
create trigger trg_schools_updated before update on schools for each row execute function update_updated_at();
create trigger trg_profiles_updated before update on profiles for each row execute function update_updated_at();
create trigger trg_assistants_updated before update on assistants for each row execute function update_updated_at();
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

create trigger trg_update_rating after insert on ratings for each row execute function update_assistant_rating();

-- מציאת מסייעות זמינות לפי מרחק ממיקום בית הספר
create or replace function find_available_assistants(
  p_school_id     uuid,
  p_subject       text,
  p_grade         text default null,
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
  grades          text[],
  match_score     numeric
) as $$
declare
  v_school_location  geography;
  v_municipality_id  uuid;
begin
  -- קבל את מיקום ורשות בית הספר
  select s.location, s.municipality_id
  into v_school_location, v_municipality_id
  from schools s where s.id = p_school_id;

  return query
  select
    a.id as assistant_id,
    p.full_name,
    p.phone,
    p.whatsapp_phone,
    a.rating,
    round((st_distance(a.current_location, v_school_location) / 1000)::numeric, 2) as distance_km,
    a.subjects,
    a.grades,
    -- ניקוד משוקלל: 40% מרחק, 30% דירוג, 20% התאמת מקצוע, 10% התאמת כיתה
    round((
      (1 - least(st_distance(a.current_location, v_school_location) / 1000, p_radius_km) / p_radius_km) * 40
      + (a.rating / 5.0) * 30
      + (case when p_subject = any(a.subjects) then 1 else 0 end) * 20
      + (case when p_grade is null or p_grade = any(a.grades) then 1 else 0 end) * 10
    )::numeric, 2) as match_score
  from assistants a
  join profiles p on p.id = a.id
  where
    a.municipality_id = v_municipality_id        -- multi-tenant: רק מסייעות מאותה רשות
    and a.current_location is not null           -- מניעת שגיאת NULL בחישוב מרחק
    and a.is_available = true
    and p.is_active = true
    and st_dwithin(a.current_location, v_school_location, p_radius_km * 1000)
  order by match_score desc
  limit p_limit;
end;
$$ language plpgsql security definer;


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

-- פונקציה עזר: מה ה-role של המשתמש המחובר?
create or replace function my_role()
returns user_role as $$
  select role from profiles where id = auth.uid();
$$ language sql security definer stable;

-- פונקציה עזר: לאיזו רשות שייך המשתמש המחובר?
create or replace function my_municipality_id()
returns uuid as $$
  select municipality_id from profiles where id = auth.uid();
$$ language sql security definer stable;


-- MUNICIPALITIES
create policy "super_admin sees all"       on municipalities for select using (my_role() = 'super_admin');
create policy "admin sees own municipality" on municipalities for select using (id = my_municipality_id());
create policy "super_admin manages"        on municipalities for all    using (my_role() = 'super_admin');

-- SCHOOLS
create policy "super_admin sees all schools"  on schools for select using (my_role() = 'super_admin');
create policy "users see own municipality schools" on schools for select using (municipality_id = my_municipality_id());
create policy "admin manages schools"      on schools for all using (my_role() in ('super_admin', 'admin') and municipality_id = my_municipality_id());

-- PROFILES
create policy "users see own profile"      on profiles for select using (id = auth.uid());
create policy "admin sees municipality"    on profiles for select using (my_role() in ('super_admin', 'admin', 'coordinator') and municipality_id = my_municipality_id());
create policy "super_admin sees all"       on profiles for select using (my_role() = 'super_admin');
create policy "users update own profile"   on profiles for update using (id = auth.uid());
create policy "admin manages profiles"     on profiles for all using (my_role() in ('super_admin', 'admin') and municipality_id = my_municipality_id());

-- ASSISTANTS
create policy "see assistants in municipality" on assistants for select using (municipality_id = my_municipality_id() or my_role() = 'super_admin');
create policy "assistant updates own"      on assistants for update using (id = auth.uid());
create policy "admin manages assistants"   on assistants for all using (my_role() in ('super_admin', 'admin') and municipality_id = my_municipality_id());

-- ABSENCES
create policy "see absences in municipality" on absences for select using (municipality_id = my_municipality_id() or my_role() = 'super_admin');
create policy "coordinator creates absence"  on absences for insert with check (municipality_id = my_municipality_id() and my_role() in ('coordinator', 'admin', 'super_admin'));
create policy "coordinator updates absence"  on absences for update using (municipality_id = my_municipality_id() and my_role() in ('coordinator', 'admin', 'super_admin'));

-- ASSIGNMENTS
create policy "see assignments in municipality" on assignments for select using (municipality_id = my_municipality_id() or my_role() = 'super_admin');
create policy "assistant sees own assignments"  on assignments for select using (assistant_id = auth.uid());
create policy "system manages assignments"      on assignments for all using (my_role() in ('super_admin', 'admin', 'coordinator'));
create policy "assistant responds"              on assignments for update using (assistant_id = auth.uid());

-- WHATSAPP_LOGS
create policy "admin sees logs" on whatsapp_logs for select using (my_role() in ('super_admin', 'admin', 'coordinator') and (municipality_id = my_municipality_id() or my_role() = 'super_admin'));

-- RATINGS
create policy "see ratings in municipality" on ratings for select using (my_role() in ('super_admin', 'admin', 'coordinator') and exists (select 1 from assignments a where a.id = assignment_id and a.municipality_id = my_municipality_id()));
create policy "coordinator rates"           on ratings for insert with check (my_role() in ('coordinator', 'admin'));


-- ============================================================
-- 12. SEED DATA — נתוני בדיקה
-- ============================================================

-- רשויות
insert into municipalities (id, name, slug, contact_email) values
  ('11111111-0000-0000-0000-000000000001', 'עיריית תל אביב-יפו', 'tel-aviv', 'edu@tlv.gov.il'),
  ('11111111-0000-0000-0000-000000000002', 'עיריית חיפה', 'haifa', 'edu@haifa.gov.il');

-- בתי ספר (עם קואורדינטות אמיתיות)
insert into schools (municipality_id, name, address, location) values
  ('11111111-0000-0000-0000-000000000001', 'יסודי הרצל', 'רחוב הרצל 12, תל אביב',   st_point(34.7741, 32.0853)::geography),
  ('11111111-0000-0000-0000-000000000001', 'חטיבת בן-גוריון', 'שדרות בן-גוריון 5, תל אביב', st_point(34.7695, 32.0873)::geography),
  ('11111111-0000-0000-0000-000000000001', 'תיכון וייצמן', 'רחוב ויצמן 30, תל אביב',   st_point(34.7912, 32.0854)::geography),
  ('11111111-0000-0000-0000-000000000001', 'אקדמיית איינשטיין', 'רחוב אלנבי 80, תל אביב', st_point(34.7729, 32.0672)::geography),
  ('11111111-0000-0000-0000-000000000002', 'יסודי גולדה', 'רחוב הנביאים 10, חיפה',    st_point(34.9896, 32.7940)::geography);


-- ============================================================
-- 13. SCHEMA IMPROVEMENTS — תיקונים ושיפורים
-- ============================================================


-- ── A. ENUM חדש לערוץ דיווח ──────────────────────────────────
create type report_channel as enum ('app', 'whatsapp', 'phone', 'web');

-- החלף את העמודה הטקסטואלית ב-ENUM
alter table absences
  alter column reported_via drop default;

alter table absences
  alter column reported_via type report_channel
  using reported_via::report_channel;

alter table absences
  alter column reported_via set default 'app';


-- ── B. אילוץ: שעת סיום > שעת התחלה ──────────────────────────
alter table absences
  add constraint chk_absence_time
  check (end_time is null or end_time > start_time);


-- ── C. מניעת שיבוץ כפול מאושר לאותה היעדרות ─────────────────
create unique index idx_one_accepted_per_absence
  on assignments(absence_id)
  where status in ('accepted', 'confirmed');


-- ── D. מדיניות RLS חסרה — INSERT ────────────────────────────

-- MUNICIPALITIES
create policy "super_admin inserts municipality"
  on municipalities for insert
  with check (my_role() = 'super_admin');

-- SCHOOLS
create policy "admin inserts school"
  on schools for insert
  with check (my_role() in ('super_admin', 'admin') and municipality_id = my_municipality_id());

-- PROFILES (כל משתמש מחובר יכול ליצור פרופיל לעצמו)
create policy "user inserts own profile"
  on profiles for insert
  with check (id = auth.uid());

-- ASSISTANTS (admin יכול לרשום מסייעת ברשות שלו)
create policy "admin inserts assistant"
  on assistants for insert
  with check (my_role() in ('super_admin', 'admin') and municipality_id = my_municipality_id());

-- WHATSAPP_LOGS (מערכת בלבד — service_role מדלג על RLS; coordinator/admin לתיעוד ידני)
create policy "admin inserts whatsapp log"
  on whatsapp_logs for insert
  with check (my_role() in ('super_admin', 'admin', 'coordinator'));


-- ── E. תיקון שמות מדיניות כפולים ב-municipalities ───────────
-- מוחקים את המדיניות הישנה ומגדירים מחדש בשמות ייחודיים
drop policy if exists "super_admin sees all" on municipalities;
drop policy if exists "super_admin manages"  on municipalities;

create policy "super_admin_select_municipalities"
  on municipalities for select
  using (my_role() = 'super_admin');

create policy "super_admin_all_municipalities"
  on municipalities for all
  using (my_role() = 'super_admin');


-- ── F. עמודות מעקב ביטול ────────────────────────────────────

-- absences
alter table absences
  add column cancelled_by        uuid references profiles(id) on delete set null,
  add column cancellation_reason text,
  add column cancelled_at        timestamptz;

-- assignments
alter table assignments
  add column accepted_at         timestamptz,
  add column cancelled_by        uuid references profiles(id) on delete set null,
  add column cancellation_reason text,
  add column cancelled_at        timestamptz;


-- ── G. updated_at ב-assignments ──────────────────────────────
alter table assignments
  add column updated_at timestamptz not null default now();

create trigger trg_assignments_updated
  before update on assignments
  for each row execute function update_updated_at();


-- ── H. טבלאות חדשות ─────────────────────────────────────────

-- קישור רכזים לבתי ספר
create table school_coordinators (
  school_id      uuid not null references schools(id) on delete cascade,
  coordinator_id uuid not null references profiles(id) on delete cascade,
  created_at     timestamptz not null default now(),
  primary key (school_id, coordinator_id)
);

alter table school_coordinators enable row level security;

create policy "see school coordinators in municipality"
  on school_coordinators for select
  using (
    my_role() in ('super_admin', 'admin', 'coordinator')
    and exists (
      select 1 from schools s
      where s.id = school_id
        and (s.municipality_id = my_municipality_id() or my_role() = 'super_admin')
    )
  );

create policy "admin manages school coordinators"
  on school_coordinators for all
  using (
    my_role() in ('super_admin', 'admin')
    and exists (
      select 1 from schools s
      where s.id = school_id
        and (s.municipality_id = my_municipality_id() or my_role() = 'super_admin')
    )
  );


-- תשלומים
create table payroll_records (
  id              uuid primary key default uuid_generate_v4(),
  assignment_id   uuid not null references assignments(id) on delete restrict,
  assistant_id    uuid not null references assistants(id) on delete restrict,
  municipality_id uuid not null references municipalities(id) on delete cascade,
  amount          numeric(8,2) not null check (amount >= 0),
  currency        text not null default 'ILS',
  status          text not null default 'pending'
                  check (status in ('pending', 'paid', 'failed')),
  paid_at         timestamptz,
  external_ref    text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table payroll_records enable row level security;

create index idx_payroll_assistant  on payroll_records(assistant_id);
create index idx_payroll_assignment on payroll_records(assignment_id);
create index idx_payroll_status     on payroll_records(municipality_id, status);

create trigger trg_payroll_updated
  before update on payroll_records
  for each row execute function update_updated_at();

create policy "admin sees payroll in municipality"
  on payroll_records for select
  using (municipality_id = my_municipality_id() or my_role() = 'super_admin');

create policy "admin manages payroll"
  on payroll_records for all
  using (my_role() in ('super_admin', 'admin') and municipality_id = my_municipality_id());


-- לוח זמינות שבועי
create table availability_schedules (
  id            uuid primary key default uuid_generate_v4(),
  assistant_id  uuid not null references assistants(id) on delete cascade,
  day_of_week   int not null check (day_of_week between 0 and 6),  -- 0=ראשון
  start_time    time not null,
  end_time      time not null,
  is_active     boolean not null default true,
  constraint chk_avail_time check (end_time > start_time),
  created_at    timestamptz not null default now()
);

alter table availability_schedules enable row level security;

create index idx_avail_assistant on availability_schedules(assistant_id, day_of_week) where is_active = true;

create policy "assistant sees own availability"
  on availability_schedules for select
  using (assistant_id = auth.uid() or my_role() in ('super_admin', 'admin', 'coordinator'));

create policy "assistant manages own availability"
  on availability_schedules for all
  using (assistant_id = auth.uid());

create policy "admin manages availability"
  on availability_schedules for all
  using (my_role() in ('super_admin', 'admin'));


-- ── I. אינדקסים מורכבים לביצועים ─────────────────────────────

-- שאילתת לוח בוקר: היעדרויות פתוחות לפי רשות ותאריך
create index idx_absences_muni_date_status
  on absences(municipality_id, absence_date, status);

-- עבודת רקע: מציאת הצעות שפג תוקפן
create index idx_assignments_expires_status
  on assignments(expires_at, status)
  where status = 'offered';

-- חיפוש מסייעות זמינות
create index idx_assistants_muni_available
  on assistants(municipality_id, is_available)
  where is_available = true;

-- היסטוריית שיחת וואטסאפ לפי משתמש
create index idx_whatsapp_profile_time
  on whatsapp_logs(profile_id, created_at desc);

-- דירוגים לפי מסייעת
create index idx_ratings_assistant
  on ratings(assistant_id, created_at desc);

-- שיבוצים פתוחים לפי מסייעת
create index idx_assignments_assistant_status
  on assignments(assistant_id, status, offered_at)
  where status in ('offered', 'accepted');


-- ── J. אילוצי ייחודיות עסקיים ────────────────────────────────

-- שם בית ספר ייחודי ברשות
create unique index idx_schools_unique_name
  on schools(municipality_id, name);

-- מניעת דיווח כפול על אותה היעדרות
create unique index idx_absences_no_duplicate
  on absences(school_id, absence_date, subject, grade, start_time)
  where status not in ('cancelled');

-- פורמט slug תקין
alter table municipalities
  add constraint chk_slug_format
  check (slug ~ '^[a-z0-9-]+$');


-- ── K. שיפורים ל-whatsapp_logs ───────────────────────────────
alter table whatsapp_logs
  add column error_message text,
  add column retry_count   int not null default 0;

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
