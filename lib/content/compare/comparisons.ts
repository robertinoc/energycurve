import type { Bilingual, ContentNode } from "@/lib/content/content-nodes"
import type { SiteLocale } from "@/lib/content/site-copy"

/**
 * The comparison pages, and the rule that makes them publishable.
 *
 * SEO-E23 sat blocked for months on one question — what can we actually say
 * about a competitor — and the answer is a rule rather than a meeting:
 *
 * **Only a fact quotable from the competitor's own public page, with the URL
 * and the date it was read.** No memory, no inference, no third-party reviews,
 * no search-result summaries. Everything below traces to
 * `docs/seo/competitor-facts-2026-09-26.md`, which holds the quotes and the
 * links; what could not be sourced that way is listed there, unpublished.
 *
 * Three consequences of the rule that look like omissions and are not:
 *
 * - **Mixed In Key has no price row.** Their shop declares "(Prices in ARS)"
 *   and returns Argentine pesos by geolocation. There is no single citable
 *   figure, and converting one would be inventing it.
 * - **Nobody's user counts appear.** Both DJ.Studio and SetFlow publish one.
 *   Self-reported and unverifiable is not a fact, it is a claim.
 * - **No accuracy comparison of key detection.** Nobody publishes a
 *   reproducible method, including us.
 *
 * And one rule about tone: **no superiority claims.** The honest comparison is
 * what each product analyses, not which is better. Every page names at least
 * one case where the other one is the right choice — a comparison we always win
 * reads as a brochure, and the answer engines quote the inventory, not the
 * brochure.
 */

export interface Comparison {
  id: string
  slug: Record<SiteLocale, string>
  /** The competitor's name, spelled the way they spell it. */
  competitor: string
  title: Bilingual
  /** 140–155 characters, same bound the guides are held to. */
  description: Bilingual
  /** The standfirst. */
  summary: Bilingual
  /** ISO date the competitor's pages were read. Rendered, not just recorded. */
  verifiedAt: string
  /** The pages every fact came from, so a reader can check them. */
  sources: { label: string; url: string }[]
  sections: { id: string; heading: Bilingual; nodes: ContentNode[] }[]
}

/** Shared closing block: the same offer, phrased once. */
const CTA: ContentNode = { kind: "cta", variant: "signup" }

const MIXED_IN_KEY: Comparison = {
  id: "mixed-in-key",
  competitor: "Mixed In Key",
  slug: { en: "mixed-in-key", es: "mixed-in-key" },
  verifiedAt: "2026-09-26",
  sources: [
    { label: "mixedinkey.com", url: "https://mixedinkey.com/" },
    { label: "shop.mixedinkey.com", url: "https://shop.mixedinkey.com/" },
  ],
  title: {
    en: "EnergyCurve vs Mixed In Key",
    es: "EnergyCurve vs Mixed In Key",
  },
  description: {
    en: "Mixed In Key analyses each track: key, BPM and energy written to your tags. EnergyCurve analyses the set those tracks make. What each one is for.",
    es: "Mixed In Key analiza cada tema: tonalidad, BPM y energía escritos en tus tags. EnergyCurve analiza el set que esos temas forman. Para qué sirve cada uno.",
  },
  summary: {
    en: "Two tools that both talk about energy and both use the Camelot wheel, and that are not answering the same question. One reads a file. The other reads an order.",
    es: "Dos herramientas que hablan las dos de energía y usan las dos la rueda Camelot, y que no contestan la misma pregunta. Una lee un archivo. La otra lee un orden.",
  },
  sections: [
    {
      id: "que-hace-cada-uno",
      heading: { en: "What each one does", es: "Qué hace cada uno" },
      nodes: [
        {
          kind: "prose",
          markdown: {
            en: `Mixed In Key describes itself, on its own shop page, as software that lets you "Analyze your tracks for Cue Points, Energy Level, and BPM" and "Organize your library with custom tags, playlists, and emoji labels", "Powered by the Camelot Wheel for clean harmonic mixing". Its homepage puts the unit plainly: "Unique Energy Level ratings show you how danceable **each track** is."

That is a per-track measurement, and it is a good one — good enough that EnergyCurve reads it. If your files already carry Mixed In Key's energy tags, we use them instead of guessing.

What we do with them is the different part. EnergyCurve takes the tracks in the order you put them in and asks what that *order* does across an hour: where it climbs, where it sags, which transition is fighting the one before it.`,
            es: `Mixed In Key se describe, en su propia página de tienda, como software que te permite "Analyze your tracks for Cue Points, Energy Level, and BPM" y "Organize your library with custom tags, playlists, and emoji labels", "Powered by the Camelot Wheel for clean harmonic mixing". Su home lo dice sin vueltas: "Unique Energy Level ratings show you how danceable **each track** is."

Eso es una medición por tema, y es buena — tan buena que EnergyCurve la lee. Si tus archivos ya traen los tags de energía de Mixed In Key, los usamos en vez de estimar.

Lo que hacemos con ellos es la parte distinta. EnergyCurve toma los temas en el orden que vos pusiste y se pregunta qué hace ese *orden* a lo largo de una hora: dónde sube, dónde se cae, qué transición pelea con la anterior.`,
          },
        },
        {
          kind: "comparacion",
          caption: {
            en: "Read from each product's own pages on 26 September 2026.",
            es: "Leído de las páginas propias de cada producto el 26 de septiembre de 2026.",
          },
          leftHeading: { en: "EnergyCurve", es: "EnergyCurve" },
          rightHeading: { en: "Mixed In Key", es: "Mixed In Key" },
          rows: [
            {
              label: { en: "Unit of analysis", es: "Unidad de análisis" },
              left: { en: "The set — the order, across its whole length", es: "El set — el orden, a lo largo de toda su duración" },
              right: { en: "The track — \"each track\", in their words", es: "El tema — \"each track\", en sus palabras" },
            },
            {
              label: { en: "Where it runs", es: "Dónde corre" },
              left: { en: "In the browser, nothing to install", es: "En el navegador, sin instalar nada" },
              right: { en: "Desktop: bought per platform, \"Buy for MacOS\" or \"Buy for Windows\"", es: "Escritorio: se compra por plataforma, \"Buy for MacOS\" o \"Buy for Windows\"" },
            },
            {
              label: { en: "Writes tags to your files", es: "Escribe tags en tus archivos" },
              left: { en: "No — it reads them, and never modifies your audio", es: "No — los lee, y nunca modifica tu audio" },
              right: { en: "Yes, that is the product", es: "Sí, ése es el producto" },
            },
            {
              label: { en: "Cue point detection", es: "Detección de cue points" },
              left: { en: "No", es: "No" },
              right: { en: "Yes", es: "Sí" },
            },
            {
              label: { en: "Price", es: "Precio" },
              left: { en: "Free tier, then US$9.99 and US$19.99 per month", es: "Plan gratuito, después u$s9,99 y u$s19,99 por mes" },
              right: { en: "Not stated here: their shop prices by country and showed us Argentine pesos, so there is no single figure to quote", es: "No lo ponemos: su tienda cobra por país y a nosotros nos mostró pesos argentinos, así que no hay una cifra única para citar" },
            },
          ],
        },
      ],
    },
    {
      id: "cuando-conviene-cada-uno",
      heading: { en: "When each one is the right call", es: "Cuándo conviene cada uno" },
      nodes: [
        {
          kind: "prose",
          markdown: {
            en: `**Mixed In Key is the right call** if what you need is data written into your library. Key and energy on thousands of files, cue points found for you, tags that every other program then reads. We do not do that, and a set analyser is no substitute for it — if your files have no key and no energy, the first thing to fix is your files.

**EnergyCurve is the right call** once the files are tagged and the question moved on: does this hour work? It reads the tags you already have, draws the curve the order makes, and hands the fixed order back as a Rekordbox XML, a Traktor NML or an M3U8 — free on every tier, including the free one.

Plenty of people should use both, and that is not a diplomatic answer: tagging a library and shaping a night are different jobs, and the second one gets easier when the first is done.`,
            es: `**Conviene Mixed In Key** si lo que necesitás son datos escritos en tu librería. Tonalidad y energía en miles de archivos, cue points encontrados por vos, tags que después lee cualquier otro programa. Eso nosotros no lo hacemos, y un analizador de sets no lo reemplaza — si tus archivos no tienen tonalidad ni energía, lo primero que hay que arreglar son los archivos.

**Conviene EnergyCurve** cuando los archivos ya están etiquetados y la pregunta cambió: ¿esta hora funciona? Lee los tags que ya tenés, dibuja la curva que hace el orden, y te devuelve el orden corregido como Rekordbox XML, Traktor NML o M3U8 — gratis en todos los planes, incluido el gratuito.

A mucha gente le conviene usar los dos, y no es una respuesta diplomática: etiquetar una librería y darle forma a una noche son trabajos distintos, y el segundo se hace más fácil cuando el primero está hecho.`,
          },
        },
      ],
    },
    {
      id: "preguntas",
      heading: { en: "Questions", es: "Preguntas" },
      nodes: [
        {
          kind: "faq",
          entries: [
            {
              question: {
                en: "Do I need Mixed In Key for EnergyCurve to work?",
                es: "¿Necesito Mixed In Key para que EnergyCurve funcione?",
              },
              answer: {
                en: "No. If your tracks already carry Mixed In Key's energy tags we read them, and if they don't we estimate from what the file does carry. The estimate is worse than a measurement, and the app says which of the two you are looking at rather than presenting both as the same thing.",
                es: "No. Si tus temas ya traen los tags de energía de Mixed In Key los leemos, y si no los traen estimamos a partir de lo que el archivo sí tenga. La estimación es peor que una medición, y la app te dice cuál de las dos estás mirando en vez de presentar las dos como lo mismo.",
              },
            },
            {
              question: {
                en: "Does EnergyCurve modify my audio files?",
                es: "¿EnergyCurve modifica mis archivos de audio?",
              },
              answer: {
                en: "No. It reads what your library exports and writes nothing back to your files. Mixed In Key does write tags — that is the point of it — so the two do not collide.",
                es: "No. Lee lo que exporta tu librería y no escribe nada en tus archivos. Mixed In Key sí escribe tags — para eso está — así que los dos no chocan.",
              },
            },
            {
              question: {
                en: "Why isn't Mixed In Key's price on this page?",
                es: "¿Por qué el precio de Mixed In Key no está en esta página?",
              },
              answer: {
                en: "Because we could not read one we could stand behind. Their shop shows prices in the visitor's local currency — it showed us Argentine pesos on 26 September 2026 — so any single figure here would be either wrong for most readers or a conversion we made up. Their shop has the number for your country.",
                es: "Porque no pudimos leer uno que pudiéramos sostener. Su tienda muestra precios en la moneda local del visitante — a nosotros nos mostró pesos argentinos el 26 de septiembre de 2026 — así que cualquier cifra única acá o estaría mal para la mayoría, o sería una conversión inventada por nosotros. El número para tu país está en su tienda.",
              },
            },
          ],
        },
        CTA,
      ],
    },
  ],
}

const DJ_STUDIO: Comparison = {
  id: "dj-studio",
  competitor: "DJ.Studio",
  slug: { en: "dj-studio", es: "dj-studio" },
  verifiedAt: "2026-09-26",
  sources: [
    { label: "dj.studio", url: "https://dj.studio/" },
    { label: "dj.studio/pricing", url: "https://dj.studio/pricing" },
  ],
  title: { en: "EnergyCurve vs DJ.Studio", es: "EnergyCurve vs DJ.Studio" },
  description: {
    en: "DJ.Studio builds the mix: a timeline DAW that renders audio. EnergyCurve plans the set you play live. Where they overlap, and where they don't.",
    es: "DJ.Studio arma la mezcla: un DAW de línea de tiempo que renderiza audio. EnergyCurve planifica el set que tocás en vivo. Dónde se cruzan y dónde no.",
  },
  summary: {
    en: "Both will order a playlist harmonically for you. Only one of them produces a finished mix at the end, and that difference decides which one you want.",
    es: "Los dos te ordenan una playlist de forma armónica. Sólo uno produce una mezcla terminada al final, y esa diferencia decide cuál querés.",
  },
  sections: [
    {
      id: "que-hace-cada-uno",
      heading: { en: "What each one does", es: "Qué hace cada uno" },
      nodes: [
        {
          kind: "prose",
          markdown: {
            en: `DJ.Studio describes itself as "the timeline-based DAW for DJs on Mac and Windows", for creating "mashups, DJ mixes, radio shows and video mixes". The output is a rendered mix: a file you publish.

It also does something we do. Its homepage advertises "Auto-order your playlist — Using millions of calculations, Harmonize orders your playlist perfectly based on tempo, and Camelot Wheel". That is the same job as our reordering, and pretending otherwise would be the kind of comparison nobody believes.

Where the two part company is what happens after the order exists. DJ.Studio takes it onto a timeline, lets you edit transitions by hand, and renders audio. EnergyCurve stops at the order and the plan: it hands the running order back to Rekordbox, Traktor or your player, because the mix is something you are going to perform, not export.`,
            es: `DJ.Studio se describe como "the timeline-based DAW for DJs on Mac and Windows", para crear "mashups, DJ mixes, radio shows and video mixes". El resultado es una mezcla renderizada: un archivo que publicás.

También hace algo que hacemos nosotros. Su home anuncia "Auto-order your playlist — Using millions of calculations, Harmonize orders your playlist perfectly based on tempo, and Camelot Wheel". Ése es el mismo trabajo que nuestro reordenamiento, y disimularlo sería el tipo de comparación que no le cree nadie.

Donde se separan es en qué pasa después de que el orden existe. DJ.Studio lo lleva a una línea de tiempo, te deja editar transiciones a mano, y renderiza audio. EnergyCurve se detiene en el orden y el plan: te devuelve el running order a Rekordbox, Traktor o tu reproductor, porque la mezcla la vas a tocar vos, no exportarla.`,
          },
        },
        {
          kind: "comparacion",
          caption: {
            en: "Read from each product's own pages on 26 September 2026.",
            es: "Leído de las páginas propias de cada producto el 26 de septiembre de 2026.",
          },
          leftHeading: { en: "EnergyCurve", es: "EnergyCurve" },
          rightHeading: { en: "DJ.Studio", es: "DJ.Studio" },
          rows: [
            {
              label: { en: "What comes out", es: "Qué sale" },
              left: { en: "A running order and a plan, exported back to your player", es: "Un running order y un plan, exportado de vuelta a tu reproductor" },
              right: { en: "A rendered mix — \"DJ mixes, radio shows and video mixes\"", es: "Una mezcla renderizada — \"DJ mixes, radio shows and video mixes\"" },
            },
            {
              label: { en: "Orders a playlist for you", es: "Te ordena una playlist" },
              left: { en: "Yes", es: "Sí" },
              right: { en: "Yes — \"Harmonize orders your playlist … based on tempo, and Camelot Wheel\"", es: "Sí — \"Harmonize orders your playlist … based on tempo, and Camelot Wheel\"" },
            },
            {
              label: { en: "Where it runs", es: "Dónde corre" },
              left: { en: "In the browser, nothing to install", es: "En el navegador, sin instalar nada" },
              right: { en: "Desktop, \"on Mac and Windows\"", es: "Escritorio, \"on Mac and Windows\"" },
            },
            {
              label: { en: "Price", es: "Precio" },
              left: { en: "Free tier, then US$9.99 and US$19.99 per month", es: "Plan gratuito, después u$s9,99 y u$s19,99 por mes" },
              right: { en: "One-time: Studio US$99, Pro US$129, a perpetual licence with 12 months of updates", es: "Pago único: Studio u$s99, Pro u$s129, licencia perpetua con 12 meses de actualizaciones" },
            },
            {
              label: { en: "Try before paying", es: "Probar antes de pagar" },
              left: { en: "A free tier that stays free", es: "Un plan gratuito que sigue siendo gratuito" },
              right: { en: "\"No credit card required. Free for 7 days.\"", es: "\"No credit card required. Free for 7 days.\"" },
            },
          ],
        },
      ],
    },
    {
      id: "cuando-conviene-cada-uno",
      heading: { en: "When each one is the right call", es: "Cuándo conviene cada uno" },
      nodes: [
        {
          kind: "prose",
          markdown: {
            en: `**DJ.Studio is the right call** if the thing you need at the end is audio. A podcast, a radio show, a promo mix, a video — anything you are going to upload rather than perform. We do not render audio at all, and no amount of set analysis substitutes for a timeline and a render button.

Its pricing may also simply suit you better. One payment of US$99 or US$129 against a subscription is a real argument, and if you prep a handful of mixes a year it is probably the cheaper shape.

**EnergyCurve is the right call** when you are going to stand behind the decks and play it. The output is a running order in your player, with the energy curve and the transitions you should watch — not a file. And it runs in a browser, which matters if you plan on a laptop that isn't the one with your library on it.`,
            es: `**Conviene DJ.Studio** si lo que necesitás al final es audio. Un podcast, un programa de radio, un promo mix, un video — cualquier cosa que vayas a subir en vez de tocar. Nosotros no renderizamos audio, y ninguna cantidad de análisis de set reemplaza una línea de tiempo y un botón de render.

Su forma de cobrar también puede convenirte más. Un pago de u$s99 o u$s129 contra una suscripción es un argumento real, y si preparás unas pocas mezclas al año probablemente sea la forma más barata.

**Conviene EnergyCurve** cuando vas a pararte atrás de las bandejas y tocarlo. Lo que sale es un running order en tu reproductor, con la curva de energía y las transiciones que conviene mirar — no un archivo. Y corre en el navegador, que importa si planificás en una laptop que no es la que tiene tu librería.`,
          },
        },
      ],
    },
    {
      id: "preguntas",
      heading: { en: "Questions", es: "Preguntas" },
      nodes: [
        {
          kind: "faq",
          entries: [
            {
              question: {
                en: "Does EnergyCurve render a mix I can upload?",
                es: "¿EnergyCurve renderiza una mezcla que pueda subir?",
              },
              answer: {
                en: "No. It never touches your audio. It produces the order and the plan, and exports them to Rekordbox XML, Traktor NML, M3U8, CSV or plain text. If you need a finished audio file, a timeline DAW like DJ.Studio is the tool for it.",
                es: "No. Nunca toca tu audio. Produce el orden y el plan, y los exporta a Rekordbox XML, Traktor NML, M3U8, CSV o texto plano. Si necesitás un archivo de audio terminado, un DAW de línea de tiempo como DJ.Studio es la herramienta.",
              },
            },
            {
              question: {
                en: "Both order a playlist harmonically. What is actually different?",
                es: "Los dos ordenan una playlist de forma armónica. ¿Qué cambia de verdad?",
              },
              answer: {
                en: "What the order is for. DJ.Studio's leads into a timeline you then mix down. Ours leads back into your player, alongside an analysis of the shape that order makes across the night — where it climbs, where it flattens, which transition to watch.",
                es: "Para qué es el orden. El de DJ.Studio desemboca en una línea de tiempo que después mezclás. El nuestro vuelve a tu reproductor, junto con un análisis de la forma que ese orden hace a lo largo de la noche — dónde sube, dónde se aplana, qué transición mirar.",
              },
            },
            {
              question: {
                en: "Can I use both?",
                es: "¿Puedo usar los dos?",
              },
              answer: {
                en: "Yes, and the export formats are why. Our Rekordbox XML and Traktor NML exports are free on every tier, and DJ.Studio lists rekordbox and Traktor Pro among the libraries it integrates with, so a running order planned here can be opened there.",
                es: "Sí, y los formatos de export son la razón. Nuestros exports de Rekordbox XML y Traktor NML son gratis en todos los planes, y DJ.Studio lista rekordbox y Traktor Pro entre las librerías con las que integra, así que un running order planificado acá se puede abrir allá.",
              },
            },
          ],
        },
        CTA,
      ],
    },
  ],
}

const SETFLOW: Comparison = {
  id: "setflow",
  competitor: "SetFlow",
  slug: { en: "setflow", es: "setflow" },
  verifiedAt: "2026-09-26",
  sources: [{ label: "setflow.app", url: "https://www.setflow.app/" }],
  title: { en: "EnergyCurve vs SetFlow", es: "EnergyCurve vs SetFlow" },
  description: {
    en: "The closest comparison here: SetFlow generates a set from your library, EnergyCurve analyses the one you built. Prices, exports and the real overlap.",
    es: "La comparación más cercana: SetFlow genera un set desde tu librería, EnergyCurve analiza el que ya armaste. Precios, exports y el cruce real entre ambos.",
  },
  summary: {
    en: "This is the one page here where the differences are narrow and the overlap is real. Both read your library, both talk about energy curves, both export back to Rekordbox.",
    es: "Ésta es la única página acá donde las diferencias son finas y el cruce es real. Los dos leen tu librería, los dos hablan de curvas de energía, los dos exportan a Rekordbox.",
  },
  sections: [
    {
      id: "que-hace-cada-uno",
      heading: { en: "What each one does", es: "Qué hace cada uno" },
      nodes: [
        {
          kind: "callout",
          tone: "note",
          title: {
            en: "The closest thing to us on this list",
            es: "Lo más parecido a nosotros de esta lista",
          },
          body: {
            en: "EnergyCurve's usual line is that other tools analyse the track and we analyse the set. It does not hold against SetFlow, and saying it here would be false. SetFlow analyses the set too.",
            es: "La frase habitual de EnergyCurve es que las otras herramientas analizan el tema y nosotros el set. Contra SetFlow no se sostiene, y decirlo acá sería falso. SetFlow también analiza el set.",
          },
        },
        {
          kind: "prose",
          markdown: {
            en: `SetFlow describes itself as a way to "Import your Rekordbox, Serato or Traktor library and auto-build harmonically mixed DJ sets in seconds — Camelot matching, BPM sync and energy curves". Its homepage promises "A MIXED SET IN UNDER 3 SECONDS", built from a vibe you pick, with "Five archetypes plus a planning canvas. Draw the curve of the night — warm-up, peak, close."

Read that and then read our own landing page and you will find the same vocabulary. The difference is not the vocabulary, it is the direction of travel.

**SetFlow starts from your library and generates a set.** You point it at a crate, choose a genre, a length and an energy archetype, and it returns an order.

**EnergyCurve starts from a set you already made and tells you what is wrong with it.** You import the playlist you built — the one you argued with yourself about for two hours — and it shows the curve that order actually makes, names the transitions that fight, and offers fixes you accept one at a time. The reordering is there, but it is the last resort rather than the front door.

Which of those you want depends on whether the part you enjoy is choosing the tracks.`,
            es: `SetFlow se describe como una forma de "Import your Rekordbox, Serato or Traktor library and auto-build harmonically mixed DJ sets in seconds — Camelot matching, BPM sync and energy curves". Su home promete "A MIXED SET IN UNDER 3 SECONDS", armado a partir de un vibe que elegís, con "Five archetypes plus a planning canvas. Draw the curve of the night — warm-up, peak, close."

Leé eso y después leé nuestra propia landing y vas a encontrar el mismo vocabulario. La diferencia no es el vocabulario, es la dirección del recorrido.

**SetFlow arranca de tu librería y genera un set.** Le apuntás a un crate, elegís género, duración y un arquetipo de energía, y te devuelve un orden.

**EnergyCurve arranca de un set que ya armaste y te dice qué tiene mal.** Importás la playlist que hiciste — esa con la que discutiste con vos mismo dos horas — y te muestra la curva que ese orden hace de verdad, nombra las transiciones que pelean, y te ofrece arreglos que aceptás de a uno. El reordenamiento está, pero es el último recurso y no la puerta de entrada.

Cuál de las dos querés depende de si la parte que disfrutás es elegir los temas.`,
          },
        },
        {
          kind: "comparacion",
          caption: {
            en: "Read from each product's own pages on 26 September 2026.",
            es: "Leído de las páginas propias de cada producto el 26 de septiembre de 2026.",
          },
          leftHeading: { en: "EnergyCurve", es: "EnergyCurve" },
          rightHeading: { en: "SetFlow", es: "SetFlow" },
          rows: [
            {
              label: { en: "Where it starts", es: "De dónde arranca" },
              left: { en: "A set you already ordered", es: "Un set que ya ordenaste" },
              right: { en: "Your library plus a vibe — \"auto-build … sets in seconds\"", es: "Tu librería más un vibe — \"auto-build … sets in seconds\"" },
            },
            {
              label: { en: "Energy curve of the set", es: "Curva de energía del set" },
              left: { en: "Yes", es: "Sí" },
              right: { en: "Yes — \"Five archetypes plus a planning canvas\"", es: "Sí — \"Five archetypes plus a planning canvas\"" },
            },
            {
              label: { en: "Exports back to your player", es: "Exporta de vuelta a tu reproductor" },
              left: { en: "Rekordbox XML, Traktor NML, M3U8, CSV, TXT — free on every tier", es: "Rekordbox XML, Traktor NML, M3U8, CSV, TXT — gratis en todos los planes" },
              right: { en: "\"Rekordbox, Traktor, Serato, PDF or TribeXR\"", es: "\"Rekordbox, Traktor, Serato, PDF or TribeXR\"" },
            },
            {
              label: { en: "Price", es: "Precio" },
              left: { en: "Free tier, then US$9.99 and US$19.99 per month", es: "Plan gratuito, después u$s9,99 y u$s19,99 por mes" },
              right: { en: "£2.99 and £4.99 per month, or a £2.99 Weekend Pass for 72 hours", es: "£2,99 y £4,99 por mes, o un Weekend Pass de £2,99 por 72 horas" },
            },
            {
              label: { en: "Free option", es: "Opción gratis" },
              left: { en: "A free tier that stays free", es: "Un plan gratuito que sigue siendo gratuito" },
              right: { en: "A 7-day trial — \"£0 /7d\", up to 500 tracks and 3 sets", es: "Una prueba de 7 días — \"£0 /7d\", hasta 500 temas y 3 sets" },
            },
          ],
        },
      ],
    },
    {
      id: "cuando-conviene-cada-uno",
      heading: { en: "When each one is the right call", es: "Cuándo conviene cada uno" },
      nodes: [
        {
          kind: "prose",
          markdown: {
            en: `**SetFlow is the right call** on price, and we are not going to pretend otherwise: £2.99 and £4.99 a month are below what we charge, and a £2.99 Weekend Pass for a single gig is a shape we do not offer at all. If you have one wedding next month and no interest in a subscription, that is the better deal and the comparison ends there.

It is also the right call if you want the set built for you. "A mixed set in under 3 seconds" is their promise, not ours, and if the part you want to skip is picking the running order, skipping it is the product.

**EnergyCurve is the right call** if you already chose the tracks and the order, and what you want is a second opinion on it rather than a replacement for it. Everything the analysis says is attached to a track you picked, and every fix is one you accept or reject on its own. There is also a free tier rather than a trial, which matters if the pattern is one set every couple of months.`,
            es: `**Conviene SetFlow** por precio, y no vamos a disimularlo: £2,99 y £4,99 por mes están por debajo de lo que cobramos, y un Weekend Pass de £2,99 para una sola fecha es una forma que nosotros directamente no ofrecemos. Si tenés un casamiento el mes que viene y ningún interés en suscribirte, ése es el trato que más te conviene y la comparación termina ahí.

También conviene si querés que te armen el set. "A mixed set in under 3 seconds" es la promesa de ellos, no la nuestra, y si la parte que querés saltear es elegir el running order, saltearla es el producto.

**Conviene EnergyCurve** si ya elegiste los temas y el orden, y lo que querés es una segunda opinión sobre eso en vez de un reemplazo. Todo lo que dice el análisis está pegado a un tema que elegiste vos, y cada arreglo lo aceptás o lo rechazás por separado. Además hay un plan gratuito en vez de una prueba, que importa si tu ritmo es un set cada un par de meses.`,
          },
        },
      ],
    },
    {
      id: "preguntas",
      heading: { en: "Questions", es: "Preguntas" },
      nodes: [
        {
          kind: "faq",
          entries: [
            {
              question: {
                en: "Is SetFlow cheaper than EnergyCurve?",
                es: "¿SetFlow es más barato que EnergyCurve?",
              },
              answer: {
                en: "On the published monthly prices, yes. SetFlow lists £2.99 and £4.99 per month; our paid plans are US$9.99 and US$19.99. We are not converting between the two currencies here, because a conversion goes stale the week after it is written. Both pages carry the current number.",
                es: "Según los precios publicados por mes, sí. SetFlow lista £2,99 y £4,99 por mes; nuestros planes pagos son u$s9,99 y u$s19,99. No convertimos entre las dos monedas acá, porque una conversión vence la semana siguiente a escribirla. Las dos páginas tienen el número actual.",
              },
            },
            {
              question: {
                en: "Does EnergyCurve generate a set from my whole library?",
                es: "¿EnergyCurve genera un set desde toda mi librería?",
              },
              answer: {
                en: "No. It works on a playlist you import — a set you already chose. It will reorder that set, heuristically or with AI, but it will not go shopping in your library for tracks you did not pick. If that is what you want, SetFlow's own description of itself is the honest answer.",
                es: "No. Trabaja sobre una playlist que importás — un set que ya elegiste. Va a reordenar ese set, con heurística o con IA, pero no sale a buscar en tu librería temas que vos no elegiste. Si eso es lo que querés, la descripción que SetFlow hace de sí mismo es la respuesta honesta.",
              },
            },
            {
              question: {
                en: "Both say \"energy curve\". Do they mean the same thing?",
                es: "Los dos dicen \"curva de energía\". ¿Significan lo mismo?",
              },
              answer: {
                en: "Close enough that the word is fair in both cases: the shape a set's intensity makes over time. What differs is when you see it — SetFlow draws the curve you want and builds towards it, we draw the curve your existing order already makes and compare it against the one you were aiming for.",
                es: "Lo bastante parecido como para que la palabra sea justa en los dos casos: la forma que hace la intensidad de un set a lo largo del tiempo. Lo que cambia es cuándo la ves — SetFlow dibuja la curva que querés y construye hacia ella, nosotros dibujamos la curva que tu orden actual ya hace y la comparamos contra la que buscabas.",
              },
            },
          ],
        },
        CTA,
      ],
    },
  ],
}

const LEXICON: Comparison = {
  id: "lexicon",
  competitor: "Lexicon",
  slug: { en: "lexicon", es: "lexicon" },
  verifiedAt: "2026-09-26",
  sources: [
    { label: "lexicondj.com", url: "https://www.lexicondj.com/" },
    { label: "lexicondj.com/pricing", url: "https://www.lexicondj.com/pricing" },
  ],
  title: { en: "EnergyCurve vs Lexicon", es: "EnergyCurve vs Lexicon" },
  description: {
    en: "Lexicon manages the library: converting and syncing across DJ apps. EnergyCurve analyses one set. They solve different problems, and both can be true.",
    es: "Lexicon gestiona la librería: convierte y sincroniza entre apps de DJ. EnergyCurve analiza un set. Resuelven problemas distintos y los dos pueden convivir.",
  },
  summary: {
    en: "The least overlapping pair on this list. One is about thousands of files staying in order across six programs. The other is about sixty minutes being in the right order once.",
    es: "El par que menos se cruza de esta lista. Uno es sobre miles de archivos ordenados entre seis programas. El otro, sobre sesenta minutos bien ordenados una vez.",
  },
  sections: [
    {
      id: "que-hace-cada-uno",
      heading: { en: "What each one does", es: "Qué hace cada uno" },
      nodes: [
        {
          kind: "prose",
          markdown: {
            en: `Lexicon calls itself "a robust music library management tool designed for DJs, by DJs", running "on Windows & macOS" and supporting "Rekordbox, Serato, Traktor, VirtualDJ, Engine DJ and djay Pro". Its pricing page is blunt about the split: "Lexicon is free to download and convert your library to and from any DJ app we support, this is 100% free. For the library management features, you need to upgrade to a paid package."

That is a different problem from ours, and a real one. If you have switched controllers twice and your cue points are scattered across three programs, no amount of set analysis helps you; a converter does.

EnergyCurve never looks at your library as a whole. It looks at one playlist, in the order you put it in, and asks what that hour does.`,
            es: `Lexicon se llama a sí mismo "a robust music library management tool designed for DJs, by DJs", que corre "on Windows & macOS" y soporta "Rekordbox, Serato, Traktor, VirtualDJ, Engine DJ and djay Pro". Su página de precios es clara sobre el corte: "Lexicon is free to download and convert your library to and from any DJ app we support, this is 100% free. For the library management features, you need to upgrade to a paid package."

Ése es un problema distinto del nuestro, y es real. Si cambiaste de controladora dos veces y tus cue points quedaron desparramados en tres programas, ninguna cantidad de análisis de set te ayuda; un conversor sí.

EnergyCurve nunca mira tu librería entera. Mira una playlist, en el orden que le pusiste, y pregunta qué hace esa hora.`,
          },
        },
        {
          kind: "comparacion",
          caption: {
            en: "Read from each product's own pages on 26 September 2026.",
            es: "Leído de las páginas propias de cada producto el 26 de septiembre de 2026.",
          },
          leftHeading: { en: "EnergyCurve", es: "EnergyCurve" },
          rightHeading: { en: "Lexicon", es: "Lexicon" },
          rows: [
            {
              label: { en: "The problem it solves", es: "El problema que resuelve" },
              left: { en: "Whether one set works", es: "Si un set funciona" },
              right: { en: "Whether a library stays intact across apps", es: "Si una librería se mantiene entera entre apps" },
            },
            {
              label: { en: "Library conversion between DJ apps", es: "Conversión de librería entre apps de DJ" },
              left: { en: "No", es: "No" },
              right: { en: "Yes, and free — \"this is 100% free\"", es: "Sí, y gratis — \"this is 100% free\"" },
            },
            {
              label: { en: "Energy curve of a set", es: "Curva de energía de un set" },
              left: { en: "Yes", es: "Sí" },
              right: { en: "Not advertised on their pages", es: "No lo anuncian en sus páginas" },
            },
            {
              label: { en: "Where it runs", es: "Dónde corre" },
              left: { en: "In the browser, nothing to install", es: "En el navegador, sin instalar nada" },
              right: { en: "\"Lexicon works on Windows & macOS\"", es: "\"Lexicon works on Windows & macOS\"" },
            },
            {
              label: { en: "Price", es: "Precio" },
              left: { en: "Free tier, then US$9.99 and US$19.99 per month", es: "Plan gratuito, después u$s9,99 y u$s19,99 por mes" },
              right: { en: "Free conversion; Essential US$10.49/month or US$249 lifetime, Ultimate US$20.99/month or US$499 lifetime", es: "Conversión gratis; Essential u$s10,49/mes o u$s249 de por vida, Ultimate u$s20,99/mes o u$s499 de por vida" },
            },
          ],
        },
      ],
    },
    {
      id: "cuando-conviene-cada-uno",
      heading: { en: "When each one is the right call", es: "Cuándo conviene cada uno" },
      nodes: [
        {
          kind: "prose",
          markdown: {
            en: `**Lexicon is the right call** if your problem is the library. Moving from Serato to Rekordbox without losing cue points, cleaning up duplicates, keeping two computers in agreement, backing the whole thing up. We do none of that, and if that is the pain, we are the wrong purchase.

Their conversion being free is worth knowing even if you never pay them: by their own description, converting a library to and from any supported app costs nothing.

**EnergyCurve is the right call** when the library is fine and the set is the question. It reads what your library exports and gives back an order — it does not want to own your collection, and it does not ask you to move it anywhere.

These two are the most complementary pair on this list. A library kept straight by one and a night shaped by the other do not compete for the same hour of your week.`,
            es: `**Conviene Lexicon** si tu problema es la librería. Pasar de Serato a Rekordbox sin perder cue points, limpiar duplicados, mantener dos computadoras de acuerdo, hacerle backup a todo. Nada de eso hacemos nosotros, y si ése es el dolor, somos la compra equivocada.

Que su conversión sea gratis vale la pena saberlo aunque nunca les pagues: según su propia descripción, convertir una librería desde y hacia cualquier app soportada no cuesta nada.

**Conviene EnergyCurve** cuando la librería está bien y el set es la pregunta. Lee lo que tu librería exporta y devuelve un orden — no quiere ser dueño de tu colección, y no te pide que la muevas a ningún lado.

Éste es el par más complementario de la lista. Una librería mantenida en orden por uno y una noche con forma dada por el otro no compiten por la misma hora de tu semana.`,
          },
        },
      ],
    },
    {
      id: "preguntas",
      heading: { en: "Questions", es: "Preguntas" },
      nodes: [
        {
          kind: "faq",
          entries: [
            {
              question: {
                en: "Can EnergyCurve convert my library between Rekordbox and Serato?",
                es: "¿EnergyCurve convierte mi librería entre Rekordbox y Serato?",
              },
              answer: {
                en: "No. It imports a playlist and exports a playlist, and that is the whole of its relationship with your files. Converting a library — cue points, beatgrids, folder structure — is a different job, and Lexicon describes doing it for free.",
                es: "No. Importa una playlist y exporta una playlist, y ésa es toda su relación con tus archivos. Convertir una librería — cue points, beatgrids, estructura de carpetas — es otro trabajo, y Lexicon describe hacerlo gratis.",
              },
            },
            {
              question: {
                en: "Do I have to choose between them?",
                es: "¿Tengo que elegir entre los dos?",
              },
              answer: {
                en: "No, and of the four comparisons on this site this is the one where using both makes the most obvious sense. Lexicon keeps the library coherent across the programs you use; EnergyCurve reads a playlist out of whichever of them you are playing from.",
                es: "No, y de las cuatro comparaciones de este sitio ésta es donde usar los dos tiene más sentido. Lexicon mantiene la librería coherente entre los programas que usás; EnergyCurve lee una playlist desde el que estés tocando.",
              },
            },
            {
              question: {
                en: "Does Lexicon analyse the energy of a set?",
                es: "¿Lexicon analiza la energía de un set?",
              },
              answer: {
                en: "Not as something they advertise. Their pages describe library management, conversion, editing and analysis scans across a collection. We are describing what their own pages say, not what the software may do internally — if that matters to your decision, their feature list is the place to check.",
                es: "No como algo que anuncien. Sus páginas describen gestión de librería, conversión, edición y escaneos de análisis sobre una colección. Estamos describiendo lo que dicen sus propias páginas, no lo que el software pueda hacer por dentro — si eso pesa en tu decisión, su lista de features es el lugar para mirarlo.",
              },
            },
          ],
        },
        CTA,
      ],
    },
  ],
}

/** Declaration order is the order the footer lists them in. */
export const COMPARISONS: Comparison[] = [
  MIXED_IN_KEY,
  SETFLOW,
  DJ_STUDIO,
  LEXICON,
]

export function comparisonBySlug(
  slug: string,
  locale: SiteLocale
): Comparison | undefined {
  return COMPARISONS.find((comparison) => comparison.slug[locale] === slug)
}
