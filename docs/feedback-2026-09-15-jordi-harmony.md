# Jordi, round 3: harmony in the reorder (2026-09-15)

> "el reordenamiento sigue el valor energia, pero respeta la mezcla
> armónicamente compatible? Han tenido en cuenta el Energy Boost y Drop?"

Fair question, and the answer is "yes, except in the one place he is actually
hitting."

## What the code does today

**The local reorder engine weighs harmony.** `lib/engine/reorder.ts::optimizeOrder`
scores candidate orders with `REORDER_HARMONY_V4.harmonyWeight = 2.0` on top of
the energy objective, using `HARMONY_RULES_V4.tierCosts` (perfect 0, smooth 0,
boost 0.5, clash 1). It only engages when `harmonyApplies()` passes —
`minKeyCoverage = 0.5`, so at least half the transitions need a readable key on
both sides. That is the engine behind the fixes and recommendations, and it is
FREE.

**The AI ordering asks for it too** — the system prompt in the smart-order route
explicitly says to maximise harmonically compatible consecutive transitions.

**The smart-order FALLBACK does not.** `heuristicOrder()` in
`app/api/playlists/[id]/smart-order/route.ts` is a pure ascending-energy sort
with two breathers spliced in. No key is read at all.

That last one is the whole answer to his question, because **the AI path is
currently falling back** (see [[energycurve-open-threads]]). So the order he is
looking at when he asks "does it respect harmony?" is the one order in the
product that doesn't.

## Gap 1 — the fallback ignores an optimizer we already have — SHIP

`optimizeOrder` exists, is tested, weighs harmony, and degrades safely when key
coverage is thin. The fallback should call it instead of sorting by energy. The
inconsistency has no upside: two reorder paths, one harmonic and one not, and
the naive one is the one that runs when the other fails.

Not a new scoring rule — it is reusing the existing one in a place that skipped
it, so `lib/product/strategy.ts` stays frozen.

## Gap 2 — boost and drop are the same thing to us — SHIP (carefully)

`harmonicTier` computes `wheelDistance` as `Math.min` of both directions, so
`8A → 10A` and `10A → 8A` both return `boost`. The product cannot tell a DJ
whether a jump lifts or releases. The copy shows it: `tierBoost` reads
"energy-boost jump" / "salto de energía" for both.

His question names exactly this.

**Constraint:** AGENTS.md freezes the scoring constants. So add *direction* as
reported information without touching `tierCosts` — the optimizer's objective
stays byte-identical, while `rateTransitions` and the transition list can say
"boost" vs "drop". Behaviour unchanged, vocabulary corrected.

If we later decide a drop should cost differently from a boost, that is a
scoring change and needs its own decision, not a side effect of this one.

## Gap 3 — key colours — ROBERTINO'S CALL, not a silent change

He sent hex colours per key. There is a documented decision against colouring:

> `docs/decisions.md:445` — Camelot is shown **without** harmonic coloring on
> purpose: sorting by key would line the colors up and imply a "harmonically
> optimal" set, which is false.

The reasoning still holds for the sortable Camelot column. A narrower version
that doesn't contradict it: colour in the *transition* view, where adjacency is
the subject and sorting isn't possible. Worth deciding deliberately.

## His table has 10 wrong rows — tell him

Audited all 24 rows against our implementation:

- **Open Key column: 24/24 correct.**
- **Tonality column: 14/24.** Rows `3A` through `7B` carry the tonality that
  belongs two wheel positions later (`3A` is labelled C Minor, which is 5A;
  `6A` is labelled A Minor, which is 8A).

The proof needs no trust in our code — **his own table contradicts its own
closing note.** It says "No existen posiciones duplicadas: 24 claves, 24 filas",
and it lists A Minor at 6A *and* 8A, C Major at 6B *and* 8B, E Minor at 7A *and*
9A, G Major at 7B *and* 9B.

He says he used this file to train an AI, so 10 of 24 keys went in wrong. This
is the most useful thing we can give him back.
