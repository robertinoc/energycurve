# Jordi, round 4: the transition table and the BPM margin (2026-09-16)

> "esto esta enfocado al tema de keys, la tablas con key y colores asignados y
> la otra es la tabla de mezclas armonicamente compatibles y como actuan que
> sensaciones aportan si dan energia o restan energia. creo que os puede ser
> util."

It is. Sections 2.1 (mapping + colours) and 2.2 (transitions) and 2.3 (BPM
margin) of the file he attached. 2.1 we had already taken in round 3 — the
colours ship in the transition view and his tonality errors were reported back
to him. **2.2 and 2.3 are new, and 2.2 is the most valuable thing he has sent
us.**

## We audited the table before believing it

He says it is the source of truth: "Sustituye cualquier heurística de
'distancia en el círculo Camelot' o regla de sentido horario/antihorario." That
is a large claim about a scoring input, so it was checked before it was
adopted. All four checks are now tests in `tests/harmonic-transitions.test.ts`.

| Check | Result |
|---|---|
| 24 rows, 8 columns, every cell a valid Camelot code | ✅ |
| 12 recommended targets per row, no key listed twice in a row | ✅ |
| Symmetric — if `X → Y` is recommended, `Y → X` is too | ✅ (all 288) |
| Every one of the 192 cells falls out of a single offset rule | ✅ |

The last one is what makes it trustworthy. The columns are not a taste
ranking, they are **the pitch shift of the tonic**, and every row is the same
move transposed:

| Column | From A minor | Shift |
|---|---|---|
| Perfect match | Am, G | same key, or one accidental away |
| Energy Boost + | C, Em | relative major, or up a fifth |
| Energy Boost ++ | Cm | +3 semitones |
| Energy Boost +++ | Bm, (A#m) | +2, second choice +1 |
| Energy Drop − | Dm | down a fifth |
| Energy Drop −− | F#m | −3 semitones |
| Energy Drop −−− | Gm, (G#m) | −2, second choice −1 |
| Mood change | A major | parallel major/minor |

So "+++ is a bigger boost than ++" is not arbitrary: a whole tone up lifts more
than a minor third, and the parenthesised second choice of each level is the
semitone version of the same idea. **Not one cell is wrong** — a better result
than his 2.1 table, where 10 of 24 tonality labels were off (reported to him in
round 3, and the colours were keyed by Camelot position so they were never
affected).

## What it cost us to be wrong

Our rule was: ±1 on the same ring or the relative major/minor is smooth, ±2 on
the same ring is a boost, **everything else clashes**. Against his table:

- **144 of the 288 recommended moves — exactly half — were reported as
  clashes.** Per row: the diagonal perfect match (`8A → 9B`, A minor into G
  major, one accidental apart), both ±3-semitone moves, both ±1-semitone
  moves, and the parallel major/minor.
- **0 moves we approved are rejected by the table.** It is a strict superset of
  what we already allowed.

That second number is what made this safe to ship: nobody loses a mix the
product had already blessed. A test asserts both numbers
(`never rejects a move the old rules accepted`, `rescues exactly half of the
wheel`), so a later edit to the table can't quietly narrow it.

The user-visible version of that bug: a DJ who put A minor into G major — one
of the most common moves in dance music — was told his keys clash, and the
reorder optimizer paid a full clash cost to avoid it. On a set of house
records that mostly sit within a few hours of each other, that is not a corner
case.

## What shipped

**The table is now the classifier** (`lib/music/harmonic-transitions.ts`,
transcribed literally, parentheses included, so it can be diffed against his
markdown by eye). `harmonicMoveBetween` is a lookup into it.

**`HARMONY_RULES_V4.tierCosts` is untouched**, and so is every other constant in
`lib/product/strategy.ts`. The eight columns map onto the four tiers the costs
were already written for:

| Table column | Tier | Cost |
|---|---|---|
| Perfect match (same key) | `perfect` | 0 |
| Perfect match (the diagonal) | `smooth` | 0 |
| Energy Boost +, Energy Drop − | `smooth` | 0 |
| Boost ++/+++, Drop −−/−−−, Mood change | `boost` | 0.5 |
| absent from the row | `clash` | 1 |

This does change what the optimizer returns — that is the point of adopting the
table, and it is the one thing on this page that deserves a second opinion
before release. It is a change to *which pairs are in which tier*, not to what
a tier costs.

**Direction now comes from the table, not the wheel.** Round 3 added
`direction` and derived it from signed wheel steps, which reported all 24
relative major/minor moves as directionless — `8A → 8B` travels zero hours. The
table calls it Energy Boost + one way and Energy Drop − the other, which is
what a DJ hears. Fixed.

**The move's own name is reported.** `RatedTransition.level` carries
`boost_2`, `mood`, … and `option` marks his parenthesised second choice. The
transitions list says "Energy Boost ++" or "Mood change" instead of one generic
"energy-boost jump" for all five of them — his vocabulary, kept in both
locales, because the notation is the notation.

**The ±7% BPM margin (2.3) is measured and reported, not scored.**
`tempoGap(from, to)` returns the signed gap as a share of the outgoing track's
BPM and whether it clears `HARMONIC_BPM_MARGIN = 0.07`. A transition past the
margin is listed even when the mix itself is good — labelled `Tempo`, not
`Rough`, because a perfect key match at a 10% tempo distance has exactly one
problem and it isn't the key.

Two deliberate calls inside that:

- **The constant is not in `lib/product/strategy.ts`.** That file holds the
  frozen constants the energy and reorder scores are computed from, and this
  changes no score. If we ever want a tempo gap to *downgrade* a verdict, that
  is a scoring decision and needs its own entry in `docs/decisions.md`.
- **Half- and double-time are matched, not flagged.** 174 into 87 is one beat
  against two. A margin that called every halftime mix impossible would be
  loudest in exactly the sets that do it on purpose. The margin then applies to
  the matched tempo, and the row says "at half time" so nothing is hidden.

`findBetterFit` also prefers a candidate inside the margin when two candidates
rate the same. It never overrides a verdict — proposing a track you cannot
beatmatch is not advice, but tempo is a property of the mix, not a ranking of
records.

## Measured cost

The reorder optimizer is O(n⁴) and capped at `REORDER_MAX_TRACKS = 80`. On an
80-track set with keys, the search is **~27% slower** than before (measured in
this container: 5.4s → 6.9s; the same box runs the pre-change code at 5.4s, and
the 1.4s in #224 was measured on a faster machine — treat the ratio, not the
absolute).

The cost is not lookup overhead: with keys removed, both versions run the same
(503ms vs 476ms, noise). It is the search finding more improving swaps, because
half the wheel stopped being a wall. A flat tier lane was tried to buy the time
back and measured identical to the plain lookup (749ms vs 759ms per 11.5M
calls), so it was removed rather than kept as unjustified cleverness.

If that 27% ever matters, the lever is `REORDER_MAX_TRACKS`, not the table.

## What we owe Jordi

1. **His 2.2 table is clean** — 192 cells, zero errors, and it exposed a bug
   that had half the Camelot wheel marked as a clash in a product he is paying
   attention to. Tell him plainly; he was right that it would be useful.
2. **His 2.1 tonality column is still wrong in the same 10 rows** (round 3),
   and he said he trained an AI on that file. Worth repeating once, kindly,
   because a wrong key name propagates further than a wrong colour.
3. **The NML test he hasn't run yet** ("el asunto de testear el archivo nml")
   is still open on his side. Nothing to do until he reports back.

## Not done, on purpose

- **No tempo gate on the verdict.** Reported only. See above.
- **No change to `lib/product/strategy.ts`.** Frozen, and nothing here needed
  it.
- **No colours outside the transition view.** The decision at
  `docs/decisions.md:445` still holds: a sortable key column with colours
  implies a harmonically optimal set.
