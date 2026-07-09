-- Export support.
--
-- Remember how each playlist was imported so exports can default to the same
-- format (Rekordbox export -> .xml, Traktor export -> .nml), and keep every
-- track's original file reference so native exports relink to the DJ's library
-- when re-imported. Both nullable and backward-compatible: manual playlists and
-- pre-existing imports simply carry NULL and fall back to CSV/TXT exports.

alter table public.playlists
  add column if not exists import_source text;

alter table public.tracks
  add column if not exists source_uri text;
