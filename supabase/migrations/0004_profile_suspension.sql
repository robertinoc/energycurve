-- Backstage admin panel: account suspension.
-- A suspended profile keeps its data (playlists, analyses) but cannot use
-- the product: password logins are rejected and existing sessions are
-- redirected out of /dashboard by the dashboard layout guard.
-- NULL = active, timestamp = when the account was suspended.

alter table public.profiles
  add column if not exists suspended_at timestamptz;
