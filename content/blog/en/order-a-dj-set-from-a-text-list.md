---
title: "How to order a DJ set from a plain text list (no Rekordbox needed)"
description: "You do not need Rekordbox or Serato to analyse the order of a set. A list of track names pasted into a plain text box is already enough to start."
slug: order-a-dj-set-from-a-text-list
locale: en
translationOf: ordenar-un-set-desde-una-lista-de-texto
targetQuery: "order DJ set without Rekordbox"
publishedAt: 2026-09-22
tags: set order, importing, no library
---

A list of "Artist - Title" lines, one per track, in the order you plan to play them,
is enough to analyse the shape of a set. What you get from names alone is genre
detection, an energy estimate and the curve; what you cannot get is real harmonic
mixing, because the key is not in the filename.

Almost everything written about set preparation assumes your library is loaded into
Rekordbox, Serato or Traktor and that you will export from there. That is a
reasonable assumption for a DJ with years of tidy library, and a fairly bad one for
everybody else.

There are a lot of people building sets in a notes app, in a chat with a friend, or
on their phone. That is also a list of tracks in an order, which is all it takes to
start.

## What can be done with names alone

With "Artist - Title" per line you can already:

- **Detect the genre** of most tracks and anchor the analysis to the BPM band that
  belongs to it. A psy-trance track dropped into a techno set is judged against its
  own yardstick, not the set's.
- **Estimate energy by position** when there is no other data. It is the weakest
  estimate of the lot and you should know that, but it gives you a baseline.
- **See the shape of the set** and compare it against the one you wanted: warm-up,
  peak time, after.

What you **cannot** do without data is real harmonic mixing. The key is not in the
filename, and no amount of parsing invents it.

## The three routes, and what each gives you

| Input | BPM | Key | Energy |
|---|---|---|---|
| Pasted text list | estimated by genre | no | estimated by position |
| Rekordbox / Traktor / M3U8 export | from the tag | from the tag if present | from the tag or the BPM |
| Your own audio files | measured from the audio | in validation | from BPM + from the audio |

None of this is all or nothing. You can start by pasting the list, see whether the
analysis tells you anything useful, and only then decide whether exporting from your
software is worth it.

## How to paste it

One line per track, in the order you plan to play them:

```
Sopik - Call Me Daddy
T78, Van Giessen - Emergency
Sara Landry, LEGZDINA - Pressure
```

It also accepts "Title - Artist" if you have it the other way round, and it strips
leading numbers if you pasted from a numbered list.

### What if my list has timestamps or set positions in it?

Paste it anyway. Leading numbers and index markers are stripped, so a list copied out
of a tracklist site or a recording description usually comes through intact. What
confuses it is extra text on the same line — a label, a catalogue number, a "[free
download]" — so if a line looks wrong, that is the first thing to remove.

### Does the order I paste actually matter?

It is the whole input. The analysis is a judgement about an ordering, so pasting the
tracks alphabetically and expecting a verdict on your set will give you a verdict on
a set nobody is going to play. If you do not yet have an order, paste your best guess
— a guess is a set, an alphabetical list is not.

### Can I go the other way and get the set into my software?

Yes, with one caveat worth knowing before you try. See below.

### Will it recognise an obscure track?

Genre detection works from artist and title against what is known about them, so a
white label with no artist credited, a bootleg edit with a made-up name, or your own
unreleased track will not be recognised — and when nothing is recognised the analysis
falls back to estimating by position, which is the weakest input there is. A set made
mostly of unreleased material is the case where exporting from your software, with
whatever BPM it already measured, is worth the extra step.

## And for exporting

If you built the set from a text list and then want it in your software, the format to
use is **M3U8**: save it next to the music and it relinks by filename. The native
Rekordbox and Traktor formats will show the tracks as "missing", because from a text
list we do not have the real paths to your files.

That is not a bug that can be fixed at this end — a path is a fact about your machine,
and a list of names does not contain it. The [import formats page](/import-formats)
sets out which format survives which round trip.

If your tags turn out to be empty once you do export,
[tracks with no BPM or key](/blog/dj-tracks-with-no-bpm-or-key) covers what can be
recovered from the audio and how much to trust it. And if you want the checks the
analysis is running,
[is my set in the right order](/blog/is-my-dj-set-in-the-right-order) lists them.

[Paste your list](https://energycurve.app)
