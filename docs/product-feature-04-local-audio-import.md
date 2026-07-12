# Feature 04 — Local audio files import ("From your music files")

## Why

The import card accepted DJ-software exports only (Rekordbox .xml/.txt/.m3u8, Traktor .nml) or pasted text. But a common starting point is simpler: a DJ has a folder of tracks (say 100) and wants to pick 20 of them and get an optimal order — energy curve + Camelot harmony — without opening Rekordbox at all.

Audio files already carry what the engine needs, in their embedded tags (ID3/MP4/Vorbis): artist, title, **BPM (TBPM)**, **key (TKEY — Mixed In Key writes Camelot like "8A")**, **genre (TCON)**, **comment with MIK "Energy N"**, and duration. So we read the tags **client-side in the browser** and send only the parsed metadata as JSON. **Audio bytes never reach the server** — privacy-aligned with the "nothing leaves your account" promise and zero storage/bandwidth cost.

v1 is **tags-only**: no audio-signal analysis. Files without BPM/key tags degrade to estimated energies (existing engine behavior) and don't participate in harmonic reordering. Signal-based BPM/key detection (Web Audio) is a possible phase 2.

## Flow

1. Playlists page → import card → tab **"From your music files"**.
2. Pick files (multi-select dropzone, `audio/*`) or a **folder** (`webkitdirectory`; the button is feature-detected and hidden on iOS Safari). Non-audio files are filtered by extension allowlist; duplicates deduped; capped at `AUDIO_IMPORT_MAX_FILES = 100`.
3. Tags parsed sequentially with **music-metadata** (`parseBlob`, `{duration: true, skipCovers: true}`), loaded via dynamic `import()` so it never enters the page bundle. Progress: "Reading tags… 12/20". Unreadable files degrade to filename-derived artist/title and are flagged.
4. **Preview**: per-row BPM / key / energy badges ("—" when absent), per-row include checkbox, honest note "X of N tracks missing BPM · Y missing key — analysis quality depends on your tags". Name input (defaults to the picked folder's name), context + genre selects (auto-detect recommended).
5. Create → `importAudioFilesAction` (direct-call server action). The parsed JSON **is** the untrusted payload; `createAudioImportSchema` is the trust boundary — strings sanitized/truncated, out-of-range numbers coerced to **null rather than rejecting** (one messy TBPM must not sink the import), tracks capped at 500. Then the standard path: `detectGenres` → `createPlaylist({importSource: "files"})` → `replaceTracks`.
6. Redirect to the playlist detail — live curve, tracklist, and the Analyze page's suggested reorder (energy + Camelot) take over.

## Field mapping

| Tag (music-metadata `common`) | ImportedTrack | Notes |
|---|---|---|
| `title` / `artist` (or `artists[0]`) | name / artist | fallback: filename split "01. Artist - Title.mp3" |
| `bpm` (TBPM) | bpm | via `parseBpm`; schema clamps 60–220 else null |
| `key` (TKEY) | key | MIK writes Camelot; >12 chars → null |
| `genre[0]` (TCON) | genre | verbatim; `detectGenres` maps it |
| `comment` (COMM; `string[]` or `IComment[]`) | comment + energy | `extractEnergyFromComment` finds MIK "Energy N" |
| `format.duration` | durationSeconds | rounded |
| `file.webkitRelativePath \|\| file.name` | sourceUri | folder-relative — keeps the m3u8 export resolvable |
| — | perceivedDb | always null (not a tag) |

## Key files

- `lib/playlists/parse-audio-tags.ts` — pure mapper + helpers (`isAudioFileName`, `splitFilenameToArtistTitle`, `audioTagsToImportedTrack`). Defines its own structural `AudioTagSource` type so neither the module nor its tests depend on music-metadata.
- `lib/playlists/schemas.ts` → `createAudioImportSchema` — the trust boundary (coerce-to-null stance).
- `app/dashboard/playlists/actions.ts` → `importAudioFilesAction` — direct-call action returning `{ok, playlistId}`.
- `components/playlists/audio-files-import.tsx` — picker + progress + preview + submit (the only importer of music-metadata, dynamically).
- `components/playlists/playlist-import-upload.tsx` — mode tabs hosting both panels.
- Tests: `tests/parse-audio-tags.test.ts`, `tests/audio-import-schema.test.ts`.

## Non-goals / follow-ups

- No audio-signal analysis (BPM/key detection from the waveform) — phase 2 candidate.
- No recursive folder drag&drop traversal (`webkitGetAsEntry`) — dropping files works; picking a folder uses the button.
- Serato tag conventions not specially handled beyond standard ID3.
