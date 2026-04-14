create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  workos_user_id text not null unique,
  email text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  genre text,
  context text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tracks (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  position integer not null check (position > 0),
  artist text not null,
  name text not null,
  bpm numeric(5, 2) check (bpm is null or bpm > 0),
  energy_score numeric(5, 2) check (
    energy_score is null or (energy_score >= 0 and energy_score <= 100)
  ),
  created_at timestamptz not null default timezone('utc', now()),
  unique (playlist_id, position)
);

create index if not exists playlists_user_id_idx on public.playlists (user_id);
create index if not exists tracks_playlist_id_idx on public.tracks (playlist_id);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists playlists_set_updated_at on public.playlists;
create trigger playlists_set_updated_at
before update on public.playlists
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.playlists enable row level security;
alter table public.tracks enable row level security;
