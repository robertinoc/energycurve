---
title: "Rekordbox export to USB for DJ players, and what to do when Export is greyed out"
description: "What Rekordbox writes to a USB stick, which library format it picks, and the file-system reason the export option goes grey, from Pioneer's own guides."
slug: rekordbox-export-playlist-to-usb-greyed-out
locale: en
translationOf: exportar-playlist-de-rekordbox-a-usb
targetQuery: "rekordbox export playlist greyed out"
publishedAt: 2026-09-27
tags: rekordbox, usb, exporting
---

Exporting a playlist to a USB stick is the one thing every Rekordbox user does
before every gig, which is why "export greyed out" at eleven at night is such a
particular kind of bad. This is what the export does, taken from Pioneer's USB
export guide and the Rekordbox manual, and the short list of things that make the
option unavailable — with the one that causes most of it first.

## What "export to USB" actually writes

Rekordbox does not just copy files. When you export to a device, it copies the
tracks **and creates a database on the stick**: the same information Rekordbox has
about those tracks — grids, cues, key, BPM, playlist order — written in a form
the CDJ or XDJ reads directly. That database is why a stick prepared in Rekordbox
behaves differently on a player from a stick you dragged files onto.

There are two versions of that database, and the USB export guide is the source
for both:

- **Device Library**, the format since 2009, read by every player that reads a
  Rekordbox stick.
- **OneLibrary**, since 2023 (it was briefly called Device Library Plus), read by
  newer equipment.

Which one Rekordbox writes depends on the player model you tell it you are
exporting for. You can convert a stick from one to the other from the context menu
on the device in the tree view — with one exception the guide states plainly:
a OneLibrary stick cannot be converted back to Device Library.

The playlist export itself lives in **Export mode**. Sync Manager, in the manual's
words, exports iTunes or Rekordbox playlists to USB storage devices in their
updated state — which is the part to remember when a track was re-edited after the
last export and the stick still has the old one.

## Why "Export" is greyed out

Rekordbox will only write to a stick whose file system it supports. The manual's
supported-media table lists **FAT32** as the safe answer for USB drives, and
Pioneer's own FAQ is the one that explains the grey option:

"Your device may be formatted in a file system that is not supported by the DJ
equipment. If the file system is exFAT, only these DJ equipment are available…
format to a file system other than exFAT."

So the checklist, in the order that finds the cause fastest:

1. **Does the stick appear in the tree view at all?** If Rekordbox does not list the
   device, nothing about export applies yet — it is a mounting problem, not an
   export problem.
2. **What file system is it?** Check it in your operating system. **exFAT** is the
   usual culprit: it is what most sticks over 32 GB ship with, Rekordbox can write
   it, and only some players read it. Pioneer keeps the list of exFAT-capable
   equipment in the FAQ; if your player is not on it, the stick has to be FAT32.
   NTFS and Apple's HFS+ are for computers, not for players.
3. **Reformat, then export again.** Reformatting erases the stick. Copy anything
   you need off it first; then format it FAT32 and try the export.
4. **Which library format did it write?** If the stick exports fine but the player
   does not see the playlists, check whether it was written as OneLibrary for a
   player that reads Device Library. The device's context menu in the tree view
   shows which one it is.

What this list does not include is anything about your Rekordbox licence or plan,
because export to USB is not a paid feature and never was. If the option is grey,
it is the stick.

## Before the export: is the order right?

An export is a commitment: once the stick is in the player, the order is the order.
The check that is worth doing before it is not a Rekordbox feature, and it takes a
minute.

Export the collection as XML first — File, then Export Collection in xml format;
it writes every playlist to one file — and drop that file into
[the free energy curve tool](/tools/energy-curve). It reads the playlist order and
the energy values Rekordbox has for each track, no account needed, and draws the
set's shape. A set that climbs when you meant it to hold, or drops in the wrong
third, is easier to fix in Rekordbox tonight than on the player tomorrow. What the
XML carries, next to the other formats, is on [the import formats
page](/import-formats); if the curve comes out flat because the energy field is
empty, [where Rekordbox stores energy tags](/blog/where-rekordbox-serato-traktor-store-energy-tags)
covers which column it reads.

To be straight about scope: EnergyCurve reads the Rekordbox XML. It does not write
to a USB stick, does not produce a Device Library, and has nothing to do with the
export step itself. It is the check before the export, not a replacement for it.

## If you are moving the playlist somewhere else

A stick prepared for a player is also, incidentally, a folder of files — which is
why it is the first step when the destination is not a CDJ but another program.
[Moving a playlist between Serato and Rekordbox](/blog/serato-crates-and-rekordbox)
starts exactly there.

```faq
Q: Why is "Export" greyed out in Rekordbox?
A: Almost always the stick's file system. Rekordbox writes only to file systems it
supports, and Pioneer's FAQ names exFAT as the one that works with only some
players. Check the file system, back the stick up, reformat it FAT32, and export
again.

Q: Does export to USB just copy the files?
A: No. It copies the tracks and writes a database on the stick — Device Library
or OneLibrary depending on the player model — holding grids, cues, key, BPM and
playlist order in the form the player reads.

Q: Can I convert a OneLibrary stick back to Device Library?
A: No. The USB export guide says a OneLibrary stick cannot be converted back;
Device Library can be converted to OneLibrary from the device's context menu in
the tree view.
```
