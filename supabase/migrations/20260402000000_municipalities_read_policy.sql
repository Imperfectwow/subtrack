-- Allow any authenticated user to read active municipalities.
-- This is required for the onboarding flow: new users (no profile yet) must
-- be able to pick their municipality before their profile row exists.
-- Without this policy, my_role() / my_municipality_id() both return NULL for
-- new users, so the existing policies never match, and the query returns 0 rows.

create policy "authenticated reads active municipalities"
  on municipalities
  for select
  to authenticated
  using (is_active = true);
