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
      es: "Analizá la curva de energía de tu set, obtené un score de 1 a 10 y los movimientos concretos que lo arreglan. Importa desde Rekordbox, Traktor, M3U8 y tus propios archivos de audio — y exporta el orden corregido de vuelta.",
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
}

export function pageMetadata(path: LocalizedPath, locale: SiteLocale) {
  const meta = PAGE_METADATA[path]
  return { title: meta.title[locale], description: meta.description[locale] }
}
