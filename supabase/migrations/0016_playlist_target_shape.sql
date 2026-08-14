-- The named target-curve shape a set is aiming at.
--
-- Until now the target curve was derived from context + genre and the DJ never
-- saw it. That works for the three ordinary cases and fails for the ones a
-- booking actually throws at you: an after-hours set whose craft is a long
-- hypnotic plateau, or a closing set that is supposed to come down rather than
-- end on its peak. Both score badly against a target that assumes every set
-- climbs.
--
-- NULL keeps the derived behaviour, so every existing set scores exactly as it
-- did before this column existed.

alter table public.playlists
  add column if not exists target_shape text;

-- Enumerated in the database as well as in TypeScript. The engine indexes into a
-- fixed anchor table by this value, so a typo arriving from anywhere would
-- silently produce an undefined target rather than an error.
alter table public.playlists
  drop constraint if exists playlists_target_shape_check;

alter table public.playlists
  add constraint playlists_target_shape_check
  check (
    target_shape is null
    or target_shape in ('warm_up', 'peak_time', 'after_hours', 'journey', 'landing')
  );
