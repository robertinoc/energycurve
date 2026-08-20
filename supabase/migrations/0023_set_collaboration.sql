-- Sharing a set with another DJ: read-only, plus suggestions.
--
-- The first slice of B2B/B3B, which was the last PRO+ capability still promised
-- and unbuilt — including on the Stripe product description, where it is a promise
-- made on the screen someone enters a card into.
--
-- Deliberately not simultaneous editing. Two DJs reordering one tracklist at the
-- same time needs conflict resolution, presence, and a merge story, and none of
-- that is the part anybody asked for: the thing a B2B pair actually does the week
-- before is one of them builds a draft and the other says "swap 6 and 7, and that
-- track is too much for 01:00". That is a read-only view and a comment thread, so
-- that is what this is.

-- Who a set is shared with.
--
-- Keyed by EMAIL, not by profile id, and that is the design rather than laziness.
-- An invite to someone who hasn't signed up yet has to be expressible, and keying
-- on email means it starts working the moment they do — no pending state to drain,
-- no claim flow, no second code path that only runs once per user and is therefore
-- the one that's broken. The cost is that changing your account email drops your
-- shared sets, which is a fair trade for deleting an entire flow.
create table if not exists public.set_collaborators (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  -- Lowercased by the service before it gets here; the unique index below depends
  -- on that being done consistently.
  invited_email text not null,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

-- One invite per person per set. Inviting twice is a no-op rather than a second
-- row that would show the same collaborator twice in the owner's list.
create unique index if not exists set_collaborators_unique_idx
  on public.set_collaborators (playlist_id, invited_email);

-- "Which sets are shared with me" — the collaborator's index page, and the access
-- check on every shared read.
create index if not exists set_collaborators_email_idx
  on public.set_collaborators (invited_email);

-- What a collaborator says about a set.
--
-- Free text, optionally anchored to one track. Not a structured "move track 6 to
-- position 9" instruction: the useful comment is usually a reason ("this is too
-- much for 01:00"), and a machine-readable move would imply the app can apply it,
-- which is the simultaneous-editing problem wearing a disguise.
create table if not exists public.set_suggestions (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  -- Null means the comment is about the set as a whole. Nulled rather than deleted
  -- when the track goes, so a suggestion outlives the track it referred to instead
  -- of taking itself with it.
  track_id uuid references public.tracks(id) on delete set null,
  body text not null check (char_length(body) between 1 and 2000),
  -- Set by the OWNER, not the author: it means "I've dealt with this", which is
  -- not the commenter's call to make.
  resolved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

-- Every read is "this set's suggestions, oldest first" — a conversation reads
-- forwards, unlike version history.
create index if not exists set_suggestions_playlist_idx
  on public.set_suggestions (playlist_id, created_at);

-- RLS on with no policies: default-deny for anon and authenticated, matching the
-- posture every other table in this schema uses (decision 22). The service-role
-- client is the only reader, and the service layer's ownership checks are the real
-- boundary.
alter table public.set_collaborators enable row level security;
alter table public.set_suggestions enable row level security;
