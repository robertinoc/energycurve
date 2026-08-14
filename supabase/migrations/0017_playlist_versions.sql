-- Set version history: the orders a playlist has been in, and what each scored.
--
-- The question this answers is one a DJ asks out loud after a gig: "was the
-- order I imported actually worse than the one I ended up with?" Until now there
-- was no way to know — a reorder overwrote the previous order in place and the
-- old one was gone.
--
-- Snapshots are self-contained rather than a list of track ids. A version has to
-- keep meaning after a track is renamed or deleted, and a foreign key to rows the
-- user is free to remove would either block the delete or silently gut the
-- history.

create table if not exists public.playlist_versions (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  -- 'imported' is the order the set arrived in, captured lazily the first time
  -- anything reorders it. 'played' and 'ai' are accepted now so the follow-up
  -- work (planned vs played) doesn't need a migration to start writing them.
  kind text not null check (kind in ('imported', 'curated', 'ai', 'played')),
  -- [{ trackId, position, artist, name, bpm, energyScore }]
  tracks jsonb not null,
  -- Set score at capture time, or null when the playlist had no genre/context to
  -- score against. Stored rather than recomputed on read: the point of history is
  -- comparing what each order was worth *then*, and the engine keeps improving.
  set_score numeric,
  created_at timestamptz not null default timezone('utc', now())
);

-- Every read is "this playlist's versions, newest first".
create index if not exists playlist_versions_playlist_idx
  on public.playlist_versions (playlist_id, created_at desc);

-- Pruning keeps the most recent N per playlist and never touches the 'imported'
-- row, so this partial index makes finding it free.
create index if not exists playlist_versions_imported_idx
  on public.playlist_versions (playlist_id)
  where kind = 'imported';
