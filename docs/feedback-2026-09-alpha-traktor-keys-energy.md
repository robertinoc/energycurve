# Alpha feedback — Traktor NML data loss, M3U8 coverage, key notation, energy tags

> **Status: implemented 2026-09-07.** All four items shipped. What changed, and
> what still needs a human, is at the bottom under *Shipped*.

Source: e-mail feedback from an alpha user (Traktor DJ, uses **Lexicon DJ** for
energy, not Mixed In Key), September 2026. Four items, one of them a data-loss
bug in a live product.

> "cuando entrega lista reorganizada, esta al abrirla en traktor elimina todos
> los tags que tenían las canciones, también eliminó los hotcues y tuve que
> analizarlas como si fueran nuevas."

Verbatim asks, in his order:

1. Key-notation selector (Camelot / Open Key / musical) or an internal converter.
2. **NML export wipes tags and hotcues** in Traktor; ~1 track per 20–30 set.
3. M3U8 import read "not a single tag, not even the duration".
4. Energy: not everyone uses Mixed In Key (he uses Lexicon DJ) — document
   *which* tag and *which* exact string we read.

Plan gating: every item below is **FREE tier**. Native export is free forever
(AGENTS.md), key notation is a display preference, and energy parsing is
ingestion. No `lib/product/capabilities.ts` entries needed.

---

## P0 — Traktor NML export destroys collection metadata

### Root cause

`toTraktor()` (`lib/playlists/export.ts`) rebuilds every
`<COLLECTION><ENTRY>` from scratch and emits only `TITLE`, `ARTIST`, `INFO
@GENRE/@COMMENT/@KEY/@PLAYTIME`, `<MUSICAL_KEY>` and `<TEMPO>`.

Traktor merges an imported NML into its collection **by LOCATION**, so every
element we do not emit is dropped from the existing entry:

- `<CUE_V2>` — hotcues *and* saved loops → his lost hotcues
- `<TEMPO>` gridmarkers / `<LOUDNESS>` / `PERCEIVED_DB` → "had to analyse them
  as if new"
- `INFO @RANKING` (rating), `@COMMENT2` (Traktor's second comment / grouping),
  `@LABEL`, `@REMIXER`, `@PRODUCER`, `@ALBUM`, `@CATALOG_NO`,
  `@RELEASE_DATE`, `@COLOR`, `@PLAYCOUNT`, `@IMPORT_DATE`, `@LOCK`,
  `@MODIFIED_DATE`, `<STEMS>` → his lost tags

Second, independent failure: when a source `LOCATION` cannot be recovered
exactly (no location in the source entry, or a `VOLUMEID` we drop),
`canonicalTraktorKey()` synthesises `EnergyCurve/:…`. That key matches nothing
in the collection, so Traktor creates a **brand-new entry** — which is why it
hits roughly one track in a 20–30 track set rather than all of them.

### Measured on a real Traktor 3.5.1 collection (2026-09-07)

Verified against a local `collection.nml` (Traktor Pro **3.5.1**, `NML
VERSION="19"` — the version we already emit), 3017 entries across 3 volumes.
That collection **already contains a playlist imported from EnergyCurve**, so
the damage is directly measurable rather than inferred.

Field coverage, whole collection vs. the 26 tracks that entered the collection
through our NML:

| field | collection (3017) | via EnergyCurve (26) |
|---|---|---|
| `<ALBUM>` | 73.2% | **0%** |
| `INFO @IMPORT_DATE` | 96.4% | **0%** |
| `INFO @COMMENT` | 40.2% | **0%** |
| `INFO @LABEL` | 27.1% | **0%** |
| `INFO @COVERARTID` | 70.4% | **7.7%** |
| `INFO @KEY` | 53.6% | **100%** ← our fingerprint |
| `<CUE_V2>` | 96.9% | 100% |
| `ENTRY @AUDIO_ID` | 97.5% | 100% |

0-of-26 against a 73%/96%/40%/27% baseline is not sampling noise, and the
100% `INFO @KEY` (against 54%) identifies the writer: we always emit a key.
Hotcues and `AUDIO_ID` are at 100% because he re-analysed the tracks
afterwards — which is the "tuve que analizarlas como si fueran nuevas" he
reported, and analysis restores exactly those two while restoring none of the
five that are at zero.

**Not yet distinguished**: whether Traktor overwrote the existing entries or
created fresh ones that shadow them. `IMPORT_DATE` at 0/26 points to
*created* (Traktor stamps it on a normal import; an NML-born entry inherits
only what the NML carries), and the likeliest reason a match fails is the
**`LOCATION @VOLUMEID`** we drop — present on 3023/3023 real locations, and his
collection spans three volumes (2681 `Macintosh HD`, 173 `macintosh`, 169
`ROBERT HD2`), which is the shape that produces "once per 20–30 tracks".
Both mechanisms are fixed by the same change, so this does not block the work
— it only decides what the verification has to prove.

The `VOLUME`/`DIR`/`FILE` split itself is fine: `splitTraktorLocation()`
round-trips **3023/3023** real locations exactly, so the path logic is not the
bug.

### What a real entry carries, and what we emit

Of ~25 fields a real 3.5.1 entry carries, our writer emits 11 and drops the
rest. Dropped, with real-world frequency in that collection:

- `<CUE_V2>` × 3410 (hotcues) and `<LOOPINFO>` × 368 (saved loops)
- `ENTRY @AUDIO_ID` (2942) + `INFO @FLAGS` (2941) — the analysis fingerprint
  and flags; dropping them is what forces re-analysis
- `LOCATION @VOLUMEID` (3017) — the suspected match failure above
- `<LOUDNESS>` PEAK_DB / PERCEIVED_DB / ANALYZED_DB (2942)
- `<MODIFICATION_INFO>` (3017), `ENTRY @MODIFIED_DATE`/`@MODIFIED_TIME` (3003),
  `@LOCK`/`@LOCK_MODIFICATION_TIME` (388)
- `<ALBUM>` TITLE/TRACK/OF_TRACKS (2208), `INFO @COVERARTID` (2124)
- `INFO @PLAYCOUNT` + `@LAST_PLAYED` (1675), `@RELEASE_DATE` (1127),
  `@LABEL` (817), `@IMPORT_DATE` (2908), `@BITRATE` (2977), `@FILESIZE` (2841),
  `@PLAYTIME_FLOAT` (1743), `@PRODUCER` (32), `@KEY_LYRICS` (78)
- `TEMPO @BPM_QUALITY` (2961)

Note `INFO @PRODUCER` and `INFO @KEY_LYRICS` are real NML fields — the exact
two the feedback author guessed at for energy ("comment o Lyrics o
Producer…"). They feed straight into P3.

Because he uploads a **Traktor playlist export**, every one of these fields is
already present in the file he hands us. Preserving the raw `<ENTRY>` is
therefore sufficient — no new data source is needed.

### Fix, layer 1 — round-trip preservation (the actual fix)

Keep each source `<ENTRY>` verbatim at import and re-emit it byte-for-byte on
export. Only the `<PLAYLIST>` node's order changes.

- Migration `0025_track_source_payload.sql`:
  `tracks.source_payload text`, `tracks.source_payload_format text`
  (`traktor_nml` | `rekordbox_xml`). ~1–4 KB/track; 500-track cap → ≤2 MB,
  TOAST-compressed.
- `lib/playlists/parse-traktor.ts`: capture the raw `<ENTRY>…</ENTRY>` slice
  with a small tolerant scanner over the source string, keyed by the LOCATION
  key. Deliberately **not** re-serialising via `XMLBuilder` — a byte slice
  cannot silently normalise an attribute we never modelled.
- Preserve the source `NML VERSION` and `<HEAD>` on the playlist so a Traktor 4
  file is not downgraded to `VERSION="19"` on the way out.
- `lib/playlists/export.ts`: `toTraktor()` emits the preserved entry when
  present; the synthesised entry survives only as the fallback for tracks that
  never came from an NML (manual adds, `files` imports).
- Same mechanism for Rekordbox XML: `<POSITION_MARK>` (memory cues / hotcues),
  `Rating`, `Colour`, `PlayCount`, `<TEMPO>` grid. Same migration, same shape.

### Fix, layer 2 — a safe-by-default export mode

Export-menu choice: **"Playlist only (doesn't touch my collection)"** vs
"Playlist + track metadata". Playlist-only emits `<COLLECTION ENTRIES="0"/>`
plus the `PLAYLISTS` node keyed by the exact preserved LOCATION — nothing can
be overwritten because there is nothing to merge.

**Needs verification on real Traktor before it can be the default**: a
collection-less NML may import as an empty playlist. Verify on Traktor 3 and 4
against a *copy* of a collection. If it does not resolve, layer 1 stands as the
fix and this stays opt-in/experimental.

### Fix, layer 3 — stop inventing tags

`trackComment()` writes a synthesised `Energy N` into `COMMENT` whenever the
source comment is empty, and we always emit `<MUSICAL_KEY>` even when the
source entry had none. Both write into the DJ's library. Make both opt-in
("write energy back into the comment tag"), off by default.

### Tests (`tests/export.test.ts`)

- A fixture entry carrying `CUE_V2`, `RANKING`, `LOUDNESS`, `COMMENT2` and
  `MODIFIED_DATE` round-trips byte-identically through import → reorder →
  export.
- Reordering changes only the `<PLAYLIST>` node.
- Every `PRIMARYKEY` equals the preserved `VOLUME+DIR+FILE` concatenation.
- No synthesised entry is emitted for a track that has a preserved payload.

---

## P1 — M3U8 import reads nothing

Extended M3U carries only a path and an `#EXTINF` duration/label. A plain M3U
with no `#EXTINF` lines at all — very likely what he uploaded — yields no
duration and a filename-derived artist/title. The product currently says
nothing about this, which is the real defect.

1. **Parser robustness** (`lib/playlists/parse-m3u8.ts`): tolerate
   `#EXTINF:250 , Artist - Title` (space before the comma), a missing comma,
   attribute-carrying `#EXTINF:250 tvg-id="x",Label`, and read the metadata
   directives other tools write — `#EXTGRP`, `#EXTALB`, `#EXTART`, VirtualDJ's
   `#EXTVDJ`.
2. **Honest coverage diagnostics.** `ParsedImport` gains a `coverage` summary
   (entries, and how many carried duration / BPM / key / genre / energy),
   rendered as an import-summary panel: *"24 entries · 0 durations · 0 BPM or
   key. M3U8 only carries file paths — here is how to get the rest."*
3. **Enrichment path.** After an M3U8 import, offer "match the audio files".
   `lib/playlists/audio-match.ts` already exists and audio tags are already
   parsed client-side; for M3U8 we can match on the **path** in `source_uri`
   (exact, unique) instead of the title, which is far stronger than what the
   matcher does today. This turns an M3U8 import into a fully tagged playlist
   with no new server dependency.
4. **Set expectations before the upload.** The "what we read" list in
   `components/playlists/playlist-import-upload.tsx` becomes per-format:
   NML/XML → BPM, key, genre, energy, duration; M3U8 → paths and duration only.

---

## P2 — Key-notation preference + internal converter

`lib/music/camelot.ts` converts *into* Camelot only, and the track table shows
a raw "Key" column beside a Camelot column.

- Add `camelotToOpenKey`, `camelotToMusical` (sharp/flat preference),
  `detectKeyNotation(value)` and `formatKey(value, notation)` — pure functions,
  tested in `tests/camelot.test.ts` over the full 24-key matrix in all three
  notations with round-trips asserted.
- Migration `0026_profile_key_notation.sql`: `profiles.key_notation text`
  default `'camelot'`, values `camelot | open_key | musical | as_imported`.
  Getter/setter in `services/profile-service.ts`, mirroring `preferred_locale`.
  Control on the dashboard settings page.
- Thread through `components/playlists/track-table.tsx` (one Key column in the
  chosen notation, raw value in the `title` attribute, **sorted by wheel
  position** rather than by string), the analysis workbench, and export.
  Export honours the notation only where we synthesise an entry — preserved
  entries stay untouched (see P0).

---

## P3 — Energy: stop assuming Mixed In Key

### Two bugs

**a. The pattern is too narrow.** `extractEnergyFromComment()`
(`lib/playlists/imported-track.ts`) matches only `Energy <n>`. His own
examples — `01 Energy`, `1 Energy`, `1.0 Energy` — all fail because the number
comes first. So do `Energy: 7`, `E7`, `Energy 7/10`, `EnergyLevel 7`.

Rewrite as an ordered pattern list: number-after-word, number-before-word,
colon form, `E7` form; accept zero-padding and decimals (round); clamp 1–10.
A bare number is accepted **only** when the field contains nothing else, so
"1st press" cannot become energy 1 — an explicit, documented rule rather than a
heuristic.

**b. We only look in one field.** Extend to the fields Lexicon DJ, Serato and
Rekordbox actually write:

- audio files (`lib/playlists/parse-audio-tags.ts`): `common.grouping`,
  `common.composer`, `common.lyrics`, plus native `TXXX:ENERGY` /
  `TXXX:ENERGYLEVEL` frames and the Vorbis `ENERGY` field — read
  `metadata.native` explicitly instead of hoping `common` surfaces it.
- Traktor NML: `INFO @COMMENT`, then `@KEY_LYRICS` and `@PRODUCER` (both real
  3.5.1 fields, and the two he guessed at), then `@COMMENT2` / `@LABEL`.
- Rekordbox XML: `Comments`, then `Grouping` / `Composer`.
- Precedence: explicit `Energy N` token > `TXXX:ENERGY` > bare number in a
  dedicated field.

### Surface where it came from

`ImportedTrack.energySource: 'comment' | 'grouping' | 'txxx' | 'lyrics' |
'audio' | 'manual' | null`, shown in the track-table tooltip and in the import
summary ("energy read for 18 of 24 tracks, from the comment tag"). Consistent
with the "say what isn't known" rule in AGENTS.md.

### The documentation he actually asked for

- A bilingual `/docs/energy-tags` help page: tool → field → exact accepted
  string, with copy-pasteable setup for **Lexicon DJ**, Mixed In Key, Rekordbox
  My Tag and Serato. Linked from the import screen and the export menu.
- `docs/energy-tag-formats.md` internally as the spec the parser is tested
  against.
- `tests/energy-tag-parse.test.ts`: table-driven over every accepted string and
  every deliberately rejected one.

---

## Sequencing

1. **P0 layers 1 + 3** with tests, shipped alone. Data loss in a live product.
2. **P3** (energy parsing + docs page) — cheap, and it answers his question
   directly.
3. **P1** parser robustness + coverage diagnostics + expectation copy; the
   audio-match enrichment after.
4. **P2** key notation. Largest UI surface, zero data risk.
5. Reply to him with what shipped, and offer him the Traktor re-test.

## Cannot be verified from tests alone

P0 needs a controlled import on real Traktor — available locally (Traktor Pro
3.5.1). Protocol:

1. Back up `~/Documents/Native Instruments/Traktor 3.5.1/collection.nml`.
2. Record a per-field fingerprint of the target tracks (the same table above,
   scripted) **before** the import.
3. Export the reordered playlist from EnergyCurve with the fix, import it into
   Traktor, quit Traktor so the collection is flushed.
4. Re-fingerprint and diff. Pass = zero field deltas on every target track,
   and `<COLLECTION ENTRIES>` unchanged (no new entries created).

Step 4's diff is what distinguishes "overwrote" from "created a shadow entry",
which the analysis above could not settle. Run it once against the current
build to capture the bug, then again against the fix.

Worth also asking the feedback author to re-run his own 20–30 track case — he
sits on a multi-volume library, which is where the match is most likely to
fail.


---

## Shipped (2026-09-07)

### P0 — NML/XML round-trip preservation

- `lib/playlists/source-entry.ts` (new) — byte-slice scanner that captures each
  source `<ENTRY>` / `<TRACK>` verbatim, scoped to the document's
  `<COLLECTION>` so a playlist node's reference entries are never mistaken for
  library entries. Quote-aware start-tag scanning (XML allows a raw `>` inside
  an attribute value, and an `indexOf(">")` would cut an entry in half).
  Payloads pair to parsed tracks **by document order**, and preservation turns
  itself off entirely if the two walks disagree on the count — attaching one
  track's hotcues to another is worse than attaching none.
- `parse-traktor.ts` / `parse-rekordbox.ts` — capture the payload and the
  source header (root attributes + the elements before the collection).
- `export.ts` — `toTraktor` / `toRekordbox` re-emit the preserved entry and
  change only the playlist node's order. Collection entries are deduplicated
  (a track played twice is two references to one entry). Rekordbox keeps each
  preserved `TrackID` so its `<POSITION_MARK>` cues stay attached; synthesised
  entries get ids above every preserved one. The header is taken from the
  source file, so a file from another Traktor version is no longer handed back
  declaring `VERSION="19"`.
- **Stopped inventing tags**: `trackComment` no longer synthesises `Energy N`
  into an empty comment, and `<MUSICAL_KEY>` is no longer added to an entry
  that had none. Writing energy back is opt-in per export
  (`writeEnergyToComment`), merges into the existing comment, and updates an
  existing token in place rather than stacking.
- `playlistOnly` (a collection-less NML) is implemented and tested but **not
  exposed in the UI** — an empty collection may resolve as an empty playlist in
  some Traktor versions, and that has to be verified on a real install before
  it is offered to someone mid-gig. Layer 1 is the fix; this is a later
  hardening.
- Migration `0025_source_payload.sql`: `tracks.source_payload`,
  `tracks.source_payload_format`, `tracks.energy_source`,
  `playlists.source_header`.
- Export menu says what it now guarantees, and carries the energy opt-in.

**Verified end to end against the real 3017-entry Traktor 3.5.1 collection**
(the 37-track `04 MICELIO HARD` playlist, rebuilt as a Traktor playlist export,
run through parse → reorder → export):

```
source entries: 37   payloads captured: 37
entries NOT byte-identical in export: 0
playlist refs: 37    unresolved refs: 0
<CUE_V2> elements: 52 -> 52
CUE_V2 37/37 · AUDIO_ID 37/37 · VOLUMEID 37/37 · LOUDNESS 37/37 · ALBUM 11/11
FLAGS 37/37 · IMPORT_DATE 15/15 · COMMENT 14/14 · LABEL 2/2 · PLAYCOUNT 31/31
COVERARTID 6/6 · BPM_QUALITY 37/37 · MODIFICATION_INFO 37/37
order reversed: true
```

`scripts/traktor-fingerprint.mjs` (new) runs the before/after diff of a real
collection for the remaining Traktor-side verification.

### P1 — M3U8

- `parse-m3u8.ts` — `#EXTINF` accepted with whitespace, an attribute list, or
  no label; `#EXTVDJ` tagged artist/title (better data than a dash-separated
  label) and `#EXTART` are read; directives accumulate onto one entry and are
  reset per track so nothing leaks to the next.
- `lib/playlists/import-coverage.ts` (new) + `components/playlists/import-summary.tsx`
  (new) — after an import, the detail page states what came through per field,
  and distinguishes "your library doesn't have this" from **"not in this
  format"**. That distinction is the actual fix: an M3U8 with no BPM is not a
  library with no BPM, and telling him to fix his tags would have been wrong
  advice.
- Said before the upload too, on the import screen.
- `audio-match.ts` — filename matching added as the highest-confidence pass, so
  "import an m3u8, then add the audio files" works off the path the titles were
  guessed from rather than off the guesses.

### P2 — Key notation

- `lib/music/camelot.ts` — `camelotToOpenKey`, `camelotToMusical`,
  `detectKeyNotation`, `formatKey`, `keySortIndex`. Tested over the full 24-key
  wheel in all three notations, in both directions, and cross-checked against
  the existing `musicalKeyValueToOpenKey` table.
- Migration `0026_profile_key_notation.sql` + `profiles.key_notation`, service
  getter/setter, `rememberKeyNotationAction`.
- The tracklist's two key columns (Camelot and the raw string, which showed the
  same key twice) became **one column in the notation the DJ picked**, switched
  from its own header, with their own value on hover. Sorting moved to wheel
  position, so "sort by key" groups compatible tracks in every notation instead
  of ordering "10A" before "2A".

### P3 — Energy

- `lib/playlists/energy-tag.ts` (new) — ordered patterns covering `Energy 7`,
  `Energy: 7`, `Energy=7`, `Energy 7/10`, `Energy Level 7`, and the three forms
  he named that previously read as nothing: `01 Energy`, `1 Energy`,
  `1.0 Energy`. Plus `E7` as a whole field. Decimals round (7.5 → 8).
- Read from a dedicated ENERGY frame (ID3 `TXXX:ENERGY`, Vorbis, iTunes atom),
  the comment, Traktor `COMMENT2` / `KEY_LYRICS` / `PRODUCER`, Rekordbox
  `Grouping` / `Composer`, and the label. A bare number is accepted **only**
  where it cannot mean anything else.
- `energySource` recorded per track and surfaced in the import summary.
- `/energy-tags` (+ `/es/energy-tags`) — the page he asked for: which field,
  which format, and what we deliberately don't read. Linked from the import
  screen and the import summary.

### Not done, and why

- **Traktor-side verification of the fix.** The export is byte-preserving and
  proven so against his real collection, but only Traktor can say what Traktor
  does on import. Run `scripts/traktor-fingerprint.mjs` before/after on a copy.
- **`playlistOnly` in the UI** — see above.
- Both migrations are applied by hand in the Supabase SQL editor and **must go
  in before the deploy**: the insert paths write the new columns, and PostgREST
  rejects an insert naming a column that doesn't exist.

1332 unit tests pass, typecheck and lint clean, production build clean.
