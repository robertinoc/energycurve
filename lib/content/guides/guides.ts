/**
 * The long-form guides, and the one draft that exists to prove the machinery.
 *
 * A guide is a list of sections; a section is a heading plus content nodes (see
 * `lib/content/content-nodes.ts`). The table of contents, the anchors, the
 * reading time and the `Article` schema are all derived from that structure
 * rather than written down beside it, so they cannot disagree with the page.
 *
 * ## `draft`
 *
 * `NOINDEX_PAGES` in `lib/content/locale-routing.ts` is typed over
 * `LocalizedPath`, which a `[slug]` route is not — so a draft guide cannot be
 * listed there. The flag travels with the guide instead, and it has to produce
 * all three consequences on its own: a `noindex` directive, absence from the
 * sitemap, and absence from the index. Two out of three is a draft that is
 * quietly published, so `tests/content-seo.test.ts` asserts all three.
 */

import type {
  ArticleLink,
  Bilingual,
  ContentLink,
  ContentNode,
} from "@/lib/content/content-nodes"
import type { SiteLocale } from "@/lib/content/site-copy"

export interface GuideSection {
  /** The anchor. Stable across languages, so a shared link survives a toggle. */
  id: string
  heading: Bilingual
  nodes: ContentNode[]
}

export interface Guide {
  id: string
  slug: Record<SiteLocale, string>
  title: Bilingual
  /** 140–155 characters, enforced by test. */
  description: Bilingual
  /** The standfirst, above the table of contents. */
  summary: Bilingual
  /** ISO date. Rendered as "updated on", and fed to `Article.dateModified`. */
  updatedAt: string
  /** Not indexable, not in the sitemap, not in the index. See the note above. */
  draft?: boolean
  sections: GuideSection[]
  related?: ContentLink[]
  articles?: ArticleLink[]
}

/**
 * A draft that uses every component once, so they can be reviewed on a real
 * page rather than in isolation. It is not a guide anybody should read: the
 * first real guide is Robertino's to write.
 */
const COMPONENT_PROOF: Guide = {
  id: "componentes",
  slug: { es: "componentes", en: "components" },
  draft: true,
  updatedAt: "2026-09-18",
  title: {
    es: "Borrador: todos los componentes en una página",
    en: "Draft: every component on one page",
  },
  description: {
    es: "Página borrador, fuera del índice y fuera del sitemap, que existe sólo para poder revisar cómo se ven juntos los componentes de las guías del sitio.",
    en: "A draft page, kept out of the index and out of the sitemap, that exists only so the building blocks of the site's guides can be reviewed together.",
  },
  summary: {
    es: "Esta página no es una guía: es el borrador donde se revisan los componentes. Si llegaste acá desde una búsqueda, algo salió mal — avisanos.",
    en: "This page is not a guide: it is the draft where the components get reviewed. If you arrived here from a search, something went wrong — tell us.",
  },
  sections: [
    {
      id: "prosa",
      heading: { es: "Prosa y enlaces", en: "Prose and links" },
      nodes: [
        {
          kind: "prose",
          markdown: {
            es: `El cuerpo de una guía es markdown, parseado por el mismo parser restringido que usan los artículos del blog. Eso quiere decir que soporta **negrita**, *cursiva*, [enlaces](/es/glosario), listas y tablas, y que **falla** ante cualquier otra cosa en vez de adivinar.

Los términos del glosario se enlazan con un componente propio, que además muestra la definición corta al pasar por encima o al llegar con el teclado.`,
            en: `A guide's body is markdown, parsed by the same restricted parser the blog's articles use. That means it supports **bold**, *italics*, [links](/glossary), lists and tables, and that it **fails** on anything else rather than guessing.

Glossary terms are linked with a component of their own, which also shows the short definition on hover or when you reach it with the keyboard.`,
          },
        },
      ],
    },
    {
      id: "curvas",
      heading: { es: "Curvas de ejemplo", en: "Example curves" },
      nodes: [
        {
          kind: "prose",
          markdown: {
            es: `Dos curvas seguidas, para confirmar que varias en la misma página no rompen el layout en un teléfono.`,
            en: `Two curves in a row, to confirm that several on one page do not break the layout on a phone.`,
          },
        },
        { kind: "curva", shape: "warm-up" },
        { kind: "curva", shape: "peak" },
      ],
    },
    {
      id: "escala",
      heading: { es: "La escala de energía", en: "The energy scale" },
      nodes: [
        { kind: "escala" },
        {
          kind: "callout",
          tone: "note",
          title: { es: "De dónde salen estos números", en: "Where these numbers come from" },
          body: {
            es: "Las bandas de esta tabla se leen de las constantes del motor, no están escritas a mano acá. Si el motor cambia, la tabla cambia con él.",
            en: "The bands in this table are read from the engine's own constants; they are not written out here by hand. If the engine changes, the table changes with it.",
          },
        },
      ],
    },
    {
      id: "pasos",
      heading: { es: "Pasos", en: "Steps" },
      nodes: [
        {
          kind: "pasos",
          steps: [
            {
              title: { es: "Traé tu set", en: "Bring your set" },
              body: {
                es: "Desde Rekordbox, Traktor, M3U8 o pegando una lista de texto.",
                en: "From Rekordbox, Traktor, M3U8, or by pasting a text list.",
              },
            },
            {
              title: { es: "Mirá la forma", en: "Look at the shape" },
              body: {
                es: "Antes de leer ningún número: los problemas de un set suelen verse como forma.",
                en: "Before reading any number: a set's problems usually show up as shape.",
              },
            },
            {
              title: { es: "Movés y volvés a mirar", en: "Move something and look again" },
              body: {
                es: "Cambiar un tema de lugar cambia la curva entera, así que conviene mirar de nuevo.",
                en: "Moving one track changes the whole curve, so it is worth looking again.",
              },
            },
          ],
        },
      ],
    },
    {
      id: "comparacion",
      heading: { es: "Comparación", en: "Comparison" },
      nodes: [
        {
          kind: "comparacion",
          caption: {
            es: "Dos formas de preparar el mismo set",
            en: "Two ways of preparing the same set",
          },
          leftHeading: { es: "Escuchando de punta a punta", en: "Listening end to end" },
          rightHeading: { es: "Mirando la curva", en: "Reading the curve" },
          rows: [
            {
              label: { es: "Qué tarda", en: "How long it takes" },
              left: { es: "Lo que dura el set", en: "As long as the set" },
              right: { es: "Segundos", en: "Seconds" },
            },
            {
              label: { es: "Qué encuentra", en: "What it finds" },
              left: { es: "Todo, si te aguantás el set entero", en: "Everything, if you sit through the whole set" },
              right: { es: "Problemas de forma y de orden", en: "Problems of shape and order" },
            },
            {
              label: { es: "Qué no encuentra", en: "What it misses" },
              left: { es: "Nada, pero no lo vas a hacer cada vez", en: "Nothing — but you will not do it every time" },
              right: { es: "Cómo suena cada mezcla", en: "How each mix actually sounds" },
            },
          ],
        },
      ],
    },
    {
      id: "preguntas",
      heading: { es: "Preguntas frecuentes", en: "Frequent questions" },
      nodes: [
        {
          kind: "faq",
          entries: [
            {
              question: {
                es: "¿Necesito cuenta para probar la herramienta?",
                en: "Do I need an account to try the tool?",
              },
              answer: {
                es: "No. La herramienta de curva de energía funciona sin cuenta y sin subir el archivo a ningún lado: el procesamiento pasa en tu navegador.",
                en: "No. The energy curve tool works without an account and without uploading your file anywhere: the processing happens in your browser.",
              },
            },
            {
              question: {
                es: "¿Qué pasa si mis temas no tienen tonalidad?",
                en: "What if my tracks have no key?",
              },
              answer: {
                es: "El análisis usa lo que sí puede leer y te dice qué quedó sin chequear, en vez de dar un veredicto armónico apoyado en datos que no existen.",
                en: "The analysis uses what it can read and tells you what went unchecked, rather than giving a harmonic verdict resting on data that is not there.",
              },
            },
          ],
        },
      ],
    },
    {
      id: "cierre",
      heading: { es: "Cierre", en: "Closing" },
      nodes: [
        {
          kind: "callout",
          tone: "warning",
          title: { es: "Esto es un borrador", en: "This is a draft" },
          body: {
            es: "No debería estar indexada ni figurar en el índice de guías. Si la ves en un buscador, es un bug y conviene reportarlo.",
            en: "It should be neither indexed nor listed in the guide index. If you find it in a search engine, that is a bug worth reporting.",
          },
        },
        { kind: "cta", variant: "tool" },
        { kind: "cta", variant: "signup" },
      ],
    },
  ],
  related: [
    { path: "/tools/energy-curve", label: { es: "Herramienta de curva de energía", en: "Energy curve tool" } },
    { path: "/energy-tags", label: { es: "Etiquetas de energía", en: "Energy tags" } },
  ],
  articles: [
    {
      slug: "esta-bien-el-orden-de-mi-set",
      label: { es: "¿Está bien el orden de mi set?", en: "Is my set in the right order?" },
    },
  ],
}

export const GUIDES: readonly Guide[] = [COMPONENT_PROOF]

/** The guides a reader and a crawler are meant to find. */
export function publishedGuides(): Guide[] {
  return GUIDES.filter((guide) => !guide.draft)
}

export function guideBySlug(slug: string, locale: SiteLocale): Guide | null {
  return GUIDES.find((guide) => guide.slug[locale] === slug) ?? null
}

/**
 * Roughly how long the prose takes to read, in minutes.
 *
 * The blog deliberately shows no reading time — "a five-minute estimate on a
 * four-minute read is noise", and on a short article it is. A guide is a
 * different object: it is long enough that the reader's real question is
 * "do I have time for this now", and an estimate answers it.
 *
 * Counts prose only. A chart is not read at two hundred words a minute, and
 * padding the estimate with the table's cells would make it wrong in the
 * direction that matters.
 */
export function readingMinutes(guide: Guide, locale: SiteLocale): number {
  const words = guide.sections
    .flatMap((section) => section.nodes)
    .filter((node) => node.kind === "prose")
    .map((node) => node.markdown[locale])
    .join(" ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .split(/\s+/)
    .filter(Boolean).length

  return Math.max(1, Math.round(words / 200))
}
