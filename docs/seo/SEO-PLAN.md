# EnergyCurve — Modern SEO Plan (SEO · AEO · GEO · AIO · SXO)

**Version:** 1.0 — 2026-09-15
**Owner:** Robertino Calcaterra
**Asana:** [`EnergyCurve: 5. SEO Plan`](https://app.asana.com/1/1213619936526425/project/1218526835226034) (sections mirror the phases below)
**Execution:** each task is meant to be run by a Claude Code / Cowork session with this repo connected. Read §0 first.

---

## 0. How to use this document (read before executing anything)

1. **Repo rules come first.** `AGENTS.md` is the single source of agent instructions. The ones that bind this plan: `lib/seo.ts` is the **single SEO source** (no hand-written JSON-LD in pages; `FAQPage` must derive from the rendered copy); FAQ stays native `<details>`; StageLink LLC mentions are pinned by `tests/seo.test.ts` (EN+ES); pricing/plan copy pinned by `tests/pricing-copy.test.ts` and `tests/capabilities.test.ts`; the blog parser is restricted and **throws on unsupported markdown** (`tests/blog.test.ts`); `npx tsc --noEmit` is mandatory; Next.js 16 — read `node_modules/next/dist/docs` before using an API; no GPL/AGPL deps; **no invented numbers or accuracy claims in copy** ("say what isn't known"); keep `docs/*.md` updated. `e2e/public-surface.spec.ts` asserts hreflang, JSON-LD, sitemap and blog behaviours — extend it, don't break it.
2. **Known stale line:** `AGENTS.md` says "Paid offers stay PreOrder" but `lib/seo.ts` ships `InStock` (checkout is live). Fix `AGENTS.md` in the first PR you open (SEO-E06).
3. **Where SEO lives:** `lib/seo.ts` (SITE_URL, `marketingMetadata`, `buildAlternates`, structured-data builders, `SEO_KEYWORDS`, `OPERATING_COMPANY`), `lib/content/page-metadata.ts` (10 localized paths), `lib/content/locale-routing.ts`, `lib/content/site-copy.ts` (FAQ 11 items), `lib/blog/posts.ts` + `lib/blog/markdown.ts`, `content/blog/{locale}/*.md`, `app/sitemap.ts`, `app/robots.ts`, `app/opengraph-image.tsx`. Existing baseline: `docs/seo-aeo-baseline-2026-08.md` (12 Aug 2026), `docs/brand-name-collision.md`, `docs/roadmap-status.md` §"Content, SEO & AEO", `docs/launch-checklist.md` row 9 (GSC).
4. **Positioning (from `docs/product-strategy-v2.md`, do not drift):** "the DJ set copilot". *Mixed In Key tells you what each track is. EnergyCurve tells you what your SET is — and how to make it hit harder.* ICP: DJs, especially warm-up/opening DJs; producers/performers. Competitors: Mixed In Key, Lexicon, Mixo, DJ.Studio, rekordbox; SEO rivals: SetFlow, Mixgraph, HarmonySet, Phaso. Brand collision with `energycurve.com` (agritech): keep the name, **always ship the "DJ" disambiguator** in titles/descriptions.
5. **Language:** EN is the global default (`/`), ES under `/es/*` (rioplatense voseo per `content/blog/README.md`, vocabulary: *tonalidad, temas, librería, toque*). Blog was deliberately Spanish-first; this plan adds English. Code, docs, PR titles, Asana: English.
6. **Definition of done:** PR merged to `main` and deployed **and** the live URL verified. Tests (`vitest`) + `tsc` green; `e2e/public-surface.spec.ts` extended when a public surface changes.
7. One PR per task ID (`SEO-E##`) referenced in the PR title and in the Asana task when closing.

---

## 1. Status report (audit 2026-09-15)

### 1.1 Baseline
- `docs/seo-aeo-baseline-2026-08.md` (12 Aug): **0/10 target queries**, domain **not indexed**. Re-measure was due ~Sep 2026 — **not done**.
- **Search Console never claimed** (`GOOGLE_SITE_VERIFICATION` unset; `docs/launch-checklist.md` #9 "code ready, domain not claimed"). There is **zero search data** since launch. This is the single biggest gap.
- Analytics: PostHog client (consent-gated, manual pageview with URL redaction) + server. No GA.

### 1.2 What is already good
| Area | State |
|---|---|
| Metadata | `metadataBase`, default title "EnergyCurve — DJ Set Energy Analysis & Track Order", template `%s \| EnergyCurve`, robots `max-image-preview:large`, per-page EN+ES titles/descriptions for 10 paths, self-canonical per locale, hreflang `en`/`es`/`x-default→en`, OG `en_US`/`es_LA`, generated 1200×630 OG image (root only) ✅ |
| JSON-LD | Landing (EN+ES): `Organization` (parent StageLink LLC), `SoftwareApplication` with 3 `Offer`s, `FAQPage` from 11 rendered Q&As. Pricing: `Product` + `AggregateOffer`, `BreadcrumbList` ✅ |
| Sitemap / robots | 10 paths × 2 locales with `alternates.languages` + 5 ES articles (**25 URLs live, matches repo**). Robots disallows `/api/`, `/dashboard`, `/backstage`, auth pages; `Sitemap` + `Host` ✅. Backstage host `X-Robots-Tag: noindex` ✅ |
| Reference pages | `/energy-tags` (tag formats for Mixed In Key / Lexicon / Serato / Rekordbox) and `/import-formats` (CSV/NML/XML/M3U8 spec) — data-driven, EN+ES, exactly the pages DJs search for ✅ |
| Perf / a11y | `next/font/google` (Manrope, Space Grotesk, Space Mono), SVG/CSS hero, security headers, axe WCAG 2.1 AA e2e on 17 public pages, one-H1 check ✅ |
| Live = repo | Deployed HEAD matches; robots, sitemap, canonical, OG all confirmed live ✅ |

### 1.3 Gaps found
| # | Gap | Evidence |
|---|---|---|
| 1 | **GSC never claimed**; no Bing either. | `app/layout.tsx` `verification.google` env unset |
| 2 | **Zero English content**: `content/blog/en/` does not exist; `/blog` is an empty state pointing to `/es/blog`. Every EN target query (baseline Q1, Q4: "DJ set energy curve", "analyze DJ setlist energy") has nothing to rank. | `content/blog/`, `app/blog/page.tsx` |
| 3 | Blog posts have **no `Article`/`BlogPosting` JSON-LD, no author, no `dateModified`, no per-post OG image**. Frontmatter schema has no author/updated/image fields. | `app/*/blog/[slug]/page.tsx`, `lib/blog/posts.ts` |
| 4 | **No internal linking**: each post's only link is an absolute `https://energycurve.app/es` CTA; no related posts; `/energy-tags` and `/import-formats` are **not in nav or footer** (near-orphans). | `components/marketing/blog-article.tsx`, `landing-sections.tsx:780-800` |
| 5 | **5 thin ES posts** (430–580 words), all dated 2026-08-20, none since; `changeFrequency: yearly`. | `content/blog/es/` |
| 6 | **`www.energycurve.app` serves 200 duplicate** — no 301 to apex. | live check; `next.config.ts` has no redirects |
| 7 | **`<html lang="en">` hardcoded** — `/es/*` server HTML says English, fixed client-side (deliberate for static rendering, but a crawler sees `en`). | `app/layout.tsx`, `docs/roadmap-status.md` ~L290 |
| 8 | No `FAQPage`/`HowTo`/`TechArticle` schema on `/install`, `/energy-tags`, `/import-formats`, `/blog`. | grep `ld+json` → 4 files |
| 9 | Sitemap `lastModified = new Date()` for all pages → identical timestamp per request; posts lack `updatedAt`. | `app/sitemap.ts` |
| 10 | `og:locale` inconsistent (`es_AR` on posts vs `es_LA` on pages); `SEO_KEYWORDS` EN-only on `/es`; competitors untracked. | `lib/seo.ts`, blog pages |

### 1.4 Verdict
EnergyCurve has a **clean, tested SEO foundation and near-zero content and zero measurement**. Nothing can be optimised until Search Console exists. After that, the work is almost entirely **content + linking**: English articles for the category queries the product coined ("set energy curve", "energy flow", "opening DJ set order"), longer Spanish posts, schema on articles, and turning the two reference pages into the link hubs they already deserve to be. The brand collision with energycurve.com makes the "DJ" disambiguator and an `Organization` entity with `sameAs` unusually important.

---

## 2. Strategy brief

**Objective (90 days, to 15 Dec 2026):** GSC live with ≥30 indexed URLs; **≥6 of 10 baseline queries with an EnergyCurve URL in the top 20**; **≥150 non-brand organic clicks/month** (EN+ES); EnergyCurve cited in ≥3 of 10 AI prompts ("how to order a DJ set by energy", "DJ set energy analyzer", "cómo ordenar un set de DJ", …).

**One idea:** *Define the category in English, own it in Spanish.* Nobody ranks for "DJ set energy curve/flow analysis" yet (baseline). Publish the definitional content (what an energy curve is, how to read a set's energy arc, how much energy jump is too much) with the product's honest vocabulary, link it densely to `/energy-tags`, `/import-formats` and `/pricing`, and let the `SoftwareApplication` + `Organization` entity connect the brand to the category.

| Discipline | What it means for EnergyCurve | Phase |
|---|---|---|
| **SEO** | GSC/Bing, www→apex 301, EN blog, longer ES posts, internal links, reference pages in nav, real `lastmod` | 0, 1, 2 |
| **AEO** | `Article` + `FAQPage` on posts, `TechArticle`/`FAQPage` on `/energy-tags` & `/import-formats`, `HowTo` on `/install`, definition in first 60 words of every post | 1, 3 |
| **GEO** | `Organization.sameAs` (Product Hunt, AlternativeTo, Crunchbase, X/Instagram, StageLink), comparison pages vs Mixed In Key / DJ.Studio / SetFlow, mentions in DJ media & communities | 4 |
| **AIO** | Monthly 10-prompt AI-visibility run; `llms.txt`; comparison pages for "X vs Y" prompts | 0, 4 |
| **SXO** | `/energy-tags` & `/import-formats` → "Import your playlist" CTA with PostHog event; blog → signup; LHCI budgets | 5 |

---

## 3. Phased action plan

Task ID `SEO-E##`. Effort: S ≤ 2h · M ≤ 1 day · L ≤ 3 days. Tags: `[code]` · `[content]` · `[external]`.

### Phase 0 — Claim measurement (week of 21 Sep) — do this first, nothing else matters until it is done
| ID | Task | Tag | Effort | Acceptance |
|---|---|---|---|---|
| SEO-E01 | **Claim Search Console** for `energycurve.app` (Domain property via DNS TXT at the registrar; fallback: set `GOOGLE_SITE_VERIFICATION` in Vercel prod so `app/layout.tsx` emits the meta). Submit `/sitemap.xml`. Request indexing for `/`, `/es`, `/pricing`, `/es/pricing`, `/energy-tags`, `/import-formats`, `/es/blog` + 5 posts. | external | S | Property verified; sitemap "Success"; 13 URLs requested |
| SEO-E02 | Bing Webmaster Tools (import from GSC), submit sitemap. | external | S | Verified |
| SEO-E03 | **Re-run the baseline** (`docs/seo-aeo-baseline-2026-08.md` method) → `docs/seo-aeo-baseline-2026-09.md`: 10 target queries, indexed status, competitor URLs (SetFlow, Mixgraph, HarmonySet, Phaso, DJ.Studio) ranking for each. | external | M | Dated file committed |
| SEO-E04 | **AI-visibility tracker** `docs/seo/ai-visibility.md`: 10 prompts (5 EN: "how to order a DJ set by energy", "tool to analyze DJ set energy", "DJ set energy curve", "opening DJ set structure", "Mixed In Key alternative for set structure"; 5 ES equivalents). Engines: ChatGPT, Perplexity, Google AI Overviews/AI Mode, Claude, Gemini. | external | S | 10 × 5 table |
| SEO-E05 | Keyword map without paid tools: GSC (once data arrives), Google/YouTube autocomplete, r/DJs & r/Beatmatch questions, DJ TechTools / Digital DJ Tips comment threads → `docs/seo/keyword-map.md` grouped EN/ES × intent (learn / compare / import / tool). | external | M | ≥60 queries mapped |
| SEO-E06 | Fix stale `AGENTS.md` line (PreOrder → InStock reality) and add a `## SEO` pointer to this plan in `AGENTS.md` + `docs/roadmap-status.md`. | code | S | PR merged |

### Phase 1 — Technical fixes (weeks of 28 Sep – 5 Oct)
| ID | Task | Tag | Effort | Acceptance |
|---|---|---|---|---|
| SEO-E07 | **301 `www.energycurve.app` → `energycurve.app`** (Vercel domain redirect; also add `redirects()` in `next.config.ts` as belt-and-braces with `has: [{type:"host", value:"www.energycurve.app"}]`). | code + external | S | `curl -I https://www.energycurve.app/` → 301 |
| SEO-E08 | **Server-side `<html lang>`**: make `app/layout.tsx` locale-aware (`app/es/layout.tsx` wrapper or read the pathname via a segment param) so `/es/*` ships `lang="es"` in HTML without losing static rendering. Update the note in `docs/roadmap-status.md`. Add e2e assertion. | code | M | View-source `/es` → `<html lang="es">`; build still static |
| SEO-E09 | Sitemap: real `lastModified` per page (a `LAST_MODIFIED` map in `lib/content/page-metadata.ts` updated when copy changes, or git-derived at build), `changeFrequency: monthly` for blog posts, add `updatedAt` support. Add `x-default` to sitemap alternates for parity with `<head>`. | code | S | No two static pages share a timestamp unless truly unchanged |
| SEO-E10 | Unify `og:locale` to one value for ES (`es_AR` everywhere is the honest choice given the voseo copy — decide once, pin with a test). Add ES `SEO_KEYWORDS` (or drop keywords entirely — they carry no ranking weight; document the decision). | code | S | Consistent across pages and posts |
| SEO-E11 | Nav/footer: add `/energy-tags` and `/import-formats` to the footer "Resources" block and to the landing "How it works" import step (`landing-sections.tsx`). | code | S | Both pages have ≥3 inbound internal links |

### Phase 2 — Content: English launch + Spanish depth (weeks of 5 Oct – 16 Nov)
| ID | Task | Tag | Effort | Acceptance |
|---|---|---|---|---|
| SEO-E12 | **Blog model upgrade** (`lib/blog/posts.ts`): add optional frontmatter `updatedAt`, `author` (name + url), `translationOf` (slug in the other locale), `tags`, `image`. Keep the strict parser; extend `tests/blog.test.ts`. Emit hreflang between translated pairs (`alternates.languages`) only when `translationOf` resolves. | code | M | Tests green; a translated pair shows hreflang both ways |
| SEO-E13 | **English cornerstone set (6 posts, 1,000–1,400 words each)**, one per week, mapped to baseline gaps: (1) *What is a DJ set energy curve (and why it matters more than BPM)*, (2) *How to order a DJ set by energy: the warm-up DJ's guide*, (3) *How much energy jump is too much between tracks?*, (4) *Analyze your set before you play it, not after*, (5) *Your tracks have no BPM or key — here's how to still plan the set*, (6) *Rekordbox / Serato / Traktor: where each tool stores energy tags* (links `/energy-tags`). Rules: definition in first 60 words, native `<details>` FAQ (3 Q) → `FAQPage`, ≥3 internal links (`/energy-tags`, `/import-formats`, `/pricing`, sibling), **no accuracy claims**, "DJ" in title. | content | L | 6 EN posts live; `/blog` no longer an empty state |
| SEO-E14 | **Translate the 5 ES posts to EN** and set `translationOf` both ways; **expand each ES post to ≥900 words** with an FAQ and internal links (keep voseo and vocabulary rules). | content | L | 5 pairs with hreflang; ES posts ≥900 words |
| SEO-E15 | **Related posts + in-article links**: `blog-article.tsx` renders 3 related posts (same locale, by tags) and a contextual CTA to `/import-formats` ("Import your playlist") using `next/link` (not absolute URLs). | code | M | Every post has ≥4 internal links out, ≥2 in |
| SEO-E16 | Blog index (`/blog`, `/es/blog`): add tag filters, short intro paragraph (what the blog covers, for whom), `Blog` JSON-LD with `blogPost` list. | code | S | Indexable intro copy; schema valid |

### Phase 3 — AEO: schema everywhere a question is answered (weeks of 19 Oct – 9 Nov)
| ID | Task | Tag | Effort | Acceptance |
|---|---|---|---|---|
| SEO-E17 | `BlogPosting` JSON-LD on every post via a new `buildArticleStructuredData()` in `lib/seo.ts` (headline, description, author `Person`, `datePublished`, `dateModified`, `inLanguage`, `publisher` = Organization, `mainEntityOfPage`, `image` = per-post OG). Add `BreadcrumbList` (Home → Blog → Post). | code | M | Rich Results Test valid on 3 posts; e2e asserts presence |
| SEO-E18 | **Per-post OG image**: `app/blog/[slug]/opengraph-image.tsx` (+ ES) rendering title + "DJ set energy" tagline on brand colours. | code | S | Post shares show a unique card |
| SEO-E19 | `/energy-tags` and `/import-formats`: `TechArticle` + `FAQPage` (add a 4-Q native `<details>` FAQ to each page's copy first, then derive schema). | code + content | M | Both valid in Rich Results Test |
| SEO-E20 | `/install`: `HowTo` schema derived from the rendered Android/iOS steps + `FAQPage` (3 Q: works offline? iOS? updates?). | code | S | Valid HowTo |
| SEO-E21 | Landing FAQ review: rewrite the 11 answers so each starts with a one-sentence direct answer (AI Overviews quote the first sentence); keep them true to `tests/seo.test.ts` pins. | content | S | Every answer's first sentence stands alone |

### Phase 4 — GEO / AIO: entity, comparisons, mentions (weeks of 2 Nov – 7 Dec)
| ID | Task | Tag | Effort | Acceptance |
|---|---|---|---|---|
| SEO-E22 | **Entity consistency**: same name ("EnergyCurve — DJ set copilot"), description, logo on Product Hunt, AlternativeTo (alternatives to Mixed In Key / DJ.Studio), Crunchbase (under StageLink LLC), X/Instagram/TikTok, Wikidata item; add all to `Organization.sameAs` in `lib/seo.ts`. Add `alternateName: "EnergyCurve DJ"` to fight the agritech collision. | external + code | M | ≥6 profiles; sameAs updated |
| SEO-E23 | **Comparison pages** `/compare/{mixed-in-key,dj-studio,setflow,lexicon}` (+ `/es/…`): factual feature table (what each analyses: track vs set; inputs; price if public; offline), honest "when to use which", FAQ. **No superiority claims without evidence.** Build as a content registry + `lib/seo.ts` builder (`WebPage` + `FAQPage`), add to `LOCALIZED_PATHS`, sitemap, footer. | code + content | L | 4 pages × 2 locales live and indexed |
| SEO-E24 | `llms.txt` route (`app/llms.txt/route.ts`): what EnergyCurve is (with the Mixed In Key contrast line), pricing, the 2 reference pages, cornerstone posts, comparisons, company. | code | S | Live |
| SEO-E25 | **Mentions program** (Claude drafts, Robertino approves every text before sending): pitch 1 guest post/month to DJ TechTools, Digital DJ Tips, We Are Crossfader, Mixmag Lab-style blogs (EN) and *DJ Mag ES* / *Vicious Magazine* (ES); answer 4 threads/month on r/DJs, r/Beatmatch, r/DJs ES groups; log in `docs/seo/mentions-log.md`. | external | ongoing | ≥3 earned mentions by 7 Dec |
| SEO-E26 | Cross-link from StageLink: footer/resources link on stagelink.art to EnergyCurve (same operating company — legitimate, disclosed) and a StageLink blog post "how DJs plan sets". | external | S | Link live |
| SEO-E27 | Monthly AI-visibility run (SEO-E04) + GSC review, first Monday; 10-line note in Asana. | external | S/month | 3 dated runs |

### Phase 5 — SXO & guardrails (weeks of 23 Nov – 15 Dec)
| ID | Task | Tag | Effort | Acceptance |
|---|---|---|---|---|
| SEO-E28 | Conversion paths from content: on `/energy-tags`, `/import-formats` and every post, a contextual CTA "Import this playlist → free analysis" with PostHog event `content_cta_click` (props: page, locale). Mark `signup_completed`, `first_analysis` as key events; build funnel "organic → first analysis". | code | M | Funnel visible |
| SEO-E29 | **Lighthouse CI** in GitHub Actions for `/`, `/es`, `/pricing`, one post: LCP ≤ 2.5s, CLS ≤ 0.1, TBT ≤ 200ms mobile. Reuse `docs/qa/performance-baseline-2026-09.md` numbers as the starting budget. | code | M | CI fails on regression |
| SEO-E30 | Extend `e2e/accessibility.spec.ts` to `/energy-tags`, `/import-formats`, one blog article (EN + ES). | code | S | Green |
| SEO-E31 | Weekly PSI API log for 6 URLs → `docs/seo/cwv-log.md`. | external | S | 4 rows |

---

## 4. KPIs and review cadence

| KPI | Baseline (Sep 2026) | Target 15 Dec 2026 | Source |
|---|---|---|---|
| GSC property live / indexed URLs | none / unknown (not indexed in Aug) | ≥30 indexed | GSC |
| Baseline queries with an EnergyCurve URL in top 20 (of 10) | 0 | ≥6 | `docs/seo-aeo-baseline-2026-09.md` re-run in Dec |
| Non-brand organic clicks / month | 0 | ≥150 | GSC |
| AI prompts citing EnergyCurve (of 10) | 0 (to confirm) | ≥3 | `docs/seo/ai-visibility.md` |
| Blog posts live | 5 ES / 0 EN | ≥10 ES / ≥11 EN | sitemap |
| Public URLs with valid JSON-LD | 4 | 100% | Rich Results Test |
| Organic → first analysis | unknown | measured, ≥25 | PostHog |

Review: monthly (first Monday), 10-line note in Asana.

---

## 5. Asana plan

**Project:** `EnergyCurve: 5. SEO Plan` · owner Robertino · list view.
**Sections** = Phase 0 … Phase 5. **Tasks** = one per `SEO-E##`, title `SEO-E## — <task name> [tag]`, description = Task + Acceptance. Due dates = end of phase window. Milestone task per phase ("Phase N verified live").

---

## 6. Constraints for the execution session
- Never invent numbers, accuracy claims or "X% better" copy — repo rule and brand rule.
- All JSON-LD through `lib/seo.ts` builders + `serializeStructuredData`; FAQ schema derives from rendered `<details>` copy.
- Do not break `tests/seo.test.ts` pins (StageLink LLC mentions EN+ES) or `tests/pricing-copy.test.ts`.
- Blog markdown must pass the restricted parser — validate with `npm test` before committing content.
- Never send pitches/DMs on Robertino's behalf without his explicit OK on the exact text.
- Keep the "DJ" disambiguator in every title/description (brand collision).
