-- Round-trip preservation of the library entry a track came from.
--
-- The bug this closes was reported by an alpha user and then confirmed against
-- his own Traktor 3.5.1 collection: reordering a Traktor playlist through
-- EnergyCurve and importing the result back cost him hotcues, comments, album
-- and label tags, and forced a re-analysis of the tracks.
--
-- Cause: the NML writer rebuilt each <COLLECTION><ENTRY> from the eleven fields
-- we happen to model. A real 3.5.1 entry carries around twenty-five, including
-- <CUE_V2> (hotcues), <LOOPINFO>, AUDIO_ID and INFO@FLAGS (the analysis
-- fingerprint), <LOUDNESS>, <ALBUM>, LOCATION@VOLUMEID, PLAYCOUNT and
-- LAST_PLAYED. Everything unmodelled was dropped on the way out. Measured on
-- the 26 tracks that entered his collection through us: 0% had an <ALBUM>
-- against a 73% collection-wide baseline, 0% an IMPORT_DATE against 96%, 0% a
-- COMMENT against 40%.
--
-- Modelling the remaining fourteen fields would only move the line: the next
-- Traktor version adds one and we silently drop that instead. So we keep the
-- source <ENTRY> verbatim and re-emit it byte-for-byte, which is correct for
-- every field that exists now and every field that will.
--
-- Stored per track rather than as one blob per playlist because a track can be
-- deleted, reordered or moved between sets, and its entry has to follow it. Text
-- rather than jsonb: this is XML, and the whole point is that it is not parsed
-- and re-serialised. ~1-4 KB per track against a 500-track import cap, so ≤2 MB
-- per playlist worst case, and TOAST compresses XML well.

alter table public.tracks
  -- The verbatim <ENTRY>…</ENTRY> (Traktor) or <TRACK …/> (Rekordbox) element
  -- this track was imported from. Null for manual, text-paste, m3u8 and
  -- audio-file imports — none of which have a library entry to preserve.
  add column if not exists source_payload text,
  -- Which dialect the payload is, so the exporter never emits a Rekordbox
  -- <TRACK> into an NML. 'traktor_nml' | 'rekordbox_xml'.
  add column if not exists source_payload_format text,
  -- Which tag the energy value was read from: 'energy_frame' | 'comment' |
  -- 'comment2' | 'grouping' | 'lyrics' | 'producer' | 'composer' | 'label'.
  --
  -- Stored so the product can say where a number came from instead of
  -- presenting it as if it had no provenance. The same user who reported the
  -- NML bug asked which tag we read; a DJ who has just been told "we read your
  -- grouping field" needs to be able to confirm that we actually did.
  add column if not exists energy_source text;

alter table public.playlists
  -- The source file's root/header elements — NML VERSION and <HEAD>, or the
  -- Rekordbox DJ_PLAYLISTS Version and <PRODUCT>. Preserved so a file exported
  -- by a newer Traktor is not handed back declaring VERSION="19", which is what
  -- our hardcoded header did regardless of what came in.
  add column if not exists source_header jsonb;
