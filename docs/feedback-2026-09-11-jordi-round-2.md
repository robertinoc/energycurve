# Jordi, feedback round 2 (2026-09-11)

Second report from the alpha user whose first round produced PRs #173-#177.
Seven items. Four are worth building, two are answers rather than work, and one
needs no code at all.

Still open from round 1: **he has not yet re-tested the NML import into
Traktor.** "lo que no miré es si afecta importar el nml a traktor, la próxima
vez os confirmo." Do not treat that as closed.

---

## 1. No way to contact us from inside the app — SHIP (P0)

> "cread un perfil usuario donde poder ver datos personales y una opción para
> contacto y feedback, actualmente he de cerrar sesión, Log out para poder
> contactar, escribir este mensaje."

**Confirmed.** The contact form exists once, in
`components/marketing/landing-sections.tsx` → `LandingContactForm`, backed by
`app/api/contact/route.ts`. There is no dashboard equivalent and no account
page at all (`app/dashboard/` has playlists, library, shared — nothing else).

So an alpha user who finds a bug has to log out to report it. That is hostile to
the single behaviour we most want from the people using this now, and it is the
channel every other item on this list arrived through — which makes it the
first thing to fix, not the smallest.

**Scope:** `/dashboard/account` with email, current plan + the existing billing
portal link, and the contact form (reuse `LandingContactForm`, same endpoint).
The "datos personales" half is deliberately thin: there is no personal data
beyond email, plan and locale, and building a settings surface for its own sake
is premature. Locale and key notation already have controls where they are
used; do not duplicate them here.

Add the entry point to the dashboard nav, not buried in a menu.

## 2. CSV import — SHIP (P0, cheapest of the four)

> "he descargado en txt y csv y la verdad es que podríamos usar ese método para
> subir tracklist, a mi lexicon me da la opcion de crear ese csv, estableced una
> base, que datos son necesarios en el csv"

We export CSV and TXT; we import neither CSV nor our own CSV back.
`parse-import.ts` accepts M3U8, Rekordbox XML, Rekordbox TXT and Traktor NML.

**Why this is cheap:** `parse-rekordbox-txt.ts` already resolves columns by
**matching header labels** (`HEADER_FIELDS` with synonyms, `buildColumnIndex`)
rather than by fixed position. A CSV reader is that same resolver with a comma
delimiter and quote handling. Most of the work is already written.

**On "estableced una base" — the honest answer is that our own CSV export
already is the base**, and it is missing one column he named:

| column | in our CSV export | notes |
|---|---|---|
| Position / # | yes | optional on import; order is row order |
| Artist | yes | |
| Title | yes | |
| BPM | yes | |
| Key | yes | any notation — the parser normalises |
| Genre | yes | |
| Energy | yes | 1-10 |
| Time / duration | yes | `m:ss` or seconds |
| **Location / path** | **no** | **add it** — it is what makes a CSV round-trip to a native export |

So: add `Location` to `toCsv`, accept CSV on import with header-driven columns
and EN/ES synonyms, and document the schema on a public page the way
`/energy-tags` documents the energy tags. Round-tripping our own export is the
acceptance test.

## 3. Can't hand-move tracks after reordering — SHIP (P0 on value, biggest build)

> "una vez has reordenado esa opción desaparece, no permite mover las canciones
> … las canciones 10 y 17 tienen todo idéntico key energy, yo se que si pongo la
> 17 en el lugar de la 10, la 9 queda bien con la 17 y la 17 con la 11 hace
> mezcla apoteósica. y no he podido hacer ese movimiento"

**Confirmed.** `components/analysis/live-tracklist.tsx` has no drag support —
no `draggable`, no `onReorder`. `components/playlists/track-table.tsx` (the
playlist detail page) does. So the analysis screen, which is where you land
after reordering, is read-only: the DJ can see the result and cannot touch it.

**This is the most valuable item in the list**, and his reasoning is the
argument for it: two tracks with identical key and energy are interchangeable to
the engine and *not* interchangeable to him, because he knows how they mix. That
is exactly the knowledge the engine does not have and cannot get. A screen that
locks him out of applying it is a dead end in the core loop.

**Implementation.** Everything in the workbench is derived and nothing is
mutated:

```
originalIds → baseIds (smartOrder ?? originalIds) → deriveOrder(baseIds, fixes, applied) → order
```

Add manual moves as a fourth layer expressed in the **same** shape fixes
already use — `{trackId, toIndex}` operations — appended after `deriveOrder`
and applied with the existing `applyOperation` from `lib/engine/fixes.ts`:

```
order = applyOperations(deriveOrder(baseIds, fixes, applied), manualOps)
```

This composes with everything: applying or undoing a fix still works underneath
the manual moves, "Back to original" clears `manualOps` with the rest, and undo
is dropping the last operation. Do **not** freeze the derived order into a new
base on first drag — that would bake the fixes in and empty the decided strip.

The score recomputes from `order`, so a manual move that costs points shows the
cost immediately. That is a feature: he wants to make a move he knows is right
musically and see what it costs on the curve.

## 4. The curve's hover point is hard to see — SHIP (P0, smallest)

> "el punto que aparece en la curva es poco visible y me costo verlo y
> entenderlo"

**Confirmed, and he is right.** `components/playlists/set-curve.tsx:158-167`
draws the highlight as a **white ring, `r=6.5`, `strokeWidth=2`, `fill="none"`**
over data points of `r=3`-`3.5`, on a dark ground with a gradient area fill
underneath. It is a thin outline competing with everything behind it.

Cheap fixes, in order of payoff: fill the centre, add a dark halo ring so it
reads against the area fill, drop a vertical guide line to the axis, and show
the position number next to it. Minutes of work, and it makes the
drag-and-watch-the-curve interaction legible — which is the interaction he
called "super" and then couldn't follow.

## 5. PRO+, and "¿podría gestionar una lista de 30k?" — ANSWER, don't build

His reading is right about what PRO+ does: `global_library` and
`set_comparator` are both `shipped` (`lib/product/capabilities.ts`), and that is
the "une todas las listas … y no repetir" he read about. `residency_mode` is the
third piece.

**30k in one list: no, and it shouldn't be.** `IMPORT_MAX_TRACKS = 500`
(`app/dashboard/playlists/actions.ts`), and the product scores *a set* — a curve
over 30,000 tracks is not a set, it's a library. Raising the cap would not make
the answer better.

**30k across the library is a different question, and the honest answer is we
don't know.** `services/library-service.ts::getGlobalLibrary` selects every
track across every playlist with **no pagination**, so at that size it would hit
PostgREST's default row ceiling and truncate silently. That is a real scaling
gap; it is not a reason to promise anything.

AI ordering counts, for the "cuál es la diferencia" question:
FREE 1/month · PRO 3/month · PRO+ unlimited (`lib/product/plans.ts`).

## 6. "¿Ese tema está funcionando ya?" — answer honestly

AI ordering is shipped, and right now it **falls back to the heuristic order**
for reasons still being chased (see [[energycurve-open-threads]] — the banner
now names one of ten causes; nobody has clicked it in production yet). Tell him
it is built, tell him it is currently falling back, and don't sell it as
working. He is the kind of tester who will check.

## 7. Promo code — no code needed

`app/api/billing/checkout/route.ts:107` already sets
`allow_promotion_codes: true`. Create a coupon in the Stripe dashboard and send
him the code. Zero engineering.

---

## Order of work

1. **#4 curve point** — minutes, and it fixes the thing he found confusing in
   the interaction he liked most.
2. **#1 account + contact page** — it is the channel for everything else.
3. **#2 CSV import** — most of the parser already exists.
4. **#3 manual reorder on the analysis screen** — the real feature. Highest
   value, largest build, and worth doing properly rather than quickly.

Declined: a full account/settings surface (#1's second half), raising the
500-track cap (#5).
