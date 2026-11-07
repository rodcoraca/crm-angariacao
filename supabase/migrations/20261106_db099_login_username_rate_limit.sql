create table if not exists public.login_username_attempts (
  bucket_type text not null check (bucket_type in ('ip', 'username')),
  bucket_key text not null check (length(trim(bucket_key)) > 0),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  window_start timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (bucket_type, bucket_key)
);

alter table public.login_username_attempts enable row level security;

revoke all on table public.login_username_attempts from public;
revoke all on table public.login_username_attempts from anon;
revoke all on table public.login_username_attempts from authenticated;

create or replace function public.check_and_increment_login_attempt(
  p_bucket_type text,
  p_bucket_key text,
  p_window_seconds integer default 60,
  p_limit integer default 5
)
returns table (
  is_blocked boolean,
  attempts integer,
  window_start timestamptz
)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  normalized_bucket_type text;
  normalized_bucket_key text;
  normalized_window_seconds integer := coalesce(p_window_seconds, 60);
  normalized_limit integer := coalesce(p_limit, 5);
  current_window interval;
begin
  if p_bucket_type is null or p_bucket_key is null then
    raise exception 'bucket type and key are required';
  end if;

  normalized_bucket_type := lower(trim(p_bucket_type));
  normalized_bucket_key := trim(p_bucket_key);

  if normalized_bucket_type not in ('ip', 'username') then
    raise exception 'invalid bucket type';
  end if;

  if normalized_bucket_key = '' then
    raise exception 'invalid bucket key';
  end if;

  if normalized_window_seconds < 1 or normalized_window_seconds > 3600 then
    raise exception 'invalid window seconds';
  end if;

  if normalized_limit < 1 or normalized_limit > 50 then
    raise exception 'invalid rate limit value';
  end if;

  current_window := make_interval(secs => normalized_window_seconds);

  return query
  with upserted as (
    INSERT INTO public.login_username_attempts (
      bucket_type,
      bucket_key,
      attempt_count,
      window_start,
      updated_at
    )
    values (
      normalized_bucket_type,
      normalized_bucket_key,
      1,
      now(),
      now()
    )
    ON CONFLICT (bucket_type, bucket_key)
    DO UPDATE SET
      attempt_count = case
        when public.login_username_attempts.window_start + current_window <= now() then 1
        else public.login_username_attempts.attempt_count + 1
      end,
      window_start = case
        when public.login_username_attempts.window_start + current_window <= now() then now()
        else public.login_username_attempts.window_start
      end,
      updated_at = now()
    returning bucket_type, bucket_key, attempt_count, window_start
  )
  select
    (attempt_count >= normalized_limit) as is_blocked,
    attempt_count,
    window_start
  from upserted;
end;
$$;

revoke all on function public.check_and_increment_login_attempt(text, text, integer, integer) from public;
revoke all on function public.check_and_increment_login_attempt(text, text, integer, integer) from anon;
revoke all on function public.check_and_increment_login_attempt(text, text, integer, integer) from authenticated;
grant execute on function public.check_and_increment_login_attempt(text, text, integer, integer) to service_role;
