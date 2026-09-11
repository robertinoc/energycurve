-- Rate limiting that survives more than one server.
--
-- The limiter was a Map in module scope. On Vercel that means the counter is per
-- instance and resets on every cold start, so "three exports an hour" was really
-- "three per instance per hour, until the instance goes away". The advertised
-- limit was never the real one, and the endpoint it protects hardest — the data
-- export, which returns an entire account in one response — is exactly the one
-- worth getting right.
--
-- The window has to change shape to be shareable at all. The old one started
-- whenever an instance happened to see the first request, so two instances would
-- compute two different expiries for the same key and neither could be authority.
-- Windows are now aligned to the epoch: every instance floors the clock the same
-- way and lands on the same bucket without talking to the others.
--
-- The trade that comes with a fixed window, stated rather than discovered: a
-- burst can straddle a boundary, so the true worst case is up to 2× the limit
-- across two adjacent windows. For "don't hammer this" limits that is fine, and
-- it is the same trade the in-memory version already made.

create table if not exists public.rate_limit_buckets (
  -- Opaque: "export:<profileId>", "contact:<ip>", "mutation:<profileId>". The
  -- caller owns the shape, exactly as it did when this was a Map key.
  key text not null,
  -- Start of the window, floored to its size. Part of the primary key so an
  -- expired bucket is a different row rather than a row that needs resetting.
  window_start timestamptz not null,
  count integer not null default 0 check (count >= 0),
  primary key (key, window_start)
);

-- The retention sweep deletes by age; without this it seq-scans a table whose
-- whole purpose is to be written to on every limited request.
create index if not exists rate_limit_buckets_window_idx
  on public.rate_limit_buckets (window_start);

/*
 * Increments a bucket only while it is under the limit, in one statement.
 *
 * Same shape as `consume_feature_quota` and for the same reason: the conditional
 * lives in `on conflict … where`, so two requests arriving together cannot both
 * read "2 of 3" and both write 3. Postgres serialises them on the primary key.
 *
 * Returns the new count, or no row when the limit is already reached. No row is
 * the refusal — the caller does not have to compare anything.
 */
create or replace function public.consume_rate_limit(
  p_key text,
  p_window_start timestamptz,
  p_limit integer
)
returns integer
language sql
security definer
set search_path = public
as $$
  insert into public.rate_limit_buckets (key, window_start, count)
  values (p_key, p_window_start, 1)
  on conflict (key, window_start)
  do update
    set count = public.rate_limit_buckets.count + 1
    where public.rate_limit_buckets.count < p_limit
  returning count;
$$;

-- Nobody but the server has any business reading these: a bucket key carries a
-- profile id, and the count tells you how close someone is to a limit.
alter table public.rate_limit_buckets enable row level security;
