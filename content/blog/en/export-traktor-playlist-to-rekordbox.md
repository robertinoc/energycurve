---
title: "Export a Traktor playlist to Rekordbox: what survives the move between DJ programs"
description: "Traktor exports a playlist as a folder plus an NML file, and Rekordbox does not open NML. What actually moves, what does not, and how to keep the order."
slug: export-traktor-playlist-to-rekordbox
locale: en
translationOf: exportar-playlist-de-traktor-a-rekordbox
targetQuery: "export traktor playlist to rekordbox"
publishedAt: 2026-09-27
tags: traktor, rekordbox, importing, exporting
---

Traktor can export a playlist. Rekordbox can import a playlist. The two facts do not
join up, because the file Traktor writes is not a file Rekordbox reads, and most of
the frustration in "export Traktor playlist to Rekordbox" comes from expecting them
to. This is what each program actually does, taken from their own manuals, and the
route between them that does not depend on a feature nobody shipped.

## What Traktor exports

In Traktor, right-click the playlist in the Browser Tree and choose **Export
Playlist**. You give it a name and a destination and Traktor creates a folder
containing the tracks and the playlist file, an `*.nml`. That is the whole feature,
and it is a good one: the audio and the list travel together, so the folder is
self-contained.

The `.nml` is Traktor's own format. It holds the playlist order and, for each
track, what Traktor knows about it: BPM, key, its comment fields, and the path to
the file. The order is the part worth noticing. A folder has no order — your file
manager sorts it by name — and the `.nml` is the only thing in that folder that
remembers which track came third.

## What Rekordbox imports

Rekordbox's manual, all 266 pages of the current one, does not mention Traktor or
NML once. Rekordbox imports three kinds of thing: music files and folders, an
iTunes or Apple Music library, and its own **rekordbox xml**. There is no "Import
from Traktor" and no official converter from Native Instruments or Pioneer.

Two of those three imports are useful here.

**A folder becomes a playlist.** The manual says it in one line: drag and drop a
folder from the Explorer node in the tree view onto Playlists, and a playlist is
created with the folder's name. The folder Traktor exported is exactly that kind of
folder. Drop it, and Rekordbox has a playlist with the same tracks — in whatever
order it lists files, not in yours.

**An XML becomes a playlist, order included.** Rekordbox reads a playlist library in
its own XML format: in Preferences, under Advanced and then Database, you point
`rekordbox xml` at an XML file, and it appears as a node in the tree view. From
there you double-click Playlists under it and drag a playlist under your own
Playlists. This is the route that keeps order, and it needs a rekordbox XML — which
Traktor does not write.

## So what actually moves

Be precise about this, because the honest answer is more useful than the
optimistic one.

| What | Travels? | Why |
|---|---|---|
| The audio files | Yes | Traktor copies them into the export folder |
| The set of tracks | Yes | Drop the folder on Playlists |
| The order | Not by itself | It lives in the `.nml`, which Rekordbox does not read |
| BPM and key | Usually | Both programs read the file's tags; Rekordbox will also re-analyse |
| Energy | Depends on the field | See below |
| Cue points, grids, Traktor's second comment | No documented path | They are Traktor's collection data, not the file's |

Energy deserves its own line. If your energy value lives in the comment field, it is
ordinary ID3 and Rekordbox shows it in Comments. If it lives in Traktor's `COMMENT2`,
it is a Traktor fact and stays behind. Where each program keeps energy, field by
field, is in [where Rekordbox, Serato and Traktor store energy
tags](/blog/where-rekordbox-serato-traktor-store-energy-tags), and the exact frame
names are on [the energy tags reference](/energy-tags).

## The route, in order

1. In Traktor, right-click the playlist, **Export Playlist**, pick a destination.
   You get a folder with the tracks and an `.nml`.
2. In Rekordbox, drag that folder from Explorer onto Playlists. The tracks are in;
   the name is right; the order is the file manager's.
3. Put the order back by hand, using the `.nml` as the reference. It is a text file
   and any editor opens it, but reading a playlist out of XML by eye is slow.

Step three is where a tool that reads NML earns its keep. Drop the `.nml` into
[the free energy curve tool](/tools/energy-curve): it reads the order and the
energy field Traktor wrote, no account needed, and shows the set as a list and a
curve. That list is your checklist while you reorder in Rekordbox — and the curve
tells you whether the order was worth keeping in the first place.

To be clear about what EnergyCurve is not: it reads both formats, Traktor NML and
Rekordbox XML, but it does not write one from the other. It is not a converter.
Library managers built for that job exist — [the comparison with
Lexicon](/compare/lexicon) says where the line is, and
[Rekordbox vs Serato vs Traktor](/compare/rekordbox-vs-serato-vs-traktor) compares the
two programs themselves — and this article does not
pretend the conversion step away. It tells you which step has no tool and how to
do it with the least pain. The full list of what each format carries is on
[the import formats page](/import-formats).

## If you are moving for good

Two things are worth doing before the last export, because they decide whether
years of tagging come with you.

**Check which field your energy is in.** A value in the comment field or in
Grouping travels with the file. A value in `COMMENT2` does not. If yours is in the
wrong one, the time to move it is while you still have Traktor open.

**Let Rekordbox re-analyse, then compare.** Its BPM and key detection are its own,
and they will not always agree with Traktor's. A set that was harmonically clean in
one program can look off by a step in the other purely because the two disagree on
a key. Checking a few tracks you know well tells you which one to trust.

```faq
Q: Can Rekordbox open a Traktor NML file?
A: No. The Rekordbox manual does not mention NML or Traktor. Rekordbox imports
music files and folders, an iTunes or Apple Music library, and its own rekordbox
xml format.

Q: Does the playlist order survive the move?
A: Not on its own. The order is stored in the .nml, which Rekordbox does not read.
Dropping the exported folder on Playlists gives you the right tracks in file-manager
order; the order has to be put back by hand, with the .nml as the reference.

Q: Do my energy tags come with the tracks?
A: If they are in the comment field, yes — it is ordinary ID3 and Rekordbox shows
it in Comments. If they are in Traktor's second comment field, no; that field is
Traktor's own.
```
