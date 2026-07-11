-- Perceived loudness as an energy signal (Engine V4, B19).
--
-- Traktor exports carry PERCEIVED_DB per track. Within a set, louder tracks
-- read as higher energy — the signal that differentiates the curve when BPMs
-- are homogeneous (the low-confidence case of B13). Nullable and
-- backward-compatible: manual tracks and older imports simply carry NULL and
-- keep the plain BPM-derived energy.

alter table public.tracks
  add column if not exists perceived_db numeric;
