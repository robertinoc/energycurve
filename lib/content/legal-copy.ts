import type { SiteLocale } from "@/lib/content/site-copy"

/**
 * Placeholder-but-real legal copy for EnergyCurve, bilingual (EN/ES) to match
 * the landing. Reviewed properly in the privacy & compliance pass — until then
 * this is an honest first version reflecting the actual stack (WorkOS, Supabase,
 * PostHog, Resend, Vercel).
 */

export type LegalDocId = "privacy" | "terms" | "cookies"

export interface LegalSection {
  heading: string
  body: string[]
}

export interface LegalDoc {
  title: string
  updated: string
  intro: string
  sections: LegalSection[]
}

const CONTACT_EMAIL = "hello@energycurve.app"
const UPDATED = { en: "Last updated: July 2026", es: "Última actualización: julio 2026" }

const en: Record<LegalDocId, LegalDoc> = {
  privacy: {
    title: "Privacy Policy",
    updated: UPDATED.en,
    intro:
      "This policy explains what data EnergyCurve collects, why, and the choices you have. EnergyCurve is a tool for DJs to analyze the energy of their sets.",
    sections: [
      {
        heading: "What we collect",
        body: [
          "Account details you provide when you sign up (name and email), handled by our authentication provider WorkOS.",
          "The content you create in the app: playlists, tracks, and their metadata (artist, title, BPM, key, energy).",
          "Basic product analytics (pages visited, features used) so we can improve the app.",
        ],
      },
      {
        heading: "How we use it",
        body: [
          "To run the service — create your account, store your playlists, and compute your set analysis.",
          "To send you essential transactional emails (for example, password resets).",
          "To understand how the product is used and make it better. We don't sell your data.",
        ],
      },
      {
        heading: "Who processes it",
        body: [
          "WorkOS (authentication), Supabase (database, EU region), PostHog (product analytics), Resend (transactional email), and Vercel (hosting). Each processes data only to provide their part of the service.",
        ],
      },
      {
        heading: "Your rights",
        body: [
          `You can request access to, correction of, or deletion of your data at any time by writing to ${CONTACT_EMAIL}.`,
        ],
      },
      {
        heading: "Cookies",
        body: [
          "We use a small number of cookies — see the Cookie Policy for details.",
        ],
      },
      {
        heading: "Contact",
        body: [`Questions about privacy? Reach us at ${CONTACT_EMAIL}.`],
      },
    ],
  },
  terms: {
    title: "Terms of Service",
    updated: UPDATED.en,
    intro:
      "These terms govern your use of EnergyCurve. By creating an account or using the app, you agree to them.",
    sections: [
      {
        heading: "The service",
        body: [
          "EnergyCurve analyzes the energy flow of DJ sets and helps you plan them. Features may change as the product evolves.",
        ],
      },
      {
        heading: "Your account",
        body: [
          "You're responsible for keeping your login secure and for activity under your account. Give accurate information when you sign up.",
        ],
      },
      {
        heading: "Acceptable use",
        body: [
          "Don't misuse the service — no attempts to break, overload, or reverse-engineer it, and no uploading content you don't have the right to use.",
        ],
      },
      {
        heading: "Your content",
        body: [
          "Your playlists and tracklists are yours. You grant us only the permission needed to store and process them so the app can work for you.",
        ],
      },
      {
        heading: "Availability & disclaimer",
        body: [
          'EnergyCurve is provided "as is", without warranties. We aim for high availability but can\'t guarantee uninterrupted service, and analysis output is guidance, not a guarantee.',
        ],
      },
      {
        heading: "Changes & contact",
        body: [
          `We may update these terms; we'll reflect the date above. Questions? ${CONTACT_EMAIL}.`,
        ],
      },
    ],
  },
  cookies: {
    title: "Cookie Policy",
    updated: UPDATED.en,
    intro:
      "This policy explains how EnergyCurve uses cookies and similar storage in your browser.",
    sections: [
      {
        heading: "Essential",
        body: [
          "Needed for the app to work — keeping you signed in (session) and remembering your language choice. These can't be turned off.",
        ],
      },
      {
        heading: "Analytics",
        body: [
          "We use PostHog to understand how the product is used, with privacy-friendly defaults. This helps us prioritize improvements.",
        ],
      },
      {
        heading: "Managing cookies",
        body: [
          "You can clear or block cookies in your browser settings. Blocking essential cookies may stop parts of the app from working.",
        ],
      },
      {
        heading: "Contact",
        body: [`Questions about cookies? ${CONTACT_EMAIL}.`],
      },
    ],
  },
}

const es: Record<LegalDocId, LegalDoc> = {
  privacy: {
    title: "Política de Privacidad",
    updated: UPDATED.es,
    intro:
      "Esta política explica qué datos recopila EnergyCurve, por qué, y qué opciones tenés. EnergyCurve es una herramienta para que los DJs analicen la energía de sus sets.",
    sections: [
      {
        heading: "Qué recopilamos",
        body: [
          "Los datos de cuenta que ingresás al registrarte (nombre y email), gestionados por nuestro proveedor de autenticación WorkOS.",
          "El contenido que creás en la app: playlists, tracks y su metadata (artista, título, BPM, key, energía).",
          "Analítica básica de producto (páginas visitadas, funciones usadas) para mejorar la app.",
        ],
      },
      {
        heading: "Cómo lo usamos",
        body: [
          "Para operar el servicio — crear tu cuenta, guardar tus playlists y calcular el análisis de tu set.",
          "Para enviarte emails transaccionales esenciales (por ejemplo, restablecer la contraseña).",
          "Para entender cómo se usa el producto y mejorarlo. No vendemos tus datos.",
        ],
      },
      {
        heading: "Quién los procesa",
        body: [
          "WorkOS (autenticación), Supabase (base de datos, región UE), PostHog (analítica de producto), Resend (email transaccional) y Vercel (hosting). Cada uno procesa datos solo para brindar su parte del servicio.",
        ],
      },
      {
        heading: "Tus derechos",
        body: [
          `Podés solicitar acceso, corrección o eliminación de tus datos cuando quieras escribiendo a ${CONTACT_EMAIL}.`,
        ],
      },
      {
        heading: "Cookies",
        body: [
          "Usamos una cantidad mínima de cookies — mirá la Política de Cookies para el detalle.",
        ],
      },
      {
        heading: "Contacto",
        body: [`¿Dudas sobre privacidad? Escribinos a ${CONTACT_EMAIL}.`],
      },
    ],
  },
  terms: {
    title: "Términos del Servicio",
    updated: UPDATED.es,
    intro:
      "Estos términos regulan tu uso de EnergyCurve. Al crear una cuenta o usar la app, los aceptás.",
    sections: [
      {
        heading: "El servicio",
        body: [
          "EnergyCurve analiza el flujo de energía de los sets de DJ y te ayuda a planificarlos. Las funciones pueden cambiar a medida que el producto evoluciona.",
        ],
      },
      {
        heading: "Tu cuenta",
        body: [
          "Sos responsable de mantener tu acceso seguro y de la actividad en tu cuenta. Ingresá información veraz al registrarte.",
        ],
      },
      {
        heading: "Uso aceptable",
        body: [
          "No hagas mal uso del servicio — nada de intentar romperlo, sobrecargarlo o hacer ingeniería inversa, ni subir contenido que no tengas derecho a usar.",
        ],
      },
      {
        heading: "Tu contenido",
        body: [
          "Tus playlists y tracklists son tuyas. Nos otorgás solo el permiso necesario para guardarlas y procesarlas para que la app funcione para vos.",
        ],
      },
      {
        heading: "Disponibilidad y descargo",
        body: [
          'EnergyCurve se ofrece "tal cual", sin garantías. Buscamos alta disponibilidad pero no podemos garantizar un servicio ininterrumpido, y el resultado del análisis es una guía, no una garantía.',
        ],
      },
      {
        heading: "Cambios y contacto",
        body: [
          `Podemos actualizar estos términos; se reflejará en la fecha de arriba. ¿Dudas? ${CONTACT_EMAIL}.`,
        ],
      },
    ],
  },
  cookies: {
    title: "Política de Cookies",
    updated: UPDATED.es,
    intro:
      "Esta política explica cómo EnergyCurve usa cookies y almacenamiento similar en tu navegador.",
    sections: [
      {
        heading: "Esenciales",
        body: [
          "Necesarias para que la app funcione — mantenerte con sesión iniciada y recordar tu idioma. No se pueden desactivar.",
        ],
      },
      {
        heading: "Analítica",
        body: [
          "Usamos PostHog para entender cómo se usa el producto, con configuración respetuosa de la privacidad. Nos ayuda a priorizar mejoras.",
        ],
      },
      {
        heading: "Gestionar cookies",
        body: [
          "Podés borrar o bloquear cookies desde la configuración de tu navegador. Bloquear las esenciales puede impedir que partes de la app funcionen.",
        ],
      },
      {
        heading: "Contacto",
        body: [`¿Dudas sobre cookies? ${CONTACT_EMAIL}.`],
      },
    ],
  },
}

const CONTENT: Record<SiteLocale, Record<LegalDocId, LegalDoc>> = { en, es }

export function getLegalCopy(locale: SiteLocale, doc: LegalDocId): LegalDoc {
  return CONTENT[locale][doc]
}
