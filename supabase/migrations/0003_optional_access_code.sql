-- Make the Community Access Code optional.
-- While code_required = false, any logged-in user sees contacts (visitors still don't).
-- Setting a new code from the admin page switches the requirement back on.

alter table public.app_settings
  add column if not exists code_required boolean not null default true;

update public.app_settings set code_required = false where id = 1;

create or replace function public.is_member()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p, public.app_settings s
    where p.id = auth.uid()
      and (p.role in ('staff', 'admin') or not s.code_required or p.code_version = s.code_version)
  );
$$;

create or replace function public.my_status()
returns table (role text, is_member boolean, display_name text, email text)
language sql stable security definer
set search_path = ''
as $$
  select p.role,
         (p.role in ('staff', 'admin') or not s.code_required or p.code_version = s.code_version),
         p.display_name,
         p.email
  from public.profiles p, public.app_settings s
  where p.id = auth.uid();
$$;

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
        code_required = true,
        updated_at = now()
    where id = 1;
end;
$$;

-- Admin only: turn the code requirement off (or back on with the current code).
create or replace function public.set_code_required(required boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  update public.app_settings set code_required = required, updated_at = now() where id = 1;
end;
$$;

-- Admin only: is the code currently required?
create or replace function public.access_settings()
returns table (code_required boolean)
language sql stable security definer
set search_path = ''
as $$
  select s.code_required from public.app_settings s where public.is_admin() and s.id = 1;
$$;

revoke execute on function public.set_code_required(boolean), public.access_settings() from anon, public;
grant execute on function public.set_code_required(boolean), public.access_settings() to authenticated;
