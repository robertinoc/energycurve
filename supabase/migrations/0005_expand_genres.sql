-- Expand the playlist_genre enum with more electronic/DJ genres.
-- ALTER TYPE ... ADD VALUE is idempotent-safe via IF NOT EXISTS and must run
-- outside a transaction block for each value; the Supabase SQL editor runs
-- these fine one after another.

alter type public.playlist_genre add value if not exists 'deep-house';
alter type public.playlist_genre add value if not exists 'organic-house';
alter type public.playlist_genre add value if not exists 'disco-house';
alter type public.playlist_genre add value if not exists 'tech-house';
alter type public.playlist_genre add value if not exists 'trance';
alter type public.playlist_genre add value if not exists 'psy-trance';
alter type public.playlist_genre add value if not exists 'bounce';
