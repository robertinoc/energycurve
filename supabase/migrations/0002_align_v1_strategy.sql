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

alter table public.tracks
  drop constraint if exists tracks_energy_score_check;

alter table public.tracks
  alter column energy_score type numeric(3, 1)
  using (
    case
      when energy_score is null then null
      when energy_score > 10 then round((energy_score / 10.0)::numeric, 1)
      else round(energy_score::numeric, 1)
    end
  );

alter table public.tracks
  add constraint tracks_energy_score_check
  check (
    energy_score is null or (
      energy_score >= 1 and energy_score <= 10
    )
  );
