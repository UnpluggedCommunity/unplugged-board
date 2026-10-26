-- Member reports: "Already taken" / "Looks suspicious".
-- Two "taken" reports from different members hide the listing until staff checks it.
-- Run in Supabase → SQL Editor after 0005.

create table public.listing_reports (
  id bigint generated always as identity primary key,
  listing_id bigint not null references public.listings (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('taken', 'suspicious')),
  note text check (length(note) <= 500),
  handled boolean not null default false,
  created_at timestamptz not null default now(),
  unique (listing_id, user_id, kind)
);
create index listing_reports_open_idx on public.listing_reports (handled, created_at);

create or replace function public.reports_auto_hide()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.kind = 'taken' and (
    select count(distinct r.user_id) from public.listing_reports r
    where r.listing_id = new.listing_id and r.kind = 'taken' and not r.handled
  ) >= 2 then
    update public.listings set status = 'hidden' where id = new.listing_id and status = 'published';
  end if;
  return new;
end;
$$;

create trigger listing_reports_auto_hide
  after insert on public.listing_reports
  for each row execute function public.reports_auto_hide();

alter table public.listing_reports enable row level security;

create policy reports_insert_own on public.listing_reports
  for insert to authenticated with check (user_id = auth.uid() and handled = false);
create policy reports_read on public.listing_reports
  for select using (user_id = auth.uid() or public.is_staff());
create policy reports_staff_update on public.listing_reports
  for update using (public.is_staff());

grant select, insert, update on public.listing_reports to authenticated;
