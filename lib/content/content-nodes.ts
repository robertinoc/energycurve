/**
 * What a guide or a glossary entry is made of.
 *
 * The blog's articles are `.md` files and stay that way. Guides and glossary
 * entries can't be: they embed charts and tables that read from the engine, and
 * `lib/blog/markdown.ts` is a deliberately restricted parser that throws on
 * anything outside its subset — a React component in a `.md` is not a gap to be
 * worked around, it is the parser doing its job.
 *
 * So the prose stays markdown, parsed by that same restricted parser, and the
 * components sit *between* prose blocks as typed nodes rather than inside them.
 * One consequence worth stating: a component can't appear mid-paragraph. That is
 * a real limitation and an acceptable one — everything we want to embed is a
 * block anyway, and the alternative is an MDX toolchain and a second markdown
 * dialect to keep honest.
 *
 * Pure data. The renderer lives in `components/content/content-body.tsx`.
 */

import type { LocalizedPath } from "@/lib/content/locale-routing"
import type { SiteLocale } from "@/lib/content/site-copy"

/** Text in both languages. Spanish is written first; English is its translation. */
export type Bilingual = Record<SiteLocale, string>

/**
 * The five example curves.
 *
 * Shapes, not measurements: these are illustrations of a pattern, drawn from the
 * same 1–10 scale the engine scores on. Nothing here claims to be the average of
 * anything, because we have not measured that.
 */
export type CurveShape = "warm-up" | "peak" | "journey" | "closing" | "plana"

export interface FaqEntry {
  question: Bilingual
  answer: Bilingual
}

export interface StepEntry {
  title: Bilingual
  body: Bilingual
}

export interface ComparisonRow {
  label: Bilingual
  left: Bilingual
  right: Bilingual
}

export type ContentNode =
  /** Markdown, parsed by `lib/blog/markdown.ts`. Headings here are `##`/`###`. */
  | { kind: "prose"; markdown: Bilingual }
  /** An embedded curve chart with one line of explanation. */
  | { kind: "curva"; shape: CurveShape }
  /** The 1–10 scale, read from `lib/product/strategy.ts`. Takes no arguments on purpose. */
  | { kind: "escala" }
  /** Native `<details>` questions; the page's `FAQPage` schema is derived from these. */
  | { kind: "faq"; entries: FaqEntry[] }
  | { kind: "callout"; tone: "note" | "warning"; title: Bilingual; body: Bilingual }
  | { kind: "pasos"; steps: StepEntry[] }
  | {
      kind: "comparacion"
      caption: Bilingual
      leftHeading: Bilingual
      rightHeading: Bilingual
      rows: ComparisonRow[]
    }
  | { kind: "cta"; variant: "tool" | "signup" }

/**
 * A link out of a glossary entry or a guide.
 *
 * `path` is the page in the abstract — `/tools/energy-curve`, not
 * `/es/herramientas/curva-de-energia` — exactly as `PageShell` takes it, so the
 * Spanish URL is computed rather than written down twice.
 */
export interface ContentLink {
  path: LocalizedPath
  label: Bilingual
}

/** A link to one of the blog's articles, which live only in Spanish. */
export interface ArticleLink {
  slug: string
  label: Bilingual
}
