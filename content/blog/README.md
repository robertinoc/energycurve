# Blog articles

Five Spanish articles, live since 20 Aug 2026 at `/es/blog` (the EN index at
`/blog` shows an honest empty state until English articles exist). The
where-does-the-blog-live decision landed on **same repo**: routes in `app/blog/`
and `app/es/blog/`, pipeline in `lib/blog/`, chrome copy in
`lib/content/blog-copy.ts`, and a deliberately restricted markdown renderer that
throws on syntax it doesn't support — so a new article using anything fancier
fails `tests/blog.test.ts` instead of rendering broken.

To add an article: drop a `.md` file in `es/` whose filename equals its `slug`
and fill the frontmatter; it appears in the index, the sitemap, and its own
route on the next build. An article with `publishedAt: null` stays a draft.

## Why Spanish first

`docs/seo-aeo-baseline-2026-08.md` measured ten target queries and found us on zero
of them. Two of those queries were in Spanish, and they are the only two where
**no product ranks at all** — the results are Vice ES, a DJ school's blog, and, on
one query, Wikipedia stubs. English is defended by DJ.Studio, SetFlow, Mixgraph and
Mixed In Key. Spanish is not defended by anyone.

## Why these five

Each one targets a gap the baseline identified as empty, not a keyword picked for
volume:

| File | Gap it targets |
|---|---|
| `esta-bien-el-orden-de-mi-set.md` | Gap 1 — everything ranking is prescriptive ("how to build an arc"); nobody answers "is the order I already have any good?" |
| `antes-de-tocar-no-despues.md` | Gap 2 — Phaso does energy arcs from recordings, after the gig. Nobody owns "before you play". |
| `tus-temas-no-tienen-bpm-ni-tonalidad.md` | Gap 3 — every guide assumes clean metadata. The one FAQ entry with no competing answer anywhere. |
| `cuanto-es-mucho-salto-de-energia.md` | Gap 4 — competitors give prose rules of thumb; nobody flags the jumps in *your* playlist. |
| `ordenar-un-set-desde-una-lista-de-texto.md` | Gap 5 — all competitor content assumes you own Rekordbox or Serato. |

## Vocabulary

The baseline's correction, applied throughout: **tonalidad** (not "key"), **temas**
(not "tracks", though DJs use both and the articles mix them the way people
actually speak), **librería**, **preparar un set**, **toque** or **fecha** (not
"gig"). Voseo, because the product's Spanish already uses it and switching register
mid-funnel reads as machine translation.

## What is deliberately not in them

No invented numbers, no fabricated user counts, and no accuracy claims. Key
detection sits at 21% against tags of unverified provenance and Energy Model v3 has
no fitted coefficients yet, so nothing here promises either. Where an article
touches a capability that isn't finished, it says so.
