-- The time slot a set is played in, so the energy curve can be read against the
-- clock instead of only against track positions.
--
-- The failure this makes visible: a warm-up DJ can build a technically excellent
-- arc and still burn the floor at 01:20 when the headliner goes on at 03:00. The
-- shape was right, the timing wasn't, and the engine couldn't see it because it
-- only knew "track 14 of 24".
--
-- Stored as **minutes from midnight**, not timestamps. A slot is venue wall-clock
-- ("I play 01:00 to 03:00"); a timestamptz would invent a timezone the DJ never
-- supplied and break the moment they play in another city. Sets that cross
-- midnight fall out naturally: end < start means it wraps.

alter table public.playlists
  add column if not exists slot_start_minutes smallint,
  add column if not exists slot_end_minutes smallint;

alter table public.playlists
  drop constraint if exists playlists_slot_start_minutes_check;

alter table public.playlists
  add constraint playlists_slot_start_minutes_check
  check (slot_start_minutes is null
         or (slot_start_minutes >= 0 and slot_start_minutes < 1440));

alter table public.playlists
  drop constraint if exists playlists_slot_end_minutes_check;

alter table public.playlists
  add constraint playlists_slot_end_minutes_check
  check (slot_end_minutes is null
         or (slot_end_minutes >= 0 and slot_end_minutes < 1440));

-- Both or neither. One half of a slot says nothing, and letting it persist would
-- push "is this usable?" into every read site instead of settling it once here.
alter table public.playlists
  drop constraint if exists playlists_slot_complete_check;

alter table public.playlists
  add constraint playlists_slot_complete_check
  check ((slot_start_minutes is null) = (slot_end_minutes is null));

-- A zero-length slot is a half-filled form, not a 24-hour set.
alter table public.playlists
  drop constraint if exists playlists_slot_not_empty_check;

alter table public.playlists
  add constraint playlists_slot_not_empty_check
  check (slot_start_minutes is null or slot_start_minutes <> slot_end_minutes);
