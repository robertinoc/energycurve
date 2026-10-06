-- Backstage user intelligence: where a profile last was, and when.
--
-- `last_seen_at` replaces the updated_at proxy for "last seen" — updated_at
-- also bumps on Stripe webhook writes to the plan columns, so it lies about
-- presence. `last_seen_country` is the two-letter code from the Vercel edge
-- header, recorded on dashboard visits (StageLink's last_seen_country
-- pattern). Deliberately no backfill: what was never observed stays NULL,
-- and the backstage read-side fills the gap from PostHog geoip where it can.

alter table public.profiles
  add column if not exists last_seen_at timestamptz,
  add column if not exists last_seen_country varchar(2);
