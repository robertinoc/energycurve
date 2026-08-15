# Research: writing a rekordbox USB directly

> Ran 14 Aug 2026. Question asked: **could EnergyCurve write a USB stick a CDJ
> will play, so a DJ skips the round trip through rekordbox?**
>
> Answer: **not as a replacement for rekordbox, and the reason isn't the
> database.** There is a narrower version that is both feasible and arguably
> more useful. Verdict at the bottom.

## What a CDJ actually reads

A rekordbox-prepared stick has three things on it, and the format is only one:

| On the stick | What it is | Who can produce it |
|---|---|---|
| `/PIONEER/rekordbox/export.pdb` | A DeviceSQL database: tracks, playlists, artists, keys, colours | Reverse-engineered; open implementations exist, including for writing |
| `/PIONEER/USBANLZ/**/*.DAT`, `.EXT`, `.2EX` | Per-track **analysis**: waveforms, beat grids, cue points | **rekordbox only** |
| The audio files | The music | Anyone |

The database has been reverse-engineered thoroughly — by Henry Betts, Fabian
Lesniak and James Elliott — and is documented as a
[Kaitai Struct specification in Deep Symmetry's Crate Digger](https://github.com/Deep-Symmetry/crate-digger),
with a [Rust implementation in rekordcrate](https://github.com/Holzhaus/rekordcrate)
that includes write support. So "can we write the database" is settled: yes.

**That's the wrong question.** rekordcrate's own README states the constraint
plainly: a database entry alone does not make a CDJ play a track — the audio
must exist at the recorded path, and players expect the ANLZ analysis files,
*which rekordbox generates during analysis and this library does not create*.

A track on a stick with no ANLZ loads without a waveform and without a beat
grid. On a club CDJ that is not a degraded experience, it's an unusable one:
no waveform to read the drop, no grid to sync. A DJ would find that out at the
gig.

Producing ANLZ ourselves would mean reverse-engineering and then *writing*
Pioneer's analysis format — beat grids, three waveform resolutions, cue data —
which is a different order of work from parsing a database, and no open project
has done it.

## Two more walls behind that one

**We don't have the audio.** The whole privacy promise is that files never leave
the machine; the server sees numbers. Writing a stick means writing files, which
means the browser needs the audio *and* the USB. The File System Access API can
do that — `showDirectoryPicker` grants write access to a mounted volume — but it
is Chromium-only. Safari and Firefox have no write support, so this would be a
feature that silently doesn't exist for a large share of Mac users.

**None of the implementations are ours to use directly.** Crate Digger is Java
under EPL-1.0; rekordcrate is Rust. Neither runs in a browser without a port or
a WASM build, and the licence of anything we adopt matters here for the same
reason it did with Essentia — see `docs/spike-browser-audio-analysis.md`.

## The narrower version, which is the interesting one

The DJ already prepares a stick in rekordbox. Everything on it already has ANLZ,
because rekordbox analysed it. What they *don't* have is the order we worked out
with them.

So: **take a stick they already exported, and add a playlist to it.** Read
`export.pdb`, find the tracks that are already there, write one more playlist
row pointing at those same track ids in our order, save. No audio copied, no
analysis invented, nothing on the stick touched except the playlist tree.

That is a fraction of the work, it produces something a CDJ plays perfectly —
the tracks keep their waveforms and grids — and it closes the actual loop the
product cares about: *analyse → fix → get the order into the booth*.

Two things it would need, and neither is free:

- **A pdb writer in TypeScript or WASM.** Reading is the well-trodden path;
  writing a page-based binary database correctly is where the risk sits.
- **Never write in place.** A corrupted `export.pdb` bricks the stick for the
  gig, which is the worst possible failure this product could cause. Write to a
  copy, verify by re-parsing, and only then let the user swap it.

## Verdict

**Don't build the full export.** It requires producing analysis files nobody
outside Pioneer has ever produced, and without them the result is unusable in
exactly the place it's meant to be used.

**Revisit the playlist-injection version when there's demand for it**, and treat
it as its own project rather than a variation on the export menu — it's a
binary-format writer with a catastrophic failure mode, not a serialiser like the
XML and NML we already emit.

**In the meantime the M3U8 path already does most of the job** for the
files-based case, and Rekordbox XML does it for the library case: the DJ imports
our order back into rekordbox and exports the stick from there. It's one extra
step, and it's the step that generates the analysis we can't.

## What I could not verify

- Whether a CDJ **refuses** a track with no ANLZ or merely plays it without a
  waveform. Sources agree players "expect" the files; nobody I found tested the
  refusal case. It doesn't change the verdict — unusable either way — but it
  would matter for the narrower version if a track were ever missing analysis.
- Whether the newer `exportExt.pdb`
  ([Crate Digger issue #11](https://github.com/Deep-Symmetry/crate-digger/issues/11))
  is required by current firmware or still optional. It would need to be handled
  before shipping anything that writes to a modern stick.

## Sources

- [Crate Digger — Deep Symmetry](https://github.com/Deep-Symmetry/crate-digger)
  and its [rekordbox_pdb.ksy specification](https://github.com/Deep-Symmetry/crate-digger/blob/main/src/main/kaitai/rekordbox_pdb.ksy)
- [rekordcrate — Rust parser with write support](https://github.com/Holzhaus/rekordcrate)
- [rekordbox-pdb — read/write library for the DeviceSQL format](https://github.com/fragmede/rekordbox-pdb)
- [Crate Digger issue #11 — exportExt.pdb](https://github.com/Deep-Symmetry/crate-digger/issues/11)
- [Pioneer — USB export documentation](https://rekordbox.com/en/support/usb-export/)
