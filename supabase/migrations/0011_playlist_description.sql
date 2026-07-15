-- Optional free-text description on playlists (V3 feedback: editable name +
-- description from the detail page). Nullable and backward-compatible.
alter table public.playlists
  add column if not exists description text;
