-- The spectral measurements a track's own audio produced.
--
-- These already existed — `lib/audio/analyze-features.worker.ts` has been
-- computing RMS, spectral flux, spectral entropy and onset rate for every
-- analysed file since the audio feature shipped. They were shown in the
-- backstage harness and then thrown away: nothing persisted them and nothing
-- consumed them. Energy Model v3 is specified against exactly these numbers, so
-- it had no data pipeline at all — not an unfitted model, an unbuilt one.
--
-- One jsonb column rather than five numeric ones, matching how `anchors` is
-- stored in 0019 and validated in TypeScript on both sides. The reason is that
-- the feature set is the part still under research: the v3 spec names further
-- candidates, and a column per candidate means a migration per experiment.
-- Nothing queries or aggregates these in SQL — the scorer reads a whole track's
-- features at once — so the usual argument for separate columns doesn't apply.
--
-- Null means "never analysed", which is different from "analysed and silent".
-- The energy scorer has to tell those apart to pick the right source, so the
-- column stays nullable and no default is supplied.

alter table public.tracks
  add column if not exists audio_features jsonb;
