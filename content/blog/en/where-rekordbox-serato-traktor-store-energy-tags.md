---
title: "Rekordbox, Serato and Traktor: where each one stores a DJ's energy tags"
description: "Energy tags live in different fields depending on what wrote them, and the field decides whether anything else can read them. A map of where yours are."
slug: where-rekordbox-serato-traktor-store-energy-tags
locale: en
targetQuery: "where does rekordbox store energy tags"
publishedAt: 2026-09-22
tags: energy tags, rekordbox, traktor, serato
---

An **energy tag** is a number a DJ puts on a track to say how intense it is, and there
is no standard place to keep one. Rekordbox, Traktor, Serato and Mixed In Key each
write to a different field, and which field yours is in decides whether any other tool
can read it at all. This is a map of where they go.

The confusion is not anyone's fault. The ID3 metadata standard has no energy field, so
every tool borrowed a field meant for something else, and each picked a different one.

## The short version

| Where it lives | Who writes there | Read by others? |
|---|---|---|
| A dedicated `ENERGY` field | Lexicon DJ, custom scripts | Cleanly, when a tool looks for it |
| The comment field | Mixed In Key, most hand-tagging | Usually, if the tool parses comments |
| Rekordbox's Grouping column | Rekordbox users who keep comments for notes | Only by tools that check it |
| The lyrics frame | DJs who have run out of fields | Rarely — almost nothing reads it |

EnergyCurve reads all four, plus two more. The full list, with the exact frame names,
is on [the energy tags reference](/energy-tags).

## Rekordbox

Rekordbox has no energy column of its own, so DJs use one of two places.

**Comments** is the common one, and it is where Mixed In Key writes when it tags a
library. If you have ever seen `7A - Energy 6` sitting in a track's comment, that is
this.

**Grouping** is the other, and it is the better habit. It is a separate column,
Rekordbox shows it in the track list, you can sort by it, and crucially it leaves the
comment field free for actual notes — "intro is long", "clean edit", "do not play after
the Anfisa record". DJs who tag by hand tend to end up here once they have lost a
comment to a tool overwriting it.

Both are written into the file's ID3 tags, so both survive being read by something
else — which is what makes an export from Rekordbox useful to a tool that is not
Rekordbox.

## Traktor

Traktor is the one with the most places, because its collection format carries fields
the others do not expose.

Its **INFO COMMENT** field is the equivalent of Rekordbox's Comments, and it is where
Mixed In Key lands. Traktor also has a **second comment field**, `COMMENT2`, which
exists precisely because one was not enough, and a lot of DJs use it for energy so the
first stays readable.

It also has **INFO PRODUCER** and a lyrics field, `KEY_LYRICS`. Both get used for
energy by people who have run out of obvious places. The lyrics one sounds absurd until
you notice its actual advantage: nothing else reads it, so nothing else overwrites it.

The practical consequence is that a Traktor NML export can carry an energy value in any
of four fields, and a tool that checks only one will tell a DJ their library is
untagged when it is not.

## Serato

Serato is the awkward one, and it is worth being straight about why rather than
implying a feature exists.

Serato does not expose an energy field in its own interface. DJs who want energy in a
Serato library either write it into the comment field — where Mixed In Key puts it
anyway — or keep it somewhere outside Serato entirely.

So "where does Serato store energy tags" has an unsatisfying answer: it mostly does
not, and what you have is whatever wrote to the comment field before Serato read it.
The good news is that the comment field is ordinary ID3, so a Serato library tagged by
Mixed In Key is readable by anything that parses comments.

## Which one wins when a track has several

This is the question that actually causes trouble, because a track that has been
through two tools often carries two values that disagree.

EnergyCurve resolves it with a stated precedence rather than a guess. A field literally
named `ENERGY` settles it outright, in any written form, because a value in a field
named for the purpose was put there deliberately. Failing that, the order is the comment
field, Traktor's second comment field, Grouping, lyrics, producer, composer.

There is a second rule underneath that one, and it matters more often than the first.
An **explicitly written** value anywhere beats a **bare number** everywhere: a comment
reading `Energy 8` wins over a producer field that happens to contain `3`. Without it,
any field with a stray digit in it would outrank a value somebody actually wrote, purely
because it sits earlier in the list.

The reason to have a stated order at all is that the alternative — first one found, or
last one wins — makes the result depend on the order fields happen to appear in a file,
which is not a property anyone can reason about.

## What this means for getting a curve

You do not need to migrate your tags anywhere. The point of reading six fields instead
of one is that your library works as it is.

What is worth knowing is **which** field yours are in, for one reason: if you ever move
software, that decides whether the tagging work you have done for years comes with you.
A value in Grouping or a dedicated ENERGY field travels. A value in Traktor's `COMMENT2`
is a Traktor fact.

If you want to see what a tool actually reads out of your library, the fastest check is
to drop an export into [the energy curve tool](/tools/energy-curve) — it takes Rekordbox
XML, Traktor NML, M3U8 and CSV, needs no account, and will show you a curve built from
whatever it found. If it finds nothing,
[planning a set with no BPM or key](/blog/dj-tracks-with-no-bpm-or-key) covers what to
do next, and [what an energy curve is](/blog/what-is-a-dj-set-energy-curve) covers what
you are looking at once it works.

```faq
Q: Does Rekordbox have an energy column?
A: Not one of its own. DJs use Comments — where Mixed In Key writes — or the Grouping
column, which is the better habit because it leaves Comments free for notes and
Rekordbox lets you sort by it.

Q: Why does Traktor have so many places to put energy?
A: Because its collection format exposes more fields than the others: INFO COMMENT, a
second comment field, INFO PRODUCER and a lyrics field. DJs spread across them to keep
one field readable while another gets overwritten by a tool.

Q: My track has energy in two different fields. Which one is used?
A: A field named ENERGY settles it outright; otherwise the order is comment, Traktor's
second comment field, Grouping, lyrics, producer, composer. Underneath that, a written
form like "Energy 8" in any field beats a bare number in any other — otherwise a stray
digit would outrank a value somebody actually typed.
```
