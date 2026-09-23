-- A dev database somebody can actually work against, thirty seconds after
-- creating it.
--
-- Before this, a fresh dev database was empty, so the first thing anyone did was
-- click through signup and import a playlist by hand to have anything on screen
-- at all. That is slow, it is different every time, and it means two people
-- debugging "the curve looks wrong" are looking at two different sets.
--
-- ## What is in here, and why each piece
--
-- Three playlists, because the product's most important distinction is between
-- what it *knows* and what it *estimated*, and one playlist cannot show both:
--
--   1. Fully tagged — BPM, key and energy on every track. The happy path, and
--      the only one where the curve is entirely data.
--   2. No tags at all — no BPM, no key, no energy. This is what the "say what
--      isn't known" rule exists for: the product has to admit the curve is a
--      guess rather than draw a confident line through nothing.
--   3. Half and half. The case that catches code which handles "all present"
--      and "all absent" and falls over on the mixture, which is what a real
--      import from a real library actually looks like.
--
-- ## Not a real person, and not a real set
--
-- The profile is a fabricated WorkOS id and an `@example.com` address, which is
-- reserved by RFC 2606 and can never route anywhere. The tracks are invented:
-- real titles would make this a redistribution of somebody's crate, and the
-- point of the fixture is the shape of the data, not the music.
--
-- ## Safe to run twice
--
-- Fixed UUIDs and `on conflict do nothing`, for the same reason the migrations
-- are idempotent: these get pasted by hand, and someone will paste it twice.
-- Re-running changes nothing and errors on nothing.
--
-- Usage:  psql "$MIGRATION_DB_URL" -f supabase/seed.sql

begin;

-- ---------------------------------------------------------------------------
-- The DJ
-- ---------------------------------------------------------------------------

insert into public.profiles (id, workos_user_id, email, plan, preferred_locale)
values (
  '00000000-0000-4000-a000-000000000001',
  'user_seed_free_00000000000000',
  'seed-free@example.com',
  'free',
  'es'
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 1. Fully tagged — the curve is entirely data
-- ---------------------------------------------------------------------------

insert into public.playlists (id, user_id, name, genre, context, import_source, description)
values (
  '00000000-0000-4000-b000-000000000001',
  '00000000-0000-4000-a000-000000000001',
  'Seed — fully tagged',
  'hard-techno',
  'main',
  'seed',
  'Every track has BPM, key and energy. Nothing here is estimated.'
)
on conflict (id) do nothing;

insert into public.tracks
  (id, playlist_id, position, artist, name, bpm, musical_key, energy_score, duration_seconds)
values
  ('00000000-0000-4000-c000-000000000001', '00000000-0000-4000-b000-000000000001', 1, 'Seed Artist A', 'Opening Statement',  142, '8A',  4, 372),
  ('00000000-0000-4000-c000-000000000002', '00000000-0000-4000-b000-000000000001', 2, 'Seed Artist B', 'Second Wind',        145, '8A',  5, 351),
  ('00000000-0000-4000-c000-000000000003', '00000000-0000-4000-b000-000000000001', 3, 'Seed Artist C', 'The Climb',          147, '9A',  6, 408),
  ('00000000-0000-4000-c000-000000000004', '00000000-0000-4000-b000-000000000001', 4, 'Seed Artist D', 'Peak Hour',          150, '9B',  9, 395),
  ('00000000-0000-4000-c000-000000000005', '00000000-0000-4000-b000-000000000001', 5, 'Seed Artist E', 'Hold The Line',      150, '4B',  8, 367),
  -- A deliberate drop of three points between adjacent tracks: the analysis has
  -- to have something to find, or a seeded database proves only that the page
  -- renders.
  ('00000000-0000-4000-c000-000000000006', '00000000-0000-4000-b000-000000000001', 6, 'Seed Artist F', 'Sudden Exit',        138, '2A',  5, 330),
  ('00000000-0000-4000-c000-000000000007', '00000000-0000-4000-b000-000000000001', 7, 'Seed Artist G', 'Long Way Down',      136, '2A',  4, 412),
  ('00000000-0000-4000-c000-000000000008', '00000000-0000-4000-b000-000000000001', 8, 'Seed Artist H', 'Last Call',          132, '1A',  3, 388)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 2. No tags at all — the product must say so instead of drawing a line
-- ---------------------------------------------------------------------------

insert into public.playlists (id, user_id, name, genre, context, import_source, description)
values (
  '00000000-0000-4000-b000-000000000002',
  '00000000-0000-4000-a000-000000000001',
  'Seed — untagged',
  'techno',
  'opening',
  'seed',
  'No BPM, no key, no energy. The curve here is position, not measurement.'
)
on conflict (id) do nothing;

insert into public.tracks (id, playlist_id, position, artist, name)
values
  ('00000000-0000-4000-c000-000000000101', '00000000-0000-4000-b000-000000000002', 1, 'Seed Artist I', 'Untitled One'),
  ('00000000-0000-4000-c000-000000000102', '00000000-0000-4000-b000-000000000002', 2, 'Seed Artist J', 'Untitled Two'),
  ('00000000-0000-4000-c000-000000000103', '00000000-0000-4000-b000-000000000002', 3, 'Seed Artist K', 'Untitled Three'),
  ('00000000-0000-4000-c000-000000000104', '00000000-0000-4000-b000-000000000002', 4, 'Seed Artist L', 'Untitled Four'),
  ('00000000-0000-4000-c000-000000000105', '00000000-0000-4000-b000-000000000002', 5, 'Seed Artist M', 'Untitled Five')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 3. Mixed — what a real import looks like
-- ---------------------------------------------------------------------------

insert into public.playlists (id, user_id, name, genre, context, import_source, description)
values (
  '00000000-0000-4000-b000-000000000003',
  '00000000-0000-4000-a000-000000000001',
  'Seed — partially tagged',
  'melodic-techno',
  'closing',
  'seed',
  'Some tracks carry tags and some do not, which is what a real library gives you.'
)
on conflict (id) do nothing;

insert into public.tracks
  (id, playlist_id, position, artist, name, bpm, musical_key, energy_score, duration_seconds)
values
  ('00000000-0000-4000-c000-000000000201', '00000000-0000-4000-b000-000000000003', 1, 'Seed Artist N', 'Known Quantity',   124, '5A',  3, 401),
  ('00000000-0000-4000-c000-000000000202', '00000000-0000-4000-b000-000000000003', 2, 'Seed Artist O', 'Half Known',       126, null,  4, 377),
  -- BPM but no key: the harmonic checks have to say "no key on one side"
  -- rather than reach a confident verdict.
  ('00000000-0000-4000-c000-000000000203', '00000000-0000-4000-b000-000000000003', 3, 'Seed Artist P', 'No Key Here',      128, null,  null, 359),
  ('00000000-0000-4000-c000-000000000204', '00000000-0000-4000-b000-000000000003', 4, 'Seed Artist Q', 'Key But No Tempo', null, '12A', 6, 344),
  ('00000000-0000-4000-c000-000000000205', '00000000-0000-4000-b000-000000000003', 5, 'Seed Artist R', 'Nothing Known',    null, null,  null, null),
  ('00000000-0000-4000-c000-000000000206', '00000000-0000-4000-b000-000000000003', 6, 'Seed Artist S', 'Back On The Map',  122, '12A', 5, 390)
on conflict (id) do nothing;

commit;
