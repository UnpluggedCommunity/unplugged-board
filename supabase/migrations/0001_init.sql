-- Unplugged Board — initial schema (Phase 1a)
-- Run once in Supabase: Dashboard → SQL Editor → paste this whole file → Run.
--
-- Security model
--   * Public listing data lives in public.listings (readable by everyone while live).
--   * Contacts and original post links live in public.listing_private and are readable
--     ONLY by verified members (valid Community Access Code) and staff.
--   * Changing the access code bumps app_settings.code_version, so every non-staff
--     member has to enter the new code again.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Profiles & roles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  role text not null default 'member' check (role in ('member', 'staff', 'admin')),
  code_version int not null default 0,
  code_failures int not null default 0,
  code_last_failure timestamptz,
  created_at timestamptz not null default now()
);

-- Emails that become staff/admin automatically on (or after) first login.
create table public.staff_invites (
  email text primary key,
  role text not null check (role in ('staff', 'admin')),
  created_at timestamptz not null default now()
);

-- Single-row settings table. Never exposed to the browser directly.
create table public.app_settings (
  id int primary key default 1 check (id = 1),
  access_code_hash text not null,
  code_version int not null default 1,
  updated_at timestamptz not null default now()
);

-- Placeholder code: CHANGE IT from the admin page (or see README).
insert into public.app_settings (access_code_hash)
values (extensions.crypt('CHANGE-ME', extensions.gen_salt('bf')));

-- Create a profile for every new auth user; apply pending staff invites.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url, role)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url',
    coalesce((select i.role from public.staff_invites i where i.email = lower(new.email)), 'member')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Inviting an email that already has an account promotes it immediately.
create or replace function public.apply_staff_invite()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set role = new.role where email = lower(new.email);
  return new;
end;
$$;

create trigger on_staff_invite
  after insert or update on public.staff_invites
  for each row execute function public.apply_staff_invite();

-- ---------------------------------------------------------------------------
-- Role helpers (used by RLS policies)
-- ---------------------------------------------------------------------------

create or replace function public.is_staff()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('staff', 'admin')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- A verified member has redeemed the CURRENT access code (staff always count).
create or replace function public.is_member()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p, public.app_settings s
    where p.id = auth.uid()
      and (p.role in ('staff', 'admin') or p.code_version = s.code_version)
  );
$$;

-- Everything the site needs to know about the current user, in one call.
create or replace function public.my_status()
returns table (role text, is_member boolean, display_name text, email text)
language sql stable security definer
set search_path = ''
as $$
  select p.role,
         (p.role in ('staff', 'admin') or p.code_version = s.code_version),
         p.display_name,
         p.email
  from public.profiles p, public.app_settings s
  where p.id = auth.uid();
$$;

-- Returns true when the code is right. Max 8 wrong attempts per hour per user.
create or replace function public.redeem_access_code(code text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  prof public.profiles;
  settings public.app_settings;
begin
  if auth.uid() is null then
    raise exception 'not_logged_in';
  end if;

  select * into prof from public.profiles where id = auth.uid() for update;
  select * into settings from public.app_settings where id = 1;

  if prof.code_failures >= 8 and prof.code_last_failure > now() - interval '1 hour' then
    raise exception 'too_many_attempts';
  end if;

  if settings.access_code_hash = extensions.crypt(upper(trim(code)), settings.access_code_hash) then
    update public.profiles
      set code_version = settings.code_version, code_failures = 0
      where id = auth.uid();
    return true;
  end if;

  update public.profiles
    set code_failures = case
          when code_last_failure > now() - interval '1 hour' then code_failures + 1
          else 1
        end,
        code_last_failure = now()
    where id = auth.uid();
  return false;
end;
$$;

-- Admin only. Every non-staff member must re-enter the new code.
create or replace function public.set_access_code(new_code text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  if length(trim(new_code)) < 4 then
    raise exception 'code_too_short';
  end if;
  update public.app_settings
    set access_code_hash = extensions.crypt(upper(trim(new_code)), extensions.gen_salt('bf')),
        code_version = code_version + 1,
        updated_at = now()
    where id = 1;
end;
$$;

-- ---------------------------------------------------------------------------
-- Zones (suburb → zone lookup, editable by admin)
-- ---------------------------------------------------------------------------

create table public.suburb_zones (
  suburb text primary key,          -- lower case, e.g. 'osborne park'
  zone text not null
);

-- ---------------------------------------------------------------------------
-- Listings
-- ---------------------------------------------------------------------------

create table public.listings (
  id bigint generated always as identity primary key,
  type text not null check (type in ('job', 'room', 'item')),
  status text not null default 'published'
    check (status in ('draft', 'pending', 'published', 'hidden', 'archived', 'rejected')),
  source text not null default 'staff' check (source in ('staff', 'member')),

  title text not null,
  summary text,
  zone text,
  suburb text,

  -- Jobs
  job_category text,
  pay_amount numeric,
  pay_amount_max numeric,
  pay_unit text check (pay_unit in ('hour', 'day', 'week', 'annual', 'piece')),
  -- Rough hourly equivalent, only used to sort/filter by pay.
  pay_hour_equiv numeric generated always as (
    case pay_unit
      when 'hour' then pay_amount
      when 'day' then pay_amount / 8
      when 'week' then pay_amount / 38
      when 'annual' then pay_amount / 1976
    end
  ) stored,
  pay_cash boolean,
  employment_type text check (employment_type in ('casual', 'part-time', 'full-time', 'contract')),
  start_date date,
  start_text text,
  hours_text text,
  req_tickets text[] not null default '{}',
  req_own_car boolean,
  req_experience text,
  req_english text,
  accommodation_provided boolean,
  accommodation_text text,
  whv_417 text not null default 'unknown' check (whv_417 in ('likely', 'not_eligible', 'unknown')),

  -- Rooms
  rent_week numeric,
  rent_from_month boolean not null default false,
  bond numeric,
  bills text check (bills in ('included', 'not_included', 'partial')),
  room_type text check (room_type in ('single', 'double', 'shared')),
  furnished boolean,
  available_from date,
  min_stay text,
  couples_ok boolean,
  gender_pref text,
  parking text,
  transport text,

  -- Media
  photos text[] not null default '{}',
  og_image text,

  -- Dates
  posted_at timestamptz,            -- date of the original Facebook post
  published_at timestamptz,
  expires_at timestamptz,

  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index listings_live_idx on public.listings (type, status, expires_at desc);
create index listings_zone_idx on public.listings (zone);

-- Contacts & original links: members only.
create table public.listing_private (
  listing_id bigint primary key references public.listings (id) on delete cascade,
  contact_name text,
  contact_phone text,
  contact_email text,
  apply_url text,
  original_url text
);

-- Lifetime per type, counted from the Facebook post date (falls back to publish date).
create or replace function public.listing_lifetime(t text)
returns interval
language sql immutable
as $$
  select case t when 'job' then interval '10 days'
                when 'room' then interval '14 days'
                else interval '30 days' end;
$$;

create or replace function public.listings_before_write()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  if tg_op = 'INSERT' and new.expires_at is null
     or tg_op = 'UPDATE' and new.posted_at is distinct from old.posted_at then
    new.expires_at := coalesce(new.posted_at, new.published_at, now()) + public.listing_lifetime(new.type);
  end if;
  return new;
end;
$$;

create trigger listings_before_write
  before insert or update on public.listings
  for each row execute function public.listings_before_write();

-- Staff / owner: push the expiry forward by a full lifetime from today.
create or replace function public.renew_listing(listing bigint)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  result timestamptz;
begin
  update public.listings l
    set expires_at = now() + public.listing_lifetime(l.type),
        status = case when l.status = 'archived' then 'published' else l.status end
    where l.id = listing
      and (public.is_staff() or l.created_by = auth.uid())
    returning l.expires_at into result;
  if result is null then
    raise exception 'forbidden';
  end if;
  return result;
end;
$$;

-- Removal requests (anyone, including visitors)
create table public.removal_requests (
  id bigint generated always as identity primary key,
  listing_id bigint references public.listings (id) on delete cascade,
  email text,
  reason text not null check (length(reason) between 5 and 2000),
  handled boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.staff_invites enable row level security;
alter table public.app_settings enable row level security;
alter table public.suburb_zones enable row level security;
alter table public.listings enable row level security;
alter table public.listing_private enable row level security;
alter table public.removal_requests enable row level security;

-- profiles: see yourself; staff see everyone; admin changes roles.
create policy profiles_self_read on public.profiles
  for select using (id = auth.uid() or public.is_staff());
create policy profiles_admin_update on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- staff_invites: admin only.
create policy invites_admin on public.staff_invites
  for all using (public.is_admin()) with check (public.is_admin());

-- app_settings: no policies → nobody reads it through the API (functions only).

-- suburb_zones: readable by all, editable by admin.
create policy zones_read on public.suburb_zones for select using (true);
create policy zones_admin on public.suburb_zones
  for all using (public.is_admin()) with check (public.is_admin());

-- listings: live ones are public; staff see all; owners see their own.
create policy listings_read on public.listings
  for select using (
    (status = 'published' and expires_at > now())
    or public.is_staff()
    or created_by = auth.uid()
  );
create policy listings_staff_write on public.listings
  for all using (public.is_staff()) with check (public.is_staff());

-- listing_private: ONLY verified members, and only for listings they can see.
create policy private_member_read on public.listing_private
  for select using (
    public.is_member()
    and exists (select 1 from public.listings l where l.id = listing_id)
  );
create policy private_staff_write on public.listing_private
  for all using (public.is_staff()) with check (public.is_staff());

-- removal_requests: anyone can file; staff read & update.
create policy removal_insert on public.removal_requests
  for insert with check (handled = false);
create policy removal_staff on public.removal_requests
  for select using (public.is_staff());
create policy removal_staff_update on public.removal_requests
  for update using (public.is_staff());

-- ---------------------------------------------------------------------------
-- Grants (Supabase no longer exposes new tables to the API automatically)
-- ---------------------------------------------------------------------------

revoke all on public.app_settings from anon, authenticated;

grant select on public.listings, public.suburb_zones to anon, authenticated;
grant select on public.listing_private to authenticated;
grant insert, update, delete on public.listings, public.listing_private to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.staff_invites, public.suburb_zones to authenticated;
grant insert on public.removal_requests to anon, authenticated;
grant select, update on public.removal_requests to authenticated;

revoke execute on all functions in schema public from anon, public;
grant execute on function
  public.is_staff(), public.is_admin(), public.is_member(), public.my_status(),
  public.redeem_access_code(text), public.set_access_code(text),
  public.renew_listing(bigint)
  to authenticated;
-- RLS policies on anon-readable tables call these helpers.
grant execute on function public.is_staff(), public.is_member(), public.listing_lifetime(text) to anon, authenticated;
