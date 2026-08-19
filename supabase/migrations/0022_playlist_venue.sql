-- Where a set was played, so a resident can avoid repeating themselves there.
--
-- The problem residency mode solves is specific and small: a DJ with a monthly at
-- one club does not want to be told to play what they played there last time, but
-- has no objection to playing it at a different club next week. So the question is
-- never "have I played this" — the library already answers that — it is "have I
-- played this *here*, recently".
--
-- Free text rather than a venues table. A venue here is a label the DJ recognises,
-- not an entity the product needs to know anything about: no address, no capacity,
-- nothing joins to it. A table would buy referential integrity over strings that
-- only ever get compared to each other, and cost a second screen for managing a
-- list nobody asked to manage. If venue-level data ever earns its own features,
-- promoting this column to a foreign key is a smaller migration than unwinding a
-- table that was never used.
--
-- Matching is case- and whitespace-insensitive in the service layer, because "Club
-- X", "club x" and "Club X " are one venue to the person typing them and three to
-- Postgres.
--
-- Null means the DJ didn't say, which is the common case and not a problem: a set
-- with no venue simply takes no part in residency checks.

alter table public.playlists
  add column if not exists venue text;

-- Residency reads "every played set at this venue, newest first", scoped to one
-- user. Without this it's a full scan of the user's playlists on every check.
create index if not exists playlists_user_venue_idx
  on public.playlists (user_id, venue)
  where venue is not null;
