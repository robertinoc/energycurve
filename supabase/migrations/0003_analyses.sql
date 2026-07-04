-- Analysis history: one row per distinct analysis of a playlist.
-- Powers the "playlists analyzed" adoption KPI and future score history.
-- Rows are deduped in the service layer via input_hash (same tracklist +
-- genre + context => no new row), so the table reflects real analysis
-- events rather than page views.

create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  genre public.playlist_genre not null,
  context public.playlist_context not null,
  set_score numeric(3, 1) not null,
  curve jsonb not null,
  issues jsonb not null,
  breakdown jsonb not null,
  suggested_order jsonb,
  suggested_score numeric(3, 1),
  input_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists analyses_playlist_id_idx
  on public.analyses (playlist_id, created_at desc);

create index if not exists analyses_user_id_idx
  on public.analyses (user_id, created_at desc);

-- Default-deny like the rest of the schema: no policies on purpose, all
-- access goes through the server-side service role (see decision 22).
alter table public.analyses enable row level security;
