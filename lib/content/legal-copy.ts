import type { SiteLocale } from "@/lib/content/site-copy"

/**
 * Legal copy for EnergyCurve, bilingual (EN/ES) to match the landing.
 *
 * This used to open by calling itself a placeholder. It no longer does, and the
 * difference is not tone: the privacy policy now names a **legal basis** for
 * each processing activity (Art. 6), the **retention period** for each kind of
 * data (Art. 13(2)(a)), the full list of rights including the two that are
 * self-serve, and the **right to complain to a supervisory authority**
 * (Art. 77). Those were the four things missing, and each is checkable rather
 * than a matter of wording.
 *
 * One claim was **removed** rather than added. The old text said "Supabase
 * (EU region)". Nobody has confirmed the region — it is item R3 on the
 * remediation plan and can only be read off the dashboard — so the sentence was
 * an unverified statement of fact in a document people are entitled to rely on.
 * It comes back when it is confirmed, not before.
 *
 * `docs/compliance/ropa.md` is the working record behind this copy; where the
 * two disagree, the RoPA is what was measured.
 */

export type LegalDocId = "privacy" | "terms" | "cookies" | "subprocessors"

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
/** EnergyCurve ships under the StageLink umbrella; this is the name that
 *  appears on invoices and card statements, so it belongs in the legal copy. */
const OPERATOR = "StageLink LLC"
/**
 * Bump this in the same change that edits any document below. A policy that
 * names new subprocessors under a stale date is worse than no date at all.
 */
const UPDATED = {
  en: "Last updated: September 2026",
  es: "Última actualización: septiembre 2026",
}

const en: Record<LegalDocId, LegalDoc> = {
  privacy: {
    title: "Privacy Policy",
    updated: UPDATED.en,
    intro:
      `This policy explains what data EnergyCurve collects, why, and the choices you have. EnergyCurve is a tool for DJs to analyze the energy of their sets, operated by ${OPERATOR} as part of the StageLink family.`,
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
        heading: "Your music stays on your computer",
        body: [
          "When you import audio files, EnergyCurve reads their tags and analyzes them in your browser. Only the resulting text data (artist, title, BPM, key, energy) is sent to our servers. Your audio files are never uploaded, stored, or transmitted.",
        ],
      },
      {
        heading: "Who processes it",
        body: [
          "WorkOS (authentication), Supabase (database), PostHog (product analytics), Resend (transactional email), and Vercel (hosting). Each processes data only to provide their part of the service. Most are in the United States; the full list, with what each one receives, is on our Subprocessors page.",
          "Anthropic, when you use AI-assisted set ordering. Only the track metadata described above is sent — never your audio. Anthropic does not train its models on this data.",
          "GetSongBPM, only when you choose to look up a track by name. The artist and title are sent so they can return the BPM and key they hold for it. Never your audio — that feature exists precisely for tracks whose files you don't have.",
          "Stripe, if you subscribe to a paid plan. Stripe handles the payment and stores the card details; we never see your full card number. The charge is processed by StageLink LLC.",
        ],
      },
      {
        heading: "Why we are allowed to process it",
        body: [
          "Running your account and storing your sets: because you asked us to — it is what the service is, and we cannot provide it otherwise (performance of a contract).",
          "Billing, if you subscribe: the same reason, plus the tax and accounting records we are legally required to keep.",
          "Keeping the service secure — rate limits, audit records of administrative actions, error reports: our legitimate interest in a product that is not trivially abused, balanced against the fact that none of it profiles you.",
          "Product analytics, the AI reordering suggestion, and track lookup by title: your consent, given per feature. You can withdraw any of them at any time, and withdrawing is one click in the same place you gave it.",
        ],
      },
      {
        heading: "How long we keep it",
        body: [
          "Your account, sets and tracks: for as long as the account exists. Delete the account and they go with it.",
          "Payment records: Stripe event payloads are stripped after 90 days, and immediately if you delete your account. The records Stripe itself must keep for tax purposes are outside our control.",
          "Analyses: the score and date stay while the account does; the detailed breakdown is dropped after a year, because nothing in the product reads it after the day it was produced.",
          "Records of administrative actions on an account: the action is kept, and the email attached to it is removed after a year.",
        ],
      },
      {
        heading: "Your rights",
        body: [
          "Access and portability: download everything we hold about you, as JSON, from your account page. No request needed.",
          "Correction: change your name from the same page. To change your email, write to us — it is also your login, and sets shared with you are matched by address.",
          "Deletion, restriction, and objection: write to us and we will act within 30 days. Deleting your account removes it from our database and from our authentication provider, along with your sets, tracks, analyses and versions.",
          "Withdrawing consent: the cookie banner and the Cookie Policy page both let you change your answer, and withdrawing takes effect immediately — including telling our analytics provider to forget the identifier it held.",
          `Any of these can also be exercised by writing to ${CONTACT_EMAIL}.`,
        ],
      },
      {
        heading: "If you think we got it wrong",
        body: [
          "You can complain to a data protection authority. In the EU or the UK that is the regulator where you live; in Argentina it is the Agencia de Acceso a la Información Pública. We would rather you told us first, but you are not required to.",
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
      `These terms govern your use of EnergyCurve, a product operated by ${OPERATOR}. By creating an account or using the app, you agree to them.`,
    sections: [
      {
        heading: "Who operates EnergyCurve",
        body: [
          `EnergyCurve is part of the StageLink family and is operated by ${OPERATOR}, the company responsible for the service and for this agreement.`,
          `If you purchase a paid plan, the charge is processed by ${OPERATOR}, so "${OPERATOR}" is the name that appears on your card statement, invoices, and receipts — not "EnergyCurve".`,
        ],
      },
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
  subprocessors: {
    title: "Subprocessors",
    updated: UPDATED.en,
    intro:
      `Every third party that processes data on our behalf, what they do with it, and where they are. ${OPERATOR} is the controller; the companies below are processors acting on our instructions. This list is generated from the integrations the application actually uses — a service we stopped using is removed, and one we add appears here in the same change.`,
    sections: [
      {
        heading: "Infrastructure",
        body: [
          "Vercel Inc. (United States) — application hosting and runtime logs. Every request reaches us through Vercel, so it processes whatever a request contains.",
          "Supabase Inc. — the application database: your account record, your sets, your tracks, your analyses. Stores everything except payment details and authentication credentials.",
        ],
      },
      {
        heading: "Accounts and email",
        body: [
          "WorkOS Inc. (United States) — authentication. Holds your email, your name if you gave one, and your password; we never receive or store the password ourselves.",
          "Resend (United States) — transactional email: password resets and verification codes. Receives your address and the message, nothing else.",
        ],
      },
      {
        heading: "Payments",
        body: [
          "Stripe, Inc. (United States) — subscriptions and payment processing. Card details are entered on Stripe's own checkout and never touch our servers; we hold only a customer identifier and your plan status.",
        ],
      },
      {
        heading: "Optional, and only if you turn them on",
        body: [
          "PostHog Inc. (United States) — product analytics. Loads only after you accept in the cookie banner, and never if your browser sends Do Not Track. Identifies you by an internal account id, never by email, and we do not send it your IP address.",
          "GetSongBPM (United States) — track title and tempo lookup. Used only on sets where you explicitly enable it, and it receives only artist and title. We have no data processing agreement with them, which is why it is off by default and asked for per set.",
          "Anthropic PBC (United States) — the AI reordering suggestion. Receives track titles, artists, tempos and keys for the set being reordered when you ask for a suggestion. It never receives your email, your account, or any audio.",
        ],
      },
      {
        heading: "What never leaves your device",
        body: [
          "Audio files. When you analyse local files, the reading happens in your browser and the audio is never uploaded to us or to anyone on this list. What leaves your device is the measurements — tempo, key, energy — not the recording.",
        ],
      },
      {
        heading: "Where they are, and what that means",
        body: [
          "Most of the companies above are in the United States, so using EnergyCurve from the European Economic Area involves an international transfer. We rely on each provider's own transfer mechanism under their data processing terms.",
          `If you want to know the mechanism for a specific provider, or you are notified of a change you object to, write to ${CONTACT_EMAIL}.`,
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
      `Esta política explica qué datos recopila EnergyCurve, por qué, y qué opciones tenés. EnergyCurve es una herramienta para que los DJs analicen la energía de sus sets, operada por ${OPERATOR} como parte de la familia StageLink.`,
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
        heading: "Tu música se queda en tu computadora",
        body: [
          "Cuando importás archivos de audio, EnergyCurve lee sus tags y los analiza en tu navegador. A nuestros servidores sólo viajan los datos de texto resultantes (artista, título, BPM, tonalidad, energía). Tus archivos de audio nunca se suben, ni se guardan, ni se transmiten.",
        ],
      },
      {
        heading: "Quién los procesa",
        body: [
          "WorkOS (autenticación), Supabase (base de datos), PostHog (analítica de producto), Resend (email transaccional) y Vercel (hosting). Cada uno procesa datos solo para brindar su parte del servicio. La mayoría están en Estados Unidos; la lista completa, con qué recibe cada uno, está en nuestra página de Sub-encargados.",
          "Anthropic, cuando usás el ordenamiento de sets asistido por IA. Sólo se envía la metadata de los tracks descrita arriba — nunca tu audio. Anthropic no entrena sus modelos con estos datos.",
          "GetSongBPM, sólo cuando elegís buscar un tema por nombre. Se manda el artista y el título para que devuelvan el BPM y la tonalidad que tengan. Nunca tu audio — esa función existe justamente para los temas de los que no tenés el archivo.",
          "Stripe, si contratás un plan pago. Stripe procesa el pago y guarda los datos de la tarjeta; nosotros nunca vemos el número completo. El cobro lo procesa StageLink LLC.",
        ],
      },
      {
        heading: "Por qué podemos tratarlos",
        body: [
          "Tener tu cuenta y guardar tus sets: porque nos lo pediste — es en qué consiste el servicio y no podríamos darlo de otra forma (ejecución de un contrato).",
          "Facturación, si te suscribís: lo mismo, más los registros fiscales y contables que estamos obligados a conservar.",
          "Mantener el servicio seguro — límites de uso, registro de acciones administrativas, reportes de error: nuestro interés legítimo en un producto que no sea trivialmente abusable, balanceado contra el hecho de que nada de eso te perfila.",
          "Analítica de producto, la sugerencia de reordenamiento con IA, y la búsqueda de tracks por título: tu consentimiento, dado por función. Podés retirar cualquiera cuando quieras, y retirarlo es un clic en el mismo lugar donde lo diste.",
        ],
      },
      {
        heading: "Cuánto tiempo los guardamos",
        body: [
          "Tu cuenta, tus sets y tus tracks: mientras exista la cuenta. Si la borrás, se van con ella.",
          "Registros de pago: los payloads de los eventos de Stripe se limpian a los 90 días, y de inmediato si borrás tu cuenta. Los registros que Stripe debe conservar por obligación fiscal quedan fuera de nuestro control.",
          "Análisis: el puntaje y la fecha quedan mientras exista la cuenta; el detalle se descarta al año, porque nada del producto lo lee después del día en que se generó.",
          "Registro de acciones administrativas sobre una cuenta: la acción se conserva, y el email asociado se borra al año.",
        ],
      },
      {
        heading: "Tus derechos",
        body: [
          "Acceso y portabilidad: descargá todo lo que tenemos sobre vos, en JSON, desde la página de tu cuenta. No hace falta pedirlo.",
          "Rectificación: cambiá tu nombre desde esa misma página. Para cambiar el email, escribinos — también es tu usuario, y los sets compartidos con vos se asocian por dirección.",
          "Supresión, limitación y oposición: escribinos y actuamos dentro de los 30 días. Borrar tu cuenta la elimina de nuestra base y de nuestro proveedor de identidad, junto con tus sets, tracks, análisis y versiones.",
          "Retirar el consentimiento: el banner y la página de Política de cookies te dejan cambiar tu respuesta, y retirarlo tiene efecto inmediato — incluso decirle a nuestro proveedor de analítica que olvide el identificador que tenía.",
          `Cualquiera de estos también se ejerce escribiendo a ${CONTACT_EMAIL}.`,
        ],
      },
      {
        heading: "Si creés que nos equivocamos",
        body: [
          "Podés reclamar ante una autoridad de protección de datos. En la UE o el Reino Unido es el regulador de donde vivas; en Argentina es la Agencia de Acceso a la Información Pública. Preferiríamos que nos lo cuentes primero, pero no estás obligado.",
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
      `Estos términos regulan tu uso de EnergyCurve, un producto operado por ${OPERATOR}. Al crear una cuenta o usar la app, los aceptás.`,
    sections: [
      {
        heading: "Quién opera EnergyCurve",
        body: [
          `EnergyCurve es parte de la familia StageLink y está operado por ${OPERATOR}, la empresa responsable del servicio y de este acuerdo.`,
          `Si contratás un plan pago, el cobro lo procesa ${OPERATOR}, así que "${OPERATOR}" es el nombre que vas a ver en tu resumen de tarjeta, facturas y recibos — no "EnergyCurve".`,
        ],
      },
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
  subprocessors: {
    title: "Sub-encargados",
    updated: UPDATED.es,
    intro:
      `Cada tercero que trata datos por cuenta nuestra, qué hace con ellos y dónde está. ${OPERATOR} es el responsable; las empresas de abajo son encargados que actúan siguiendo nuestras instrucciones. Esta lista se arma a partir de las integraciones que la aplicación realmente usa — un servicio que dejamos de usar se saca, y uno que sumamos aparece acá en el mismo cambio.`,
    sections: [
      {
        heading: "Infraestructura",
        body: [
          "Vercel Inc. (EE.UU.) — hosting de la aplicación y logs de ejecución. Todo request pasa por Vercel, así que trata lo que ese request contenga.",
          "Supabase Inc. — la base de datos: tu cuenta, tus sets, tus tracks, tus análisis. Guarda todo excepto los datos de pago y las credenciales de acceso.",
        ],
      },
      {
        heading: "Cuentas y mails",
        body: [
          "WorkOS Inc. (EE.UU.) — autenticación. Tiene tu mail, tu nombre si lo diste, y tu contraseña; nosotros nunca recibimos ni guardamos la contraseña.",
          "Resend (EE.UU.) — mails transaccionales: restablecer contraseña y códigos de verificación. Recibe tu dirección y el mensaje, nada más.",
        ],
      },
      {
        heading: "Pagos",
        body: [
          "Stripe, Inc. (EE.UU.) — suscripciones y procesamiento de pagos. Los datos de la tarjeta se cargan en el checkout de Stripe y nunca pasan por nuestros servidores; nosotros guardamos un identificador de cliente y el estado de tu plan.",
        ],
      },
      {
        heading: "Opcionales, y solo si los activás vos",
        body: [
          "PostHog Inc. (EE.UU.) — analítica de producto. Carga solo después de que aceptes en el banner, y nunca si tu navegador manda Do Not Track. Te identifica con un id interno de cuenta, nunca con tu mail, y no le mandamos tu dirección IP.",
          "GetSongBPM (EE.UU.) — búsqueda de título y tempo. Se usa solo en los sets donde lo activás explícitamente, y recibe únicamente artista y título. No tenemos acuerdo de tratamiento de datos con ellos, y por eso viene apagado y se pide set por set.",
          "Anthropic PBC (EE.UU.) — la sugerencia de reordenamiento con IA. Recibe títulos, artistas, tempos y tonalidades del set que estás reordenando, cuando pedís una sugerencia. Nunca recibe tu mail, tu cuenta, ni audio.",
        ],
      },
      {
        heading: "Lo que nunca sale de tu dispositivo",
        body: [
          "Los archivos de audio. Cuando analizás archivos locales, la lectura ocurre en tu navegador y el audio no se sube ni a nosotros ni a nadie de esta lista. Lo que sale de tu dispositivo son las mediciones — tempo, tonalidad, energía — no la grabación.",
        ],
      },
      {
        heading: "Dónde están, y qué significa eso",
        body: [
          "La mayoría de las empresas de arriba están en Estados Unidos, así que usar EnergyCurve desde el Espacio Económico Europeo implica una transferencia internacional. Nos apoyamos en el mecanismo de transferencia propio de cada proveedor, según sus condiciones de tratamiento de datos.",
          `Si querés saber el mecanismo de un proveedor puntual, o te notificamos un cambio al que te querés oponer, escribinos a ${CONTACT_EMAIL}.`,
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
