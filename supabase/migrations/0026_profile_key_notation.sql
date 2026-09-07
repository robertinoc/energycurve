-- Which key notation to show this DJ.
--
-- Asked for by an alpha user: "Opción de selección de Modelo de Key (CAMELOT,
-- Open Key, Musical) o conversor interno". The conversion existed but ran one
-- way only — every notation was read and Camelot was displayed — so someone who
-- reads Open Key (what Traktor shows) was translating every row in their head.
--
-- A display preference, so it belongs to the person and not to a playlist: a DJ
-- reads keys the way they read keys, whichever set is open. Nullable with the
-- code defaulting to 'camelot': an existing user sees exactly what they saw
-- before this shipped, and no backfill is needed.
--
-- Values: 'camelot' | 'open_key' | 'musical' | 'as_imported'. Kept as text
-- rather than an enum because adding a notation should not need a migration,
-- and the reader validates against the known set anyway (isKeyNotation).

alter table public.profiles
  add column if not exists key_notation text;
