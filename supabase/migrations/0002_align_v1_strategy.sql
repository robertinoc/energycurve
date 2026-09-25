do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'playlist_context'
  ) then
    create type public.playlist_context as enum ('opening', 'main', 'closing');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'playlist_genre'
  ) then
    create type public.playlist_genre as enum (
      'house',
      'techno',
      'hard-techno',
      'melodic-techno',
      'progressive'
    );
  end if;
end
$$;

-- Guarded on the column still being text.
--
-- Re-running this after it had already succeeded errored with
-- `function pg_catalog.btrim(playlist_context) does not exist`: once the
-- column is the enum, `trim()` has no overload for it. Migrations here are
-- pasted by hand, with no record of what has been applied, so somebody
-- eventually re-runs one to find out — and the one that punishes them for
-- checking is the worst one to leave sharp.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'playlists'
      and column_name = 'context'
      and udt_name <> 'playlist_context'
  ) then
    alter table public.playlists
      alter column context type public.playlist_context
      using (
        case
          when context is null then null
          when lower(trim(context)) in ('opening', 'main', 'closing')
            then lower(trim(context))::public.playlist_context
          else null
        end
      );
  end if;
end
$$;

-- Guarded on the column still being text.
--
-- Re-running this after it had already succeeded errored with
-- `function pg_catalog.btrim(playlist_genre) does not exist`: once the
-- column is the enum, `trim()` has no overload for it. Migrations here are
-- pasted by hand, with no record of what has been applied, so somebody
-- eventually re-runs one to find out — and the one that punishes them for
-- checking is the worst one to leave sharp.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'playlists'
      and column_name = 'genre'
      and udt_name <> 'playlist_genre'
  ) then
    alter table public.playlists
      alter column genre type public.playlist_genre
      using (
        case
          when genre is null then null
          when lower(trim(genre)) in (
            'house',
            'techno',
            'hard-techno',
            'melodic-techno',
            'progressive'
          ) then lower(trim(genre))::public.playlist_genre
          else null
        end
      );
  end if;
end
$$;

alter table public.tracks
  drop constraint if exists tracks_energy_score_check;

-- Guarded on the column not already being numeric(3,1).
--
-- Less dramatic than the two above — re-running would not error — but the
-- `using` clause is not idempotent in spirit: it rescales anything above 10,
-- and a second pass over already-converted data is a silent edit of somebody's
-- energy tags rather than a loud failure.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tracks'
      and column_name = 'energy_score'
      and (numeric_precision is distinct from 3 or numeric_scale is distinct from 1)
  ) then
    alter table public.tracks
      alter column energy_score type numeric(3, 1)
      using (
        case
          when energy_score is null then null
          when energy_score > 10 then round((energy_score / 10.0)::numeric, 1)
          else round(energy_score::numeric, 1)
        end
      );
  end if;
end
$$;

alter table public.tracks
  add constraint tracks_energy_score_check
  check (
    energy_score is null or (
      energy_score >= 1 and energy_score <= 10
    )
  );
