export const supportedLocales = ["en", "es"] as const

export type SiteLocale = (typeof supportedLocales)[number]

type LocalizedLabel = Record<SiteLocale, string>

interface SiteCopySchema {
  "nav.features": LocalizedLabel
  "nav.how": LocalizedLabel
  "nav.story": LocalizedLabel
  "nav.contact": LocalizedLabel
  "nav.cta": LocalizedLabel
}

const siteCopy: SiteCopySchema = {
  "nav.features": { en: "Features", es: "Features" },
  "nav.how": { en: "How it Works", es: "Cómo funciona" },
  "nav.story": { en: "Story", es: "Historia" },
  "nav.contact": { en: "Contact", es: "Contacto" },
  "nav.cta": { en: "Get Early Access", es: "Acceso anticipado" },
}

export function getSiteCopy(locale: SiteLocale = "en") {
  return {
    nav: {
      features: siteCopy["nav.features"][locale],
      how: siteCopy["nav.how"][locale],
      story: siteCopy["nav.story"][locale],
      contact: siteCopy["nav.contact"][locale],
      cta: siteCopy["nav.cta"][locale],
    },
  }
}
