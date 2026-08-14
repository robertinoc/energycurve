-- Monthly usage counters, so per-month plan quotas can actually be enforced.
--
-- Until now `PLAN_LIMITS.aiOrderingsPerMonth` was a number nothing read: there
-- was no record of use anywhere, `smart-order` persisted nothing, and "3 per
-- month" was therefore uncountable. Free users had unlimited Claude calls, which
-- is the one unenforced limit that costs real money per use.

create table if not exists public.feature_usage (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  -- A capability key from lib/product/capabilities.ts. Free text rather than an
  -- enum: the registry is the source of truth and adding a capability shouldn't
  -- need a migration.
  capability text not null,
  -- First day of the UTC month this row counts. A date rather than a range keeps
  -- the unique constraint (and therefore the atomic upsert) trivial.
  period_start date not null,
  used integer not null default 0 check (used >= 0),
  updated_at timestamptz not null default timezone('utc', now())
);

-- One row per profile / capability / month. This is what makes the increment in
-- `consume_feature_quota` atomic rather than a read-then-write race.
create unique index if not exists feature_usage_period_key
  on public.feature_usage (profile_id, capability, period_start);

create index if not exists feature_usage_profile_idx
  on public.feature_usage (profile_id);

/*
 * Increments a counter only while it is under the limit, in one statement.
 *
 * Returns the new count, or no row when the limit is already reached. The
 * conditional lives in `on conflict … where` so two concurrent requests can't
 * both read "2 of 3" and both write 3 — Postgres serialises them on the unique
 * index.
 *
 * Unlimited plans never call this: `null` means unlimited in PLAN_LIMITS, and the
 * caller skips the round-trip entirely rather than encoding "no limit" as a
 * sentinel number here.
 */
create or replace function public.consume_feature_quota(
  p_profile_id uuid,
  p_capability text,
  p_period_start date,
  p_limit integer
)
returns integer
language sql
security definer
set search_path = public
as $$
  insert into public.feature_usage (profile_id, capability, period_start, used)
  values (p_profile_id, p_capability, p_period_start, 1)
  on conflict (profile_id, capability, period_start)
  do update
    set used = public.feature_usage.used + 1,
        updated_at = timezone('utc', now())
    where public.feature_usage.used < p_limit
  returning used;
$$;

-- Reads are cheap and don't need the function; writes only ever come from the
-- server (service role) or the function above.
alter table public.feature_usage enable row level security;

drop policy if exists feature_usage_own_rows on public.feature_usage;
create policy feature_usage_own_rows
  on public.feature_usage
  for select
  using (auth.uid() = profile_id);
