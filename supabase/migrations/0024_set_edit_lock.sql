-- Turn-based editing on a shared set: one writer at a time, passed by hand.
--
-- The alternative was real-time co-editing — presence, a CRDT or OT, and a merge
-- story for two people moving the same track in the same second. Weeks of work,
-- and the bugs are the kind that reproduce once a month. What a B2B pair actually
-- does the week before is pass a draft back and forth, which needs none of it:
-- with a single writer there is no conflict to resolve, so there is no conflict
-- resolution to get wrong.
--
-- Two columns on the playlist rather than a locks table. A lock is a property of
-- the set, exactly one exists at a time, and it is deleted by being cleared — all
-- three of which a row in a separate table would model worse.

alter table public.playlists
  -- Who holds the pen. Null means nobody, which is the state every set starts and
  -- ends in. ON DELETE SET NULL rather than CASCADE: if the holder's account is
  -- removed, the lock should evaporate and leave the set editable by its owner —
  -- not take the playlist with it.
  add column if not exists edit_lock_holder uuid references public.profiles(id) on delete set null,
  -- When they took it. The expiry is computed from this rather than stored as a
  -- deadline, so changing how long a turn lasts is a code change and not a
  -- migration plus a backfill of rows that already have the old one baked in.
  add column if not exists edit_lock_taken_at timestamptz;

-- Reads are always "does this set have a live lock", scoped to the one row, so no
-- index is needed. Stated so nobody adds one looking for a problem that isn't here.
