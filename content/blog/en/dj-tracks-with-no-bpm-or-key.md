---
title: "Your DJ tracks have no BPM or key in the tags: what to do"
description: "Almost every set-prep guide assumes a tidy library. If you have wavs and flacs with no tags, here is what can be recovered and what simply cannot."
slug: dj-tracks-with-no-bpm-or-key
locale: en
translationOf: tus-temas-no-tienen-bpm-ni-tonalidad
targetQuery: "tracks with no BPM or key"
publishedAt: 2026-09-22
tags: BPM, key, importing, no library
---

BPM can be read reliably from the audio. Key cannot — detecting it from audio is a
genuinely hard problem and our own hit rate is 21 percent, so we keep it switched off.
Energy can be estimated from BPM and other audio properties, but an estimate is what
it is. That is the honest summary, and the rest of this explains it.

Every guide on harmonic mixing and energy curves starts the same way: "take your
library, look at the BPM and key of each track". And for a lot of people the guide
ends right there, because the wavs you got from a promo, the flacs a friend sent you
and the edits you made yourself have nothing written in the tags.

It is not a rare case. It is the normal case.

## Why they are missing

BPM and key tags do not come with the file: some program writes them afterwards. If
you bought on Beatport they are usually there; if it is a promo, a rip, an edit of
your own or a wav exported from your DAW, they are not. And a wav, by format, has far
less room for metadata than an mp3.

## What can be recovered, and with how much confidence

**BPM can be read from the audio, and read well.** Tempo detection is a solved
problem in electronic music: the pulse is strong and regular, and the algorithms get
it right nearly every time. In our measurements over techno and house it matched the
tags on every file that had them.

**Key is another matter entirely.** Detecting it from audio is genuinely difficult,
especially in genres where the bass carries the harmony and the synths on top are
heavily processed. We are at 21 percent accuracy and we do not sell it as more than
that: it is switched off until we can measure it properly.

If somebody promises you perfect key detection from audio, be suspicious.

**Energy can be estimated** from BPM and from other properties of the audio — how
loud it sounds, how much the spectrum moves, how many attacks per second it has. It
is an estimate, not a measurement.

## The order of precedence worth using

If you are preparing a set from a mixed library, this is the reasonable hierarchy:

1. **What you entered by hand.** Always wins. You listened to the track.
2. **What was measured from the audio.** Reliable for BPM.
3. **The file's tag.** Reliable if you know who wrote it.
4. **Estimated by position in the set.** Last resort, and you should know that it is.

What matters is not having the number: it is **knowing where each number came from**.
A set where half the BPMs are measured and half are guessed is not a set with good
data, it is a set with two kinds of data that look identical on screen.

### How do I tell who wrote a tag?

You usually cannot, per track, and that is the point of ranking the tag third rather
than first. What you can do is tell per *source*: a folder bought from a store tends
to be right, a folder of promos tends to be empty, and a folder your own software
analysed is as good as that software. If a BPM is a suspiciously round number on a
track that clearly is not at exactly 128, something wrote it optimistically.

### Should I just let my DJ software analyse everything?

For BPM, yes — it is the same solved problem, and it writes the result back into the
tags where everything else can read it. For key, treat whatever it writes as one
opinion. [Energy tags](/energy-tags) covers what Rekordbox, Serato and Traktor each
store, and where they disagree.

### Can I prepare a set with no tags at all?

Yes, with a smaller result. Genre detection and an energy estimate by position are
enough to see the shape of a set and catch the two transitions that break it — see
[ordering a set from a text list](/blog/order-a-dj-set-from-a-text-list) for what that
path gives you. What you lose is harmonic checking, which needs a key from somewhere.

### Is it worth filling the tags in by hand?

For the tracks you play often, yes, and it is the highest-value hour in library
maintenance because entry 1 in the list above never decays. For a one-off set, no —
measure the BPM, accept an energy estimate, and spend the time on the order instead.

### Does a missing key tag break the whole analysis?

No — it removes one of the four checks. Energy, tempo and the shape of the set are all
still readable, and those are what catch the two transitions that are usually wrong.
What you lose is the harmonic check on neighbours, and the honest way to handle that
is to run the pairs you are unsure about through the
[Camelot wheel](/tools/camelot-wheel) by ear rather than pretend a number exists.

## What this means for your next set

Import what you have, let BPM be read from the audio where the tags are empty, and do
not wait for a tidy library — nobody has one.
[Analyse it before you play it](/blog/analyse-your-dj-set-before-you-play-it) rather
than after, because a missing tag you find out about during preparation is an
inconvenience and one you find out about in the booth is not.

[Import what you have](https://energycurve.app)
