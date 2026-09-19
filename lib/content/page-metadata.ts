/**
 * Title and description per page, per language.
 *
 * These used to be string constants at the top of each page file, in English
 * only — which is how `/es` could have rendered a fully Spanish page under an
 * English `<title>`. Search results and link previews are built from exactly
 * these two strings, so a Spanish page with English metadata is a Spanish page
 * that looks English everywhere it matters.
 *
 * Both languages sit side by side here so a change to one that forgets the other
 * is visible in the diff rather than discovered in a SERP.
 */

import type { LocalizedPath } from "@/lib/content/locale-routing"
import type { SiteLocale } from "@/lib/content/site-copy"

interface PageMeta {
  title: Record<SiteLocale, string>
  description: Record<SiteLocale, string>
}

export const PAGE_METADATA: Record<LocalizedPath, PageMeta> = {
  "/": {
    title: {
      en: "EnergyCurve — DJ Set Energy Analysis & Track Order",
      es: "EnergyCurve — Análisis de energía y orden de tracks para DJs",
    },
    description: {
      en: "Analyze your DJ set's energy curve, score it 1–10, and get the exact track moves that fix it. Imports Rekordbox, Traktor, M3U8, and your own audio files — exports the corrected order back.",
      /**
       * 146 characters. The previous one was 227, which is roughly seventy past
       * where Google stops rendering a description — the Spanish snippet was
       * being cut mid-sentence, and the half that got cut was the half naming
       * the import formats. Fitting is the whole point; "curva de energía" is
       * kept because it is the phrase the page is trying to be found for.
       */
      es: "EnergyCurve analiza la curva de energía de tu set y te dice qué temas mover. Importa desde Rekordbox, Traktor o M3U8 y exporta el orden corregido.",
    },
  },
  "/pricing": {
    title: {
      en: "Pricing — Free, PRO US$9.99, PRO+ US$19.99",
      es: "Precios — Gratis, PRO u$s9,99, PRO+ u$s19,99",
    },
    description: {
      en: "EnergyCurve is free to use, with a free tier that stays free. PRO is US$9.99/month and PRO+ is US$19.99/month (US$99 / US$199 a year).",
      es: "EnergyCurve es gratis, y el plan gratuito seguirá siendo gratis. PRO cuesta u$s9,99 por mes y PRO+ u$s19,99 por mes (u$s99 / u$s199 al año).",
    },
  },
  "/install": {
    title: {
      en: "Install the app",
      es: "Instalar la app",
    },
    description: {
      en: "Add EnergyCurve to your home screen and use it like a native app — no app store required.",
      es: "Agregá EnergyCurve a tu pantalla de inicio y usala como una app nativa — sin pasar por ninguna tienda.",
    },
  },
  "/energy-tags": {
    title: {
      en: "Where to put your energy values",
      es: "Dónde poner la energía",
    },
    description: {
      en: "Which tag EnergyCurve reads a track's energy from, and in exactly which format — for Mixed In Key, Lexicon DJ, Serato, Rekordbox and hand-written tags.",
      es: "De qué tag lee EnergyCurve la energía de un track, y con qué formato exacto — para Mixed In Key, Lexicon DJ, Serato, Rekordbox y tags escritos a mano.",
    },
  },
  "/import-formats": {
    title: {
      en: "What we read from your files",
      es: "Qué leemos de tus archivos",
    },
    description: {
      en: "Which playlist formats EnergyCurve reads, what each one carries, and exactly which columns a CSV needs — for Rekordbox, Traktor, Lexicon and anything that exports a spreadsheet.",
      es: "Qué formatos de playlist lee EnergyCurve, qué trae cada uno, y exactamente qué columnas necesita un CSV — para Rekordbox, Traktor, Lexicon y cualquier cosa que exporte una planilla.",
    },
  },
  "/privacy": {
    title: {
      en: "Privacy Policy",
      es: "Política de privacidad",
    },
    description: {
      en: "What data EnergyCurve collects, why, and the choices you have.",
      es: "Qué datos recopila EnergyCurve, para qué, y qué opciones tenés.",
    },
  },
  "/terms": {
    title: {
      en: "Terms of Service",
      es: "Términos del servicio",
    },
    description: {
      en: "The terms that govern your use of EnergyCurve.",
      es: "Los términos que regulan tu uso de EnergyCurve.",
    },
  },
  /**
   * The tools hub. One tool today; the page exists so the second one has
   * somewhere to land, and so "free dj tools" has a page to match.
   */
  "/tools": {
    title: {
      en: "Free tools for DJs",
      es: "Herramientas gratis para DJs",
    },
    description: {
      en: "Free tools for preparing a DJ set: analyze the energy curve, score it, and find the jumps. No sign-up, and your files never leave the browser.",
      es: "Herramientas gratis para preparar un set: analizá la curva de energía, mirá el score y encontrá los saltos. Sin cuenta y sin subir tus archivos.",
    },
  },
  "/tools/energy-curve": {
    title: {
      en: "Energy curve analyzer — free, no sign-up",
      es: "Analizador de curva de energía — gratis, sin cuenta",
    },
    description: {
      en: "Load a Rekordbox, Traktor or M3U8 playlist and see your set energy curve scored 1 to 10. Free, no sign-up, and nothing ever leaves your browser.",
      es: "Subí tu playlist de Rekordbox, Traktor o M3U8 y mirá la curva de energía de tu set con un score de 1 a 10. Gratis, sin cuenta y sin subir archivos.",
    },
  },
  "/tools/camelot-wheel": {
    title: {
      en: "Camelot wheel — compatible keys",
      es: "Rueda Camelot — tonalidades compatibles",
    },
    description: {
      en: "Interactive Camelot wheel: pick a key and see what mixes with it and what each move does. Full table of Camelot, Open Key and musical notation.",
      es: "Rueda Camelot interactiva: elegí una tonalidad y mirá con cuáles mezcla y qué hace cada movimiento. Tabla completa Camelot, Open Key y notación musical.",
    },
  },
  "/tools/key-bpm-compatibility": {
    title: {
      en: "Key and BPM compatibility checker",
      es: "Compatibilidad de tonalidad y BPM",
    },
    description: {
      en: "Do these two tracks mix? Harmonic compatibility, BPM difference, half-time, and what key you land in once you pitch. Free, no account, no sign-up needed.",
      es: "¿Mezclan estos dos temas? Compatibilidad armónica, diferencia de BPM, half-time y en qué tonalidad queda el tema si ajustás el pitch. Gratis y sin cuenta.",
    },
  },
  "/blog": {
    /**
     * Not the bare word "Blog" in both languages: the locale test rejects a title
     * shared across languages, and it's right to — a page whose title is identical
     * in two languages is usually one that was never translated. A descriptive
     * title is better for a search result anyway.
     */
    title: {
      en: "Blog — reading a set before you play it",
      es: "Blog — leer un set antes de tocarlo",
    },
    description: {
      en: "How to read a set's energy before you play it: ordering, energy jumps, and what to do when your tracks carry no BPM or key.",
      es: "Cómo leer la energía de un set antes de tocarlo: orden, saltos de energía, y qué hacer cuando tus temas no traen BPM ni tonalidad.",
    },
  },
  "/glossary": {
    title: {
      en: "DJ glossary — 21 terms explained",
      es: "Glosario para DJs — 21 términos explicados",
    },
    description: {
      en: "Twenty-one words that come up while preparing a DJ set — energy curve, key, Camelot, phrasing, drop — each explained plainly with an example.",
      es: "Veintiún términos que aparecen al preparar un set — curva de energía, tonalidad, Camelot, phrasing, drop — explicados con un ejemplo concreto.",
    },
  },
  "/guide": {
    title: {
      en: "Guides to preparing a DJ set",
      es: "Guías para preparar un set",
    },
    description: {
      en: "Long-form guides on preparing a DJ set: reading an energy curve, ordering tracks, and deciding what to move before you play rather than after.",
      es: "Guías largas sobre preparar un set: leer una curva de energía, ordenar los temas y decidir qué mover antes de tocar y no después de haber tocado.",
    },
  },
  "/cookie-policy": {
    title: {
      en: "Cookie Policy",
      es: "Política de cookies",
    },
    description: {
      en: "How EnergyCurve uses cookies and similar storage.",
      es: "Cómo usa EnergyCurve las cookies y el almacenamiento similar.",
    },
  },
  "/subprocessors": {
    title: {
      en: "Subprocessors",
      es: "Sub-encargados",
    },
    description: {
      en: "Every third party that processes data on our behalf, what they do with it, and where they are.",
      es: "Cada tercero que trata datos por cuenta nuestra, qué hace con ellos y dónde está.",
    },
  },
}

export function pageMetadata(path: LocalizedPath, locale: SiteLocale) {
  const meta = PAGE_METADATA[path]
  return { title: meta.title[locale], description: meta.description[locale] }
}

/**
 * The day each page's content last actually changed — the sitemap's `lastmod`.
 *
 * Until now every fixed page reported `new Date()`, which is the build clock.
 * That is the same number for all sixteen of them and a different number on
 * every deploy, so it told a crawler that the whole site changes whenever
 * anything ships and that nothing in it is older than anything else. A `lastmod`
 * that moves for pages that did not move is not a weak signal, it is a wrong
 * one, and the documented response to an unreliable `lastmod` is to stop reading
 * it. The articles already did this properly — they report their own revision
 * date — and this is that idea applied to the pages.
 *
 * **Maintained by hand, and that is the design.** The obvious alternative is to
 * ask git at build time, and it does not work here: CI checks out with
 * `actions/checkout`'s default depth of 1, so the repository contains exactly
 * one commit and `git log -1 -- <file>` answers with that commit's date for
 * every file alike. Verified on a `--depth 1` clone on 19 Sep 2026: two files
 * changed months apart both reported the same timestamp. Deriving the date from
 * git would reproduce the bug this map exists to fix, while looking rigorous.
 *
 * Seeded from the full local history (the last commit touching each page's
 * component and copy file), so the dates here started out true rather than
 * guessed.
 *
 * **When you change a page's copy, change its date.** A date that is merely
 * stale is still honest — it says "not since then", which is the claim
 * `lastmod` makes. Dates share a value where pages genuinely changed together:
 * the four legal pages are one copy file and one edit.
 */
export const PAGE_LAST_MODIFIED: Record<LocalizedPath, string> = {
  "/": "2026-09-19",
  "/pricing": "2026-09-11",
  "/tools": "2026-09-19",
  "/tools/energy-curve": "2026-09-19",
  "/tools/camelot-wheel": "2026-09-17",
  "/tools/key-bpm-compatibility": "2026-09-17",
  "/blog": "2026-09-11",
  "/glossary": "2026-09-19",
  "/guide": "2026-09-19",
  "/install": "2026-08-18",
  "/energy-tags": "2026-09-07",
  "/import-formats": "2026-09-11",
  // One copy file, one edit: these four genuinely changed together.
  "/privacy": "2026-09-11",
  "/terms": "2026-09-11",
  "/cookie-policy": "2026-09-11",
  "/subprocessors": "2026-09-11",
}

/** The `lastmod` for one page, as a Date. */
export function pageLastModified(path: LocalizedPath): Date {
  return new Date(`${PAGE_LAST_MODIFIED[path]}T00:00:00Z`)
}
