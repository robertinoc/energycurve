-- Where a profile came from the first time (lote 20).
--
-- The backstage could only say where users came from by asking PostHog for
-- `$initial_utm_source`, which exists for visitors who accepted analytics and
-- whose PostHog person was merged with their profile — none of the users
-- registered before this. These columns are the product's own record.
--
-- Written once, by services/attribution-service.ts, for a profile created in
-- the last 24 hours that has no touch yet, and only from a browser where the
-- analytics consent is "granted". Everything is re-validated in
-- lib/attribution/first-touch.ts before it gets here; the checks below are the
-- same formats, so a bug there cannot store a URL, a token or an address.
--
-- Deliberately no backfill. `first_touch_recorded_at IS NULL` means unknown —
-- no consent, or registered before this was measured — and the backstage shows
-- unknown as its own category, never as zero or as "direct".

alter table public.profiles
  add column if not exists first_touch_source text,
  add column if not exists first_touch_medium text,
  add column if not exists first_touch_campaign text,
  add column if not exists first_touch_referrer text,
  add column if not exists first_touch_landing text,
  add column if not exists first_touch_at timestamptz,
  add column if not exists first_touch_recorded_at timestamptz;

alter table public.profiles
  drop constraint if exists profiles_first_touch_format_check;

alter table public.profiles
  add constraint profiles_first_touch_format_check
  check (
    (first_touch_source is null or first_touch_source ~ '^[a-z0-9-]{1,32}$')
    and (first_touch_medium is null or first_touch_medium ~ '^[a-z0-9-]{1,32}$')
    and (
      first_touch_campaign is null
      or (char_length(first_touch_campaign) <= 64
          and first_touch_campaign ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
    )
    and (
      first_touch_referrer is null
      or (char_length(first_touch_referrer) <= 100
          and first_touch_referrer ~ '^[a-z0-9.-]+$')
    )
    and (
      first_touch_landing is null
      or (char_length(first_touch_landing) <= 160
          and first_touch_landing ~ '^/[a-z0-9/\[\]-]*$')
    )
  );
