---
title: "Serato crates and Rekordbox: what a crate is, how a DJ moves one, and why there is no text export"
description: "A Serato crate is a playlist stored as a .crate file. What that means when you want it in Rekordbox, as text, or want a Rekordbox playlist in Serato."
slug: serato-crates-and-rekordbox
locale: en
translationOf: crates-de-serato-y-rekordbox
targetQuery: "export serato crate to rekordbox"
publishedAt: 2026-09-27
tags: serato, rekordbox, importing, crates
---

Four searches land on the same wall from different sides: *export Serato crate to
Rekordbox*, *convert Rekordbox playlist to Serato*, *export Serato crate as text*,
and, underneath all three, *what are crates in Serato*. They share an answer, and
it is shorter and less satisfying than the search suggests: neither program
documents a path to the other, and a crate is not a text file. Here is what each
piece is, from Serato's and Pioneer's own documentation, and the route that works
without inventing a feature.

## What a crate is

A **crate** is Serato's word for a playlist: a named list of tracks, in an order
you set, that you build by dragging tracks into it. Serato DJ Pro and Serato DJ
Lite both have them, and a crate can hold subcrates.

What makes crates different from playlists in other software is where they live.
Serato keeps a folder called `_Serato_` on every drive it uses, and inside it a
`Subcrates` folder holding one `.crate` file per crate. That file is the crate:
the list of file paths, in order. Your audio is wherever you put it; the crate only
points at it.

This has one consequence people discover the hard way. A crate on your laptop
points at files on your laptop. Copy the `.crate` file somewhere else and it points
at nothing.

## Getting a crate out of Serato

Serato's documented way to export a crate is to **drag the crate onto a drive in
the Files panel**. Serato copies the tracks to that drive and writes the crate into
that drive's own `_Serato_` folder, so the drive is self-contained: plug it into
another Serato and the crate is there, tracks and all.

That is an export to *another Serato*. It is not an export to a format anyone else
reads.

### "Export Serato crate as text"

There is no official text export of a crate. Serato's support site does not
document one, and a `.crate` file is not a text file you can open and paste — it
is a binary list of paths. Forum workarounds exist; this article is not going to
describe one it cannot verify.

What you can do without any of that is get the *files* out, which the drag-to-drive
export does, and then read the list off the files. If what you wanted the text for
was to plan or check the set — the usual reason — that is the step
[the free energy curve tool](/tools/energy-curve) skips: it reads a folder's worth
of audio tags in the browser, or a plain text list of "Artist - Title" lines typed
out, no account needed, and gives you the set as a list and a curve. How far a
bare text list gets you is in [ordering a set from a plain text
list](/blog/order-a-dj-set-from-a-text-list).

## Serato crate to Rekordbox

Rekordbox's manual — the current one, 266 pages — does not mention Serato once.
Rekordbox imports music files and folders, an iTunes or Apple Music library, and
its own rekordbox xml. A `.crate` file is none of those.

The route that works uses the one thing both programs read: a folder of files.

1. In Serato, drag the crate onto a drive in the Files panel. You now have a
   folder of the crate's tracks on that drive.
2. In Rekordbox, drag that folder from the Explorer node onto Playlists. The
   manual's own line: a playlist is created with the dropped folder's name.
3. The order does not come along. A folder has no order, and the `.crate` that
   remembers it is not read. Put it back by hand.

What travels with the files is whatever is in their tags: BPM, key, and the comment
field. Serato has no energy field of its own, so if a crate was tagged for energy
it was done in the comment field — usually by Mixed In Key — and Rekordbox shows
that in Comments. The map of who keeps energy where is in [where Rekordbox, Serato
and Traktor store energy tags](/blog/where-rekordbox-serato-traktor-store-energy-tags).

## Rekordbox playlist to Serato

The same wall from the other side. Serato's support site, searched for "rekordbox
import", returns articles about importing music and about iTunes; not one about
Rekordbox. Rekordbox, for its part, exports its collection as **rekordbox xml**
(File, then Export Collection in xml format), which is a format for Rekordbox and
for tools that chose to read it. Serato is not documented as one of them.

So the route is the mirror image:

1. Get the playlist's files into a folder. Rekordbox's USB export does this — the
   details, and what to do when the button is greyed out, are in
   [exporting a Rekordbox playlist to USB](/blog/rekordbox-export-playlist-to-usb-greyed-out).
2. In Serato, drag the folder onto the import area. Serato's manual: drag a folder
   in, and it imports the compatible files and makes a crate of it.
3. Order: by hand, again.

If you want the order with you while you rebuild it, the rekordbox xml is the file
to keep. It records the playlist order, and [the energy curve
tool](/tools/energy-curve) reads it directly — that gives you the list, in order,
with energy, to work from while you drag tracks around in Serato.

## What this article will not claim

EnergyCurve reads Rekordbox XML, Traktor NML, M3U8 and CSV, and reads audio tags
straight from files. It does not read `.crate` files, and it does not write any
DJ software's format from another's. It is not a converter, and it is not going to
say the conversion step is easy when it is the step neither vendor built. What
each format carries is listed on [the import formats page](/import-formats);
[the comparison with Lexicon](/compare/lexicon) is the honest pointer for anyone
whose real problem is the conversion itself.

```faq
Q: What is a crate in Serato?
A: A playlist. A named, ordered list of tracks, stored as a .crate file in the
_Serato_/Subcrates folder of the drive it belongs to. The file lists paths; the
audio stays wherever you keep it.

Q: Can I export a Serato crate to Rekordbox?
A: Not directly. Rekordbox does not read .crate files and its manual does not
mention Serato. Drag the crate onto a drive in Serato's Files panel to get a folder
of its tracks, then drop that folder on Playlists in Rekordbox. The order has to be
rebuilt by hand.

Q: Can I convert a Rekordbox playlist to Serato?
A: Serato does not document importing Rekordbox playlists. Export the tracks from
Rekordbox to a folder, drag the folder into Serato, and you get a crate with those
tracks; keep the rekordbox xml as the reference for the order.
```
