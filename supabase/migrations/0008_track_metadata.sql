-- Track metadata for the DJ-familiar tracklist.
--
-- Persist the per-track fields DJ software carries and we already parse (or now
-- parse) on import, so the Rekordbox-style table can show a Key / Genre /
-- Comment / Time column and native exports can round-trip them. All nullable and
-- backward-compatible: manual tracks and pre-existing imports simply carry NULL.

alter table public.tracks
  add column if not exists musical_key text;

alter table public.tracks
  add column if not exists genre text;

alter table public.tracks
  add column if not exists comment text;

alter table public.tracks
  add column if not exists duration_seconds integer;
