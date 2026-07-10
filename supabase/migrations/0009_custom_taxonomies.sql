-- Custom contexts & genres ("behaves like" model).
--
-- DJs play rooms our three contexts don't name (sunset, after, bar sets) and
-- genres outside the supported twelve (folktronica). A custom entry is a
-- user-owned LABEL mapped to a base context/genre: the playlist keeps storing
-- the base enum in playlists.context / playlists.genre — the scoring engine
-- is untouched and keeps using the frozen curves of the base — while the UI
-- shows the user's own name everywhere via the custom_*_id link.

create table if not exists public.user_contexts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  behaves_like public.playlist_context not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.user_genres (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  behaves_like public.playlist_genre not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists user_contexts_user_id_idx on public.user_contexts (user_id);
create index if not exists user_genres_user_id_idx on public.user_genres (user_id);

-- Same posture as every other table (decision 22): RLS on with no policies —
-- default-deny for the anon key; the app goes through the service role with
-- ownership checks in the service layer.
alter table public.user_contexts enable row level security;
alter table public.user_genres enable row level security;

-- Display-only overlay links. Nullable and backward-compatible: existing
-- playlists carry NULL and keep rendering their base labels. If a custom
-- entry is deleted, the playlist falls back to the base label (set null).
alter table public.playlists
  add column if not exists custom_context_id uuid references public.user_contexts (id) on delete set null;

alter table public.playlists
  add column if not exists custom_genre_id uuid references public.user_genres (id) on delete set null;
