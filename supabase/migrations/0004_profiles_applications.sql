-- Job profiles, CVs, applications, saved listings and AI quota.
-- Run in Supabase → SQL Editor after 0003.

-- ---------------------------------------------------------------------------
-- Job profile: filled once, reused for every application
-- ---------------------------------------------------------------------------

create table public.job_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  full_name text,
  phone text,
  email text,
  suburb text,
  visa_type text check (visa_type in ('417', '462', 'student', 'graduate', 'sponsored', 'pr', 'citizen', 'other')),
  visa_expiry date,
  available_from date,
  goal text check (goal in ('long_term', 'sponsorship', 'casual', 'any')),
  wanted_categories text[] not null default '{}',
  licence text,
  own_car boolean,
  relocate boolean,
  tickets text[] not null default '{}',
  planned_tickets text[] not null default '{}',
  education text,
  english_level text check (english_level in ('basic', 'good', 'fluent', 'native')),
  languages text,
  -- [{ "role": "", "company": "", "place": "", "dates": "", "details": "" }]
  experience jsonb not null default '[]' check (jsonb_typeof(experience) = 'array'),
  strengths text,
  about text,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- CVs (files live in the private "cvs" storage bucket, one folder per user)
-- ---------------------------------------------------------------------------

create table public.cvs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  label text not null check (length(label) between 1 and 60),
  categories text[] not null default '{}',
  file_path text not null,
  file_name text not null,
  size_bytes int,
  created_at timestamptz not null default now()
);
create index cvs_user_idx on public.cvs (user_id);

create or replace function public.cvs_limit()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.cvs where user_id = new.user_id) >= 3 then
    raise exception 'cv_limit';
  end if;
  return new;
end;
$$;

create trigger cvs_limit before insert on public.cvs
  for each row execute function public.cvs_limit();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cvs', 'cvs', false, 2097152,
  array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']
)
on conflict (id) do nothing;

create policy cvs_owner_read on storage.objects for select to authenticated
  using (bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy cvs_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy cvs_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- Applications ("My applications")
-- ---------------------------------------------------------------------------

create table public.applications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  listing_id bigint references public.listings (id) on delete set null,
  listing_title text not null,
  cv_id uuid references public.cvs (id) on delete set null,
  channel text not null check (channel in ('email', 'whatsapp', 'sms', 'link', 'manual')),
  recipient text,
  subject text,
  body text,
  sent_by_platform boolean not null default false,
  created_at timestamptz not null default now()
);
create index applications_user_idx on public.applications (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Saved listings
-- ---------------------------------------------------------------------------

create table public.saved_listings (
  user_id uuid not null references public.profiles (id) on delete cascade,
  listing_id bigint not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

-- ---------------------------------------------------------------------------
-- AI quota: protects the free Gemini quota (per user, per Perth day)
-- ---------------------------------------------------------------------------

create table public.ai_usage (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  count int not null default 0,
  primary key (user_id, day)
);

create or replace function public.use_ai_quota(daily_limit int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'Australia/Perth')::date;
  used int;
begin
  if auth.uid() is null then
    return false;
  end if;
  insert into public.ai_usage (user_id, day, count) values (auth.uid(), today, 0)
    on conflict (user_id, day) do nothing;
  select count into used from public.ai_usage where user_id = auth.uid() and day = today for update;
  if used >= daily_limit then
    return false;
  end if;
  update public.ai_usage set count = count + 1 where user_id = auth.uid() and day = today;
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Public "how to apply" hint, so cards can show "Quick apply" without
-- exposing the contact itself.
-- ---------------------------------------------------------------------------

alter table public.listings add column if not exists apply_channel text
  check (apply_channel in ('email', 'phone', 'link'));

create or replace function public.sync_apply_channel()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.listings set apply_channel = case
      when new.contact_email is not null then 'email'
      when new.contact_phone is not null then 'phone'
      when new.apply_url is not null then 'link'
    end
  where id = new.listing_id;
  return new;
end;
$$;

create trigger listing_private_apply_channel
  after insert or update on public.listing_private
  for each row execute function public.sync_apply_channel();

update public.listings l set apply_channel = case
    when p.contact_email is not null then 'email'
    when p.contact_phone is not null then 'phone'
    when p.apply_url is not null then 'link'
  end
from public.listing_private p where p.listing_id = l.id;

-- ---------------------------------------------------------------------------
-- RLS: everything here is private to its owner (staff can read applications)
-- ---------------------------------------------------------------------------

alter table public.job_profiles enable row level security;
alter table public.cvs enable row level security;
alter table public.applications enable row level security;
alter table public.saved_listings enable row level security;
alter table public.ai_usage enable row level security;

create policy job_profiles_owner on public.job_profiles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy cvs_owner on public.cvs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy applications_owner_read on public.applications
  for select using (user_id = auth.uid() or public.is_staff());
create policy applications_owner_insert on public.applications
  for insert with check (user_id = auth.uid());
create policy applications_owner_delete on public.applications
  for delete using (user_id = auth.uid());
create policy saved_owner on public.saved_listings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy ai_usage_owner_read on public.ai_usage
  for select using (user_id = auth.uid());

grant select, insert, update, delete on public.job_profiles, public.cvs, public.saved_listings to authenticated;
grant select, insert, delete on public.applications to authenticated;
grant select on public.ai_usage to authenticated;

revoke execute on function public.use_ai_quota(int) from anon, public;
grant execute on function public.use_ai_quota(int) to authenticated;
