import type {
  CapabilityKey,
  NON_GATED_MATRIX_ROWS,
} from "@/lib/product/capabilities"

export const supportedLocales = ["en", "es"] as const

export type SiteLocale = (typeof supportedLocales)[number]
export type ResolvedSiteCopy = ReturnType<typeof getSiteCopy>

type LocalizedLabel = Record<SiteLocale, string>

/**
 * A cell in the plan comparison table. Tokens keep the table readable and
 * mean a check mark or a "soon" badge is spelled the same way everywhere;
 * anything with real text (a quota) carries its own translation.
 *
 * "soon" is load-bearing honesty: several PRO capabilities are still being
 * built, and a pricing page must not imply you can buy them today.
 */
type PlanCell = "yes" | "no" | "soon" | LocalizedLabel

interface SiteCopySchema {
  nav: {
    features: LocalizedLabel
    how: LocalizedLabel
    story: LocalizedLabel
    faq: LocalizedLabel
    contact: LocalizedLabel
    cta: LocalizedLabel
  }
  hero: {
    title: LocalizedLabel
    subtitle: LocalizedLabel
    support: LocalizedLabel
    audienceLine: LocalizedLabel
    visual: {
      energyScore: LocalizedLabel
      peakIntensity: LocalizedLabel
      setDuration: LocalizedLabel
      /** The states the engine reports, in the brand kit's semantic colours. */
      markers: { label: LocalizedLabel; tone: "peak" | "drop" | "flat" | "close" }[]
      phases: LocalizedLabel[]
    }
    cta: {
      primary: LocalizedLabel
      secondary: LocalizedLabel
    }
  }
  features: {
    title: LocalizedLabel
    intro: LocalizedLabel
    /**
     * The section used to be five identical cards describing the product in
     * prose. This is the product's own output instead: a flagged track, the
     * move that fixes it, and the score before and after.
     */
    panel: {
      orderLabel: LocalizedLabel
      issuesBadge: LocalizedLabel
      tracks: {
        position: LocalizedLabel
        title: LocalizedLabel
        meta: LocalizedLabel
        energy: number
        score: LocalizedLabel
        flagged?: boolean
      }[]
      dropChip: LocalizedLabel
      dropWhere: LocalizedLabel
      fixText: LocalizedLabel
      applyLabel: LocalizedLabel
      scoreBefore: LocalizedLabel
      scoreAfter: LocalizedLabel
    }
    energy: {
      title: LocalizedLabel
      desc: LocalizedLabel
    }
    transition: {
      title: LocalizedLabel
      desc: LocalizedLabel
    }
    compare: {
      title: LocalizedLabel
      desc: LocalizedLabel
    }
    design: {
      title: LocalizedLabel
      desc: LocalizedLabel
    }
  }
  how: {
    title: LocalizedLabel
    step1: {
      title: LocalizedLabel
      desc: LocalizedLabel
    }
    step2: {
      title: LocalizedLabel
      desc: LocalizedLabel
    }
    step3: {
      title: LocalizedLabel
      desc: LocalizedLabel
    }
    cta: LocalizedLabel
  }
  story: {
    title: LocalizedLabel
    body: LocalizedLabel[]
  }
  /**
   * The product's position in one picture: the DJ picks the tracks, EnergyCurve
   * reads what that selection is doing, the floor hears the result. Used twice —
   * as the hero strip (compact) and as the differentiation diagram (full).
   */
  layer: {
    eyebrow: LocalizedLabel
    toolsHeading: LocalizedLabel
    toolsItems: LocalizedLabel[]
    toolsCaption: LocalizedLabel
    engineHeading: LocalizedLabel
    engineBody: LocalizedLabel
    engineCaption: LocalizedLabel
    stageHeading: LocalizedLabel
    stageBody: LocalizedLabel
    stageCaption: LocalizedLabel
  }
  diff: {
    title: LocalizedLabel
    body: LocalizedLabel
  }
  suite: {
    eyebrow: LocalizedLabel
    title: LocalizedLabel
    body: LocalizedLabel
    link: LocalizedLabel
  }
  faq: {
    eyebrow: LocalizedLabel
    title: LocalizedLabel
    intro: LocalizedLabel
    items: { q: LocalizedLabel; a: LocalizedLabel }[]
  }
  loop: {
    navLabel: LocalizedLabel
    eyebrow: LocalizedLabel
    title: LocalizedLabel
    intro: LocalizedLabel
    footNote: LocalizedLabel
    cta: LocalizedLabel
    stages: {
      title: LocalizedLabel
      /** What the stage already does on the free tier — every stage has one, so
       *  the section can't read as "everything here costs money". */
      freeNote: LocalizedLabel
      items: {
        // Joins lib/product/capabilities.ts — tests assert every item is a
        // shipped capability and the badge matches its real minPlan.
        capability: CapabilityKey
        plan: "pro" | "pro_plus"
        title: LocalizedLabel
        desc: LocalizedLabel
      }[]
    }[]
  }
  pricing: {
    navLabel: LocalizedLabel
    eyebrow: LocalizedLabel
    title: LocalizedLabel
    subtitle: LocalizedLabel
    teaserTitle: LocalizedLabel
    teaserBody: LocalizedLabel
    teaserCta: LocalizedLabel
    liveBadge: LocalizedLabel
    soonBadge: LocalizedLabel
    recommendedBadge: LocalizedLabel
    included: LocalizedLabel
    notIncluded: LocalizedLabel
    perMonth: LocalizedLabel
    perYear: LocalizedLabel
    annualPrefix: LocalizedLabel
    intervalMonthly: LocalizedLabel
    intervalYearly: LocalizedLabel
    intervalYearlyNote: LocalizedLabel
    checkoutStarting: LocalizedLabel
    checkoutError: LocalizedLabel
    plans: {
      id: string
      name: LocalizedLabel
      price: LocalizedLabel
      annual: LocalizedLabel | null
      tagline: LocalizedLabel
      highlights: { text: LocalizedLabel; soon?: boolean }[]
      live: boolean
      recommended?: boolean
      cta: LocalizedLabel
      ctaHref: string
    }[]
    matrixTitle: LocalizedLabel
    matrixLegend: LocalizedLabel
    columnCapability: LocalizedLabel
    rows: {
      /**
       * Joins this row to `lib/product/capabilities.ts`. Typed as the union of
       * registry keys plus the rows that describe the offer without gating any
       * code, so a new row can't be added without deciding which it is —
       * `tests/capabilities.test.ts` then proves the tier here matches the tier
       * the gate enforces.
       */
      key: CapabilityKey | (typeof NON_GATED_MATRIX_ROWS)[number]
      capability: LocalizedLabel
      free: PlanCell
      pro: PlanCell
      proPlus: PlanCell
    }[]
    billingTitle: LocalizedLabel
    billingBody: LocalizedLabel
    questionsTitle: LocalizedLabel
    questionsBody: LocalizedLabel
    questionsCta: LocalizedLabel
    backHome: LocalizedLabel
  }
  contact: {
    title: LocalizedLabel
    desc: LocalizedLabel
    form: {
      name: LocalizedLabel
      email: LocalizedLabel
      message: LocalizedLabel
      submit: LocalizedLabel
    }
    status: {
      sending: LocalizedLabel
      genericError: LocalizedLabel
    }
  }
  cta: {
    title: LocalizedLabel
    subtitle: LocalizedLabel
    primary: LocalizedLabel
    secondary: LocalizedLabel
  }
  footer: {
    product: LocalizedLabel
    features: LocalizedLabel
    contact: LocalizedLabel
    rights: LocalizedLabel
    description: LocalizedLabel
    madeIn: LocalizedLabel
    family: LocalizedLabel
    billing: LocalizedLabel
    resources: LocalizedLabel
    blog: LocalizedLabel
    legal: LocalizedLabel
    privacy: LocalizedLabel
    terms: LocalizedLabel
    cookies: LocalizedLabel
  }
  install: {
    bannerTitle: LocalizedLabel
    bannerBody: LocalizedLabel
    bannerCta: LocalizedLabel
    bannerDismiss: LocalizedLabel
    footerLink: LocalizedLabel
    title: LocalizedLabel
    description: LocalizedLabel
    androidTitle: LocalizedLabel
    androidSteps: LocalizedLabel[]
    iosTitle: LocalizedLabel
    iosSteps: LocalizedLabel[]
    noteTitle: LocalizedLabel
    note: LocalizedLabel
    openApp: LocalizedLabel
    backHome: LocalizedLabel
  }
  ui: {
    login: LocalizedLabel
    differentiation: LocalizedLabel
    directContact: LocalizedLabel
    previewTitle: LocalizedLabel
    previewDescription: LocalizedLabel
    earlyAccess: LocalizedLabel
    trustSignals: {
      founder: LocalizedLabel
      workflows: LocalizedLabel
      access: LocalizedLabel
    }
  }
}

const siteCopy: SiteCopySchema = {
  nav: {
    features: { en: "Features", es: "Características" },
    how: { en: "How it Works", es: "Cómo funciona" },
    story: { en: "Story", es: "Historia" },
    faq: { en: "FAQ", es: "Preguntas" },
    contact: { en: "Contact", es: "Contacto" },
    cta: { en: "Create your account", es: "Creá tu cuenta" },
  },
  hero: {
    title: {
      en: "Analyze your DJ set’s energy curve — and fix the order before you play",
      es: "Analizá la curva de energía de tu set — y arreglá el orden antes de tocar",
    },
    subtitle: {
      en: "Import from Rekordbox, Traktor, or your own audio files. EnergyCurve scores the set out of 10, draws the energy curve it actually traces, and names the exact move that fixes it — then exports the new order back to your DJ software.",
      es: "Importá desde Rekordbox, Traktor o tus propios archivos de audio. EnergyCurve puntúa el set sobre 10, dibuja la curva de energía que traza de verdad y te dice el movimiento exacto que lo arregla — y después exporta el orden nuevo de vuelta a tu software de DJ.",
    },
    support: {
      en: "Your audio never leaves your computer: tags and files are read locally in your browser. Free to start — no plugin, no install.",
      es: "Tu audio nunca sale de tu computadora: los tags y los archivos se leen localmente en tu navegador. Empezás gratis — sin plugin ni instalación.",
    },
    audienceLine: {
      en: "A set of nine certified bangers can still score 4 out of 10 — nine peaks in a row isn’t a journey. That’s the part no track analyzer looks at.",
      es: "Un set de nueve bombas puede sacar 4 de 10 — nueve picos seguidos no son un viaje. Eso es lo que ningún analizador de temas mira.",
    },
    visual: {
      energyScore: { en: "Energy score", es: "Nivel de energía" },
      peakIntensity: { en: "Peak intensity", es: "Intensidad pico" },
      setDuration: { en: "Set duration", es: "Duración del set" },
      // Wording mirrors ISSUE_MARKERS in lib/content/analysis-copy.ts, so the
      // preview shows what the product actually returns.
      markers: [
        { label: { en: "▲ Peak at 7 · 9.7", es: "▲ Pico en el 7 · 9.7" }, tone: "peak" },
        { label: { en: "Flat zone", es: "Zona plana" }, tone: "flat" },
        { label: { en: "▼ Drop −3", es: "▼ Caída −3" }, tone: "drop" },
        { label: { en: "Strong close", es: "Cierre fuerte" }, tone: "close" },
      ],
      // DJ jargon, kept in English in both locales — same as the app's x-axis.
      phases: [
        { en: "Opening", es: "Opening" },
        { en: "Build-up", es: "Build-up" },
        { en: "Peak time", es: "Peak time" },
        { en: "Closing", es: "Closing" },
      ],
    },
    cta: {
      primary: {
        en: "Create your account",
        es: "Creá tu cuenta",
      },
      secondary: {
        en: "See how it works",
        es: "Ver cómo funciona",
      },
    },
  },
  features: {
    title: {
      en: "Your set already has a shape. This is what it looks like.",
      es: "Tu set ya tiene una forma. Esto es cómo se ve.",
    },
    intro: {
      en: "Every issue comes with one concrete move and what it does to the score. You apply it, undo it, or ignore it — the last word is yours.",
      es: "Cada problema viene con un movimiento concreto y su impacto en el score. Lo aplicás, lo deshacés o lo ignorás: la última palabra es tuya.",
    },
    panel: {
      orderLabel: { en: "Current order", es: "Orden actual" },
      issuesBadge: { en: "2 things to look at", es: "2 cosas para revisar" },
      tracks: [
        {
          position: { en: "05", es: "05" },
          title: { en: "Sara Landry — Pressure", es: "Sara Landry — Pressure" },
          meta: { en: "146 BPM · 8A", es: "146 BPM · 8A" },
          energy: 82,
          score: { en: "8.2", es: "8.2" },
        },
        {
          position: { en: "06", es: "06" },
          title: { en: "Interlude", es: "Interludio" },
          meta: { en: "128 BPM · 5A", es: "128 BPM · 5A" },
          energy: 38,
          score: { en: "3.8", es: "3.8" },
          flagged: true,
        },
        {
          position: { en: "07", es: "07" },
          title: { en: "T78, Van Giessen — Emergency", es: "T78, Van Giessen — Emergency" },
          meta: { en: "150 BPM · 8A", es: "150 BPM · 8A" },
          energy: 97,
          score: { en: "9.7", es: "9.7" },
        },
      ],
      dropChip: { en: "▼ Drop −4.4", es: "▼ Caída −4.4" },
      dropWhere: { en: "between 5 and 6", es: "entre el 5 y el 6" },
      fixText: {
        en: "You're building, and track 6 kills the momentum right before the peak. Move it to position 11, where the breather actually helps.",
        es: "Venís subiendo y el tema 6 corta el envión justo antes del pico. Mandalo a la posición 11, donde el respiro sí suma.",
      },
      applyLabel: { en: "Apply the move", es: "Aplicar el movimiento" },
      scoreBefore: { en: "7.1", es: "7,1" },
      scoreAfter: { en: "8.5", es: "8,5" },
    },
    energy: {
      title: {
        en: "The whole arc, not track by track",
        es: "La curva completa, no tema por tema",
      },
      desc: {
        en: "Mixed In Key tells you what each track is. This tells you what the set is: where it builds, where it stalls, where you popped the balloon too early.",
        es: "Mixed In Key te dice qué es cada tema; esto te dice qué es el conjunto: dónde crece, dónde se estanca, dónde pinchaste el globo antes de tiempo.",
      },
    },
    transition: {
      title: {
        en: "Harmony and the jumps between consecutive tracks",
        es: "Armonía y saltos entre temas consecutivos",
      },
      desc: {
        en: "Keys that clash on the Camelot wheel and energy drops big enough to empty a floor, marked where they happen.",
        es: "Tonalidades que chocan en la rueda Camelot y caídas de energía capaces de vaciar una pista, marcadas donde pasan.",
      },
    },
    compare: {
      title: {
        en: "The fixed order goes back to the booth",
        es: "El orden corregido vuelve a la cabina",
      },
      desc: {
        en: "Rekordbox XML, Traktor NML, M3U8, CSV or TXT — with BPM, key and energy. Free on every plan, permanently.",
        es: "XML de Rekordbox, NML de Traktor, M3U8, CSV o TXT — con BPM, tonalidad y energía. Gratis en todos los planes, para siempre.",
      },
    },
    design: {
      title: {
        en: "And when there's no data, we say so",
        es: "Y si no hay dato, te lo decimos",
      },
      desc: {
        en: "When a track's energy is estimated rather than measured, it's marked as estimated. We'd rather withhold a score than invent one.",
        es: "Cuando la energía de un tema es estimada y no medida, la marcamos como estimada. Preferimos no darte un score antes que inventarte uno.",
      },
    },
  },
  how: {
    title: {
      en: "From playlist to a better set order in minutes",
      es: "De tu playlist a un mejor orden de set en minutos",
    },
    step1: {
      title: { en: "Import your playlist", es: "Importá tu playlist" },
      desc: {
        en: "Rekordbox XML, Traktor NML, M3U8, a plain tracklist, or your audio files — read locally",
        es: "XML de Rekordbox, NML de Traktor, M3U8, una tracklist pegada o tus archivos de audio — leídos localmente",
      },
    },
    step2: {
      title: { en: "Get the score and the curve", es: "Recibí el score y la curva" },
      desc: {
        en: "A 1–10 set score, the energy curve, and every issue marked where it happens",
        es: "Un score del set de 1 a 10, la curva de energía y cada problema marcado donde ocurre",
      },
    },
    step3: {
      title: { en: "Fix it and export", es: "Arreglalo y exportá" },
      desc: {
        en: "Apply the suggested moves, watch the score climb, export the new order",
        es: "Aplicá los movimientos sugeridos, mirá subir el score y exportá el orden nuevo",
      },
    },
    cta: {
      en: "Try it with your latest set",
      es: "Probalo con tu último set",
    },
  },
  story: {
    title: {
      en: "Built by a DJ (who also faced the same problem)",
      es: "Creado por un DJ (que también tuvo el mismo problema)",
    },
    body: [
      {
        en: "As a DJ and producer, I always had the same problem: sets that were technically fine and still didn’t feel like anything.",
        es: "Como DJ y productor siempre tuve el mismo problema: sets técnicamente correctos que igual no se sentían como nada.",
      },
      {
        en: "The tracks mixed. The keys matched. And somewhere in the middle the room would quietly go flat, and I’d only notice from the booth, too late to fix it.",
        es: "Los temas mezclaban. Las tonalidades coincidían. Y en algún punto del medio la pista se apagaba sin aviso, y me daba cuenta desde la cabina, tarde para arreglarlo.",
      },
      {
        en: "Rekordbox and Mixed In Key were no help here, and that isn’t their fault: they describe tracks, one at a time. Nothing I owned looked at the set as one thing.",
        es: "Rekordbox y Mixed In Key no ayudaban con eso, y no es culpa de ellos: describen temas, de a uno. Nada de lo que tenía miraba el set como una sola cosa.",
      },
      {
        en: "So I built the tool I wanted: something that reads the whole arc and tells me which track is breaking it, before the night does.",
        es: "Así que construí la herramienta que quería: algo que lea el arco completo y me diga qué tema lo está rompiendo, antes de que lo haga la noche.",
      },
      {
        en: "Now it’s open to DJs of every genre. Your ear still decides — it just gets to decide with the shape of the set in front of it.",
        es: "Ahora está abierta a DJs de todos los géneros. Tu oído sigue decidiendo — sólo que ahora decide con la forma del set adelante.",
      },
    ],
  },
  layer: {
    eyebrow: {
      en: "A layer between your selection and the floor",
      es: "Una capa entre tu selección y la pista",
    },
    toolsHeading: { en: "What you pick", es: "Lo que vos elegís" },
    toolsItems: [
      { en: "rekordbox · Traktor · Serato", es: "rekordbox · Traktor · Serato" },
      { en: "Mixed In Key, or your own files with no tags", es: "Mixed In Key, o tus archivos sin tags" },
      { en: "your ear and your judgement", es: "tu oído y tu criterio" },
    ],
    toolsCaption: {
      en: "they tell you what each track is",
      es: "te dicen qué es cada tema",
    },
    engineHeading: { en: "EnergyCurve", es: "EnergyCurve" },
    engineBody: {
      en: "Reads the whole set, scores it, and tells you which track to move.",
      es: "Lee el set completo, lo puntúa y te dice qué tema mover.",
    },
    engineCaption: {
      en: "it tells you what the set is",
      es: "te dice qué es el conjunto",
    },
    stageHeading: { en: "What happens on the floor", es: "Lo que pasa en la pista" },
    stageBody: {
      en: "Your set, in the order that actually works.",
      es: "Tu set, en el orden que de verdad funciona.",
    },
    stageCaption: {
      en: "the only thing the floor hears",
      es: "lo único que la pista escucha",
    },
  },
  diff: {
    title: {
      en: "It doesn’t replace your DJ software. It reads what your set is doing.",
      es: "No reemplaza tu software de DJ. Lee qué está haciendo tu set.",
    },
    body: {
      en: "Mixed In Key tells you what each track is. Rekordbox and Traktor store and play them. EnergyCurve is the only one that analyzes the set as a whole — where momentum builds, where transitions lose impact, and why some nights land harder than others — and hands you the moves that fix it.",
      es: "Mixed In Key te dice qué es cada tema. Rekordbox y Traktor los guardan y los reproducen. EnergyCurve es el único que analiza el set completo — dónde crece el momentum, dónde las transiciones pierden impacto y por qué algunas noches pegan más que otras — y te da los movimientos que lo arreglan.",
    },
  },
  suite: {
    // "Family", not "suite": a suite implies products sold together. These are
    // separate tools that share a team. The billing-transparency card that used
    // to live here moved to where it's actually needed — the footer keeps the
    // permanent line, /pricing carries the footnote next to the prices.
    eyebrow: { en: "Part of the StageLink family", es: "Parte de la familia StageLink" },
    title: {
      en: "EnergyCurve is part of the StageLink family",
      es: "EnergyCurve es parte de la familia StageLink",
    },
    body: {
      en: "StageLink builds tools for artists. EnergyCurve is the one built for a single craft — the DJ. Same team, same standards, same roadmap: what we learn from performers everywhere comes back into the booth.",
      es: "StageLink construye herramientas para artistas. EnergyCurve es la que está hecha para un oficio en particular: el del DJ. Mismo equipo, mismos estándares, mismo roadmap: lo que aprendemos de artistas de todo tipo vuelve a la cabina.",
    },
    link: { en: "Visit StageLink", es: "Conocé StageLink" },
  },
  faq: {
    eyebrow: { en: "Questions", es: "Preguntas" },
    title: {
      en: "Frequently asked questions",
      es: "Preguntas frecuentes",
    },
    intro: {
      en: "Short, straight answers. Anything missing, write to us — a human replies.",
      es: "Respuestas cortas y directas. Si falta algo, escribinos — responde una persona.",
    },
    items: [
      {
        q: {
          en: "What does EnergyCurve actually do?",
          es: "¿Qué hace EnergyCurve exactamente?",
        },
        a: {
          en: "EnergyCurve analyzes the order of a DJ set. It imports your playlist, resolves each track’s BPM, musical key, and energy, scores the whole set from 1 to 10, draws its energy curve, and lists the specific track moves that would improve it. You apply the moves and export the corrected order back to your DJ software.",
          es: "EnergyCurve analiza el orden de un set de DJ. Importa tu playlist, resuelve el BPM, la tonalidad y la energía de cada tema, puntúa el set completo de 1 a 10, dibuja su curva de energía y lista los movimientos concretos de temas que lo mejorarían. Vos aplicás los movimientos y exportás el orden corregido de vuelta a tu software de DJ.",
        },
      },
      {
        // Mixed In Key made 1-10 mean *per-track* energy, and that reading is
        // deeply embedded. Our 1-10 scores the whole set, so say it outright.
        q: {
          en: "Is the 1–10 score per track or for the whole set?",
          es: "¿El score de 1 a 10 es por tema o de todo el set?",
        },
        a: {
          en: "For the whole set. Mixed In Key’s familiar 1–10 rates each individual track’s energy; ours rates how well the set is put together — its energy flow, its arc, the size of the jumps between tracks. A set full of 9-energy bangers can still score 4 out of 10, because playing nine peaks in a row isn’t a journey. Per-track energy is shown separately, next to each track.",
          es: "De todo el set. El 1 a 10 conocido de Mixed In Key califica la energía de cada tema por separado; el nuestro califica qué tan bien está armado el set: su flujo de energía, su arco, el tamaño de los saltos entre temas. Un set lleno de bombas de energía 9 puede sacar 4 de 10, porque tocar nueve picos seguidos no es un viaje. La energía por tema se muestra aparte, al lado de cada uno.",
        },
      },
      {
        q: {
          en: "Which DJ software does EnergyCurve support?",
          es: "¿Con qué software de DJ funciona EnergyCurve?",
        },
        a: {
          en: "Import and export both work with Rekordbox (XML), Traktor (NML), M3U8 playlists, Rekordbox text exports, and CSV. You can also drop in your audio files directly, or paste a plain tracklist. Serato support is on the roadmap.",
          es: "El import y el export funcionan con Rekordbox (XML), Traktor (NML), playlists M3U8, exports de texto de Rekordbox y CSV. También podés soltar directamente tus archivos de audio o pegar una tracklist en texto. El soporte de Serato está en el roadmap.",
        },
      },
      {
        q: {
          en: "Do I have to upload my music?",
          es: "¿Tengo que subir mi música?",
        },
        a: {
          en: "No. When you pick audio files, EnergyCurve reads their tags in your browser and only the resulting text data (artist, title, BPM, key, energy) is sent to the server. The audio itself never leaves your computer.",
          es: "No. Cuando elegís archivos de audio, EnergyCurve lee sus tags en tu navegador y sólo se envían al servidor los datos de texto resultantes (artista, título, BPM, tonalidad, energía). El audio nunca sale de tu computadora.",
        },
      },
      {
        q: {
          en: "What if my tracks have no BPM or key tags?",
          es: "¿Y si mis temas no tienen tags de BPM ni de tonalidad?",
        },
        a: {
          en: "EnergyCurve degrades gracefully: it uses your manual value first, then the tag, then a genre-anchored estimate from BPM, and finally a position-based estimate. Every value shows which source it came from, so you always know what’s measured and what’s inferred. You can also type any value in by hand.",
          es: "EnergyCurve degrada con elegancia: usa primero tu valor manual, después el tag, después una estimación por BPM anclada al género y por último una estimación por posición. Cada valor muestra de qué fuente viene, así siempre sabés qué está medido y qué inferido. También podés escribir cualquier valor a mano.",
        },
      },
      {
        q: {
          en: "How much does EnergyCurve cost?",
          es: "¿Cuánto cuesta EnergyCurve?",
        },
        a: {
          en: "There is a free tier, and there always will be. Paid plans — PRO at US$9.99/month and PRO+ at US$19.99/month, with roughly two months free on annual — are available now and unlock real BPM analysis from your audio, unlimited playlists, and unlimited AI ordering. Your card statement will read “StageLink LLC”.",
          es: "Hay un plan gratuito, y siempre lo va a haber. Los planes pagos — PRO a u$s9,99/mes y PRO+ a u$s19,99/mes, con unos dos meses gratis en el anual — ya están disponibles y habilitan BPM real medido de tu audio, playlists ilimitadas y ordenamiento con IA ilimitado. En el resumen de tu tarjeta va a figurar “StageLink LLC”.",
        },
      },
      {
        q: {
          en: "Why does my receipt say StageLink LLC?",
          es: "¿Por qué mi recibo dice StageLink LLC?",
        },
        a: {
          en: "Because EnergyCurve is part of the StageLink family and is operated by StageLink LLC, the company behind it. Payments are processed under that name, so “StageLink LLC” is what appears on your card statement and receipts. It’s the same company that builds EnergyCurve.",
          es: "Porque EnergyCurve es parte de la familia StageLink y está operado por StageLink LLC, la empresa detrás del producto. Los pagos se procesan bajo ese nombre, así que “StageLink LLC” es lo que aparece en tu resumen de tarjeta y en los recibos. Es la misma empresa que construye EnergyCurve.",
        },
      },
      {
        q: {
          en: "Is EnergyCurve a replacement for Rekordbox or Mixed In Key?",
          es: "¿EnergyCurve reemplaza a Rekordbox o a Mixed In Key?",
        },
        a: {
          en: "No, it sits between them. Mixed In Key tells you what each track is; Rekordbox stores and plays them. EnergyCurve is the only one that analyzes the set as a whole — its narrative arc — and tells you what to change. It works alongside whatever you already use.",
          es: "No, se ubica en el medio. Mixed In Key te dice qué es cada tema; Rekordbox los guarda y los reproduce. EnergyCurve es el único que analiza el set como un todo — su arco narrativo — y te dice qué cambiar. Funciona junto a lo que ya uses.",
        },
      },
      {
        q: {
          en: "Which genres does it work with?",
          es: "¿Con qué géneros funciona?",
        },
        a: {
          en: "All of them. Genre sets the expected BPM and energy band — techno, house, drum & bass, and more are built in — and you can create your own genre and set context (opening, main time, closing) if the presets don’t match what you play.",
          es: "Con todos. El género define la banda esperada de BPM y energía — techno, house, drum & bass y más vienen incluidos — y podés crear tu propio género y contexto de set (apertura, main time, cierre) si los presets no coinciden con lo que tocás.",
        },
      },
      {
        q: {
          en: "Can I use EnergyCurve in the DJ booth without internet?",
          es: "¿Puedo usar EnergyCurve en la cabina sin internet?",
        },
        a: {
          en: "Yes. Gig Mode (PRO+) is a performance view built for the booth: big tracklist, the energy curve, and your per-track notes. Install EnergyCurve as an app, open the set before you leave, and it keeps working with no signal.",
          es: "Sí. Gig Mode (PRO+) es una vista de performance pensada para la cabina: tracklist grande, la curva de energía y tus notas por tema. Instalá EnergyCurve como app, abrí el set antes de salir, y sigue funcionando sin señal.",
        },
      },
      {
        q: {
          en: "Does EnergyCurve warn me if I'm about to repeat tracks at a residency?",
          es: "¿EnergyCurve me avisa si voy a repetir temas en una residencia?",
        },
        a: {
          en: "Yes. Residency mode (PRO+) compares your new order against the sets you marked as played at that same venue and flags the tracks you'd be repeating. It needs a venue on the playlist and at least one earlier set marked as played there.",
          es: "Sí. El modo residencia (PRO+) compara tu orden nuevo contra los sets que marcaste como tocados en ese mismo club y señala los temas que estarías repitiendo. Necesita que la playlist tenga un club asignado y al menos un set anterior marcado como tocado ahí.",
        },
      },
      {
        q: {
          en: "Can I compare what I planned with what I actually played?",
          es: "¿Puedo comparar lo que planifiqué con lo que toqué de verdad?",
        },
        a: {
          en: "Yes. After the gig, mark what you actually played and in what order, and EnergyCurve (PRO) puts the planned curve next to the real one. That's the point of the loop: the next set starts from what the floor actually got, not from memory.",
          es: "Sí. Después de la fecha, marcá qué tocaste de verdad y en qué orden, y EnergyCurve (PRO) pone la curva planificada al lado de la real. Ése es el sentido del loop: el próximo set arranca de lo que la pista recibió de verdad, no de la memoria.",
        },
      },
      {
        /**
         * The assumption this exists to kill: that sharing a set needs two paid
         * accounts. Nothing said otherwise, and the matrix puts the row in the
         * PRO+ column — so a reader concludes their B2B partner has to pay too.
         * That stops the person who *would* have paid from paying, and means the
         * collaborator who'd have arrived on FREE never hears the feature exists.
         *
         * Phrased as the question someone actually types, because this table is
         * also the FAQPage structured data an answer engine reads.
         */
        q: {
          en: "Does my B2B partner need PRO+ too, to see a set I share?",
          es: "¿Mi compañero de B2B también necesita PRO+ para ver un set que le comparto?",
        },
        a: {
          en: "No. Only the person sharing needs PRO+. Whoever you share with opens the set and leaves suggestions on any plan, including the free one — they don't even need an account when you send the invite, since the set appears for them the moment they sign up with that address. Requiring both sides to pay would make the feature only work between two subscribers, which isn't much of a feature.",
          es: "No. Sólo necesita PRO+ quien comparte. La persona con la que compartís abre el set y deja sugerencias con cualquier plan, incluido el gratuito — de hecho no necesita ni tener cuenta cuando le mandás la invitación, porque el set le aparece en el momento en que se registra con esa dirección. Pedir que paguen los dos haría que la función sólo sirva entre dos suscriptores, que no es mucha función.",
        },
      },
    ],
  },
  loop: {
    navLabel: { en: "The loop", es: "El loop" },
    eyebrow: { en: "The full loop", es: "El loop completo" },
    title: {
      en: "You build it, analyze it, fix it, play it — and what you learn comes back to the next set",
      es: "Armás, analizás, arreglás, tocás — y lo que aprendés vuelve al próximo set",
    },
    intro: {
      en: "The whole circle works on the free plan. PRO and PRO+ don't unlock it — they deepen it.",
      es: "El círculo entero funciona con el plan gratis. PRO y PRO+ no lo desbloquean: lo profundizan.",
    },
    footNote: {
      en: "The analysis, the fixes, and native export stay free, permanently.",
      es: "El análisis, los arreglos y el export nativo siguen gratis, para siempre.",
    },
    cta: { en: "See the plans", es: "Ver los planes" },
    stages: [
      {
        title: { en: "Plan", es: "Planificá" },
        freeNote: {
          en: "Import from anywhere and get the score, the curve and every issue marked.",
          es: "Importás de donde sea y ves el score, la curva y los problemas marcados.",
        },
        items: [
          {
            capability: "slot_aware_planning",
            plan: "pro",
            title: { en: "Your curve, on the real clock", es: "Tu curva, en el reloj real" },
            desc: {
              en: "Tell it when you play — \"01:00 to 03:00\" — and the curve maps to your slot. If the peak lands too early for your set time, it warns you before you burn the floor.",
              es: "Decile a qué hora tocás — \"de 01:00 a 03:00\" — y la curva se mapea a tu franja. Si el pico cae demasiado temprano para el slot, te avisa antes de quemar la pista.",
            },
          },
          {
            capability: "named_curve_shapes",
            plan: "pro",
            title: { en: "Named curve shapes", es: "Curvas con nombre" },
            desc: {
              en: "Warm-up, peak time, after-hours: pick the shape the gig calls for and the engine optimizes toward that shape, not a generic ideal.",
              es: "Warm-up, peak time, after-hours: elegí la forma que pide la fecha y el motor optimiza hacia esa forma, no hacia un ideal genérico.",
            },
          },
        ],
      },
      {
        title: { en: "Play", es: "Tocá" },
        freeNote: {
          en: "The fixed order goes back to Rekordbox, Traktor or M3U8. Always free.",
          es: "El orden corregido vuelve a Rekordbox, Traktor o M3U8. Siempre gratis.",
        },
        items: [
          {
            capability: "gig_mode",
            plan: "pro_plus",
            title: { en: "Gig Mode: the booth, offline", es: "Gig Mode: la cabina, sin internet" },
            desc: {
              en: "A show view with a big tracklist, the curve, and your per-track notes. Installs as an app and works with no signal — load the set before you leave and play easy.",
              es: "Vista de show con tracklist grande, curva y notas por tema. Se instala como app y funciona sin señal — cargá el set antes de salir y tocá tranquilo.",
            },
          },
          {
            capability: "printable_set_sheet",
            plan: "pro",
            title: { en: "Printable set sheet", es: "Set sheet imprimible" },
            desc: {
              en: "The set as a printable PDF sheet, for the booth or your phone: order, BPM, key, and energy at hand.",
              es: "El set como hoja en PDF, para la cabina o el teléfono: orden, BPM, tonalidad y energía a mano.",
            },
          },
          {
            capability: "residency_mode",
            plan: "pro_plus",
            title: { en: "Residency mode", es: "Modo residencia" },
            desc: {
              en: "\"Don't repeat what I played at this club the last few dates.\" Give the playlist a venue and the suggested order takes it into account.",
              es: "\"No me repitas lo que toqué en este club las últimas fechas.\" Cargale el club a la playlist y el orden sugerido lo tiene en cuenta.",
            },
          },
        ],
      },
      {
        title: { en: "Learn", es: "Aprendé" },
        freeNote: {
          en: "Unlimited applied fixes and automatic reordering, with no quota.",
          es: "Arreglos ilimitados y reordenamiento automático, sin cuota.",
        },
        items: [
          {
            capability: "planned_vs_played",
            plan: "pro",
            title: { en: "Planned vs. played", es: "Planificado vs. tocado" },
            desc: {
              en: "After the gig, mark what you actually played and compare the planned curve against the real one. The next set starts from that data.",
              es: "Después de la fecha, marcá qué tocaste de verdad y compará la curva planificada contra la real. El próximo set arranca con esa data.",
            },
          },
          {
            capability: "version_history",
            plan: "pro",
            title: { en: "Version history", es: "Historial de versiones" },
            desc: {
              en: "Original, with fixes applied, AI order: compare curves and scores across versions of the same set.",
              es: "Original, con arreglos aplicados, orden de la IA: compará curvas y scores entre versiones del mismo set.",
            },
          },
          {
            capability: "global_library",
            plan: "pro_plus",
            title: { en: "Your whole library", es: "Tu librería completa" },
            desc: {
              en: "Every track cross-playlist: what you repeat too much, what you never play, and two sets side by side to compare.",
              es: "Todos tus temas cross-playlist: qué repetís demasiado, qué no tocás nunca, y dos sets lado a lado para comparar.",
            },
          },
        ],
      },
    ],
  },
  pricing: {
    navLabel: { en: "Pricing", es: "Precios" },
    eyebrow: { en: "Plans", es: "Planes" },
    title: {
      en: "Simple pricing, and a free tier that stays free",
      es: "Precios simples, y un plan gratis que sigue siendo gratis",
    },
    subtitle: {
      en: "EnergyCurve is free to use, and the free tier stays free. PRO and PRO+ are available now — anything still marked “Soon” is on the roadmap and isn't included on any plan yet, paid ones included.",
      es: "EnergyCurve es gratis, y el plan gratuito sigue siendo gratis. PRO y PRO+ ya están disponibles — lo que todavía dice “Pronto” está en el roadmap y no está incluido en ningún plan, ni siquiera en los pagos.",
    },
    teaserTitle: {
      en: "Start free — and the export back to your DJ software is free too",
      es: "Empezá gratis — y el export de vuelta a tu software de DJ también es gratis",
    },
    teaserBody: {
      en: "The analysis, the energy curve, the fixes, and native export to Rekordbox, Traktor, and M3U8 all live on the free tier, permanently. PRO and PRO+ lift the limits and add real BPM analysis from your audio — both are available now.",
      es: "El análisis, la curva de energía, los arreglos y el export nativo a Rekordbox, Traktor y M3U8 están todos en el plan gratis, para siempre. PRO y PRO+ suben los límites y agregan BPM real medido de tu audio — los dos ya están disponibles.",
    },
    teaserCta: { en: "See all plans", es: "Ver todos los planes" },
    liveBadge: { en: "Available now", es: "Disponible ahora" },
    soonBadge: { en: "Soon", es: "Pronto" },
    recommendedBadge: { en: "Recommended", es: "Recomendado" },
    included: { en: "Included", es: "Incluido" },
    notIncluded: { en: "Not included", es: "No incluido" },
    perMonth: { en: "/month", es: "/mes" },
    perYear: { en: "/year", es: "/año" },
    annualPrefix: { en: "or", es: "o" },
    intervalMonthly: { en: "Monthly", es: "Mensual" },
    intervalYearly: { en: "Yearly", es: "Anual" },
    // Concrete rather than "save 17%": two months is what a DJ can picture.
    intervalYearlyNote: { en: "2 months free", es: "2 meses gratis" },
    checkoutStarting: { en: "Taking you to checkout…", es: "Te llevamos al pago…" },
    checkoutError: {
      en: "Couldn't start checkout. Try again in a moment.",
      es: "No se pudo iniciar el pago. Probá de nuevo en un momento.",
    },
    plans: [
      {
        id: "free",
        name: { en: "Free", es: "Gratis" },
        price: { en: "US$0", es: "u$s0" },
        annual: null,
        tagline: {
          en: "See your set’s curve and feel the gap. No card, no trial clock.",
          es: "Mirá la curva de tu set y sentí la diferencia. Sin tarjeta y sin reloj de prueba.",
        },
        highlights: [
          { text: { en: "3 active playlists", es: "3 playlists activas" } },
          {
            text: {
              en: "Import from every format, including your audio files",
              es: "Import de todos los formatos, incluidos tus archivos de audio",
            },
          },
          {
            text: {
              en: "Full analysis: 1–10 score, energy curve, issue markers",
              es: "Análisis completo: score de 1 a 10, curva de energía y marcadores",
            },
          },
          {
            text: {
              en: "Unlimited applied fixes",
              es: "Arreglos aplicados ilimitados",
            },
          },
          {
            // Native export stays free, permanently. It is the thing that makes
            // the tool usable at all, and paywalling it would break the loop.
            text: {
              en: "Export to Rekordbox, Traktor, M3U8, CSV, and TXT — all of it, free",
              es: "Export a Rekordbox, Traktor, M3U8, CSV y TXT — todo, gratis",
            },
          },
        ],
        live: true,
        cta: { en: "Start free", es: "Empezar gratis" },
        ctaHref: "/signup?returnTo=%2Fdashboard",
      },
      {
        id: "pro",
        name: { en: "PRO", es: "PRO" },
        price: { en: "US$9.99", es: "u$s9,99" },
        annual: { en: "US$99 / year", es: "u$s99 / año" },
        tagline: {
          en: "For the DJ who plays regularly and preps every set.",
          es: "Para el DJ que toca seguido y prepara cada set.",
        },
        highlights: [
          {
            text: {
              en: "Unlimited playlists and unlimited custom genres",
              es: "Playlists y géneros propios ilimitados",
            },
          },
          {
            text: {
              en: "3 AI orderings per month",
              es: "3 ordenamientos con IA por mes",
            },
          },
          {
            // Shipped for BPM — audio_analysis in lib/product/capabilities.ts is
            // status:"shipped" minPlan:"pro". Key detection stays "soon" in the
            // matrix (key_detection is still planned); this bullet must not claim it.
            text: {
              en: "Real BPM detected from your audio, in your browser — no tags needed",
              es: "BPM real detectado de tu audio, en tu navegador — sin necesidad de tags",
            },
          },
          {
            // Shipped — matches version_history/named_curve_shapes/planned_vs_played/
            // printable_set_sheet in lib/product/capabilities.ts, all status:"shipped"
            // minPlan:"pro", and the comparison matrix below already listed them as
            // included. These bullets were the last place still calling them "soon".
            text: {
              en: "Slot-aware planning — your curve mapped to the clock you actually play",
              es: "Planificación por horario de slot — tu curva mapeada al reloj real en que tocás",
            },
          },
          {
            text: {
              en: "Named curve shapes — warm-up, peak time, after-hours",
              es: "Curvas con nombre — warm-up, peak time, after-hours",
            },
          },
          {
            text: {
              en: "Planned vs played, set version history, and a printable set sheet",
              es: "Planificado vs. tocado, historial de versiones y set sheet imprimible",
            },
          },
        ],
        live: true,
        recommended: true,
        cta: { en: "Get PRO", es: "Quiero PRO" },
        // Fallback for a visitor without JS: the checkout button replaces this,
        // but a plain link has to land somewhere sensible rather than nowhere.
        ctaHref: "/signup?returnTo=%2Fpricing",
      },
      {
        id: "proPlus",
        name: { en: "PRO+", es: "PRO+" },
        price: { en: "US$19.99", es: "u$s19,99" },
        annual: { en: "US$199 / year", es: "u$s199 / año" },
        tagline: {
          en: "For the working professional: the booth, the whole library, no limits.",
          es: "Para el profesional: la cabina, la librería completa y sin límites.",
        },
        highlights: [
          { text: { en: "Everything in PRO", es: "Todo lo de PRO" } },
          {
            text: {
              en: "Unlimited AI ordering",
              es: "Ordenamiento con IA ilimitado",
            },
          },
          {
            text: {
              en: "B2B and B3B sets: invite other DJs to build one set together",
              es: "Sets B2B y B3B: invitá a otros DJs a armar un set juntos",
            },
            soon: true,
          },
          {
            text: {
              en: "Residency mode: never repeat what you played there last time",
              es: "Modo residencia: no repitas lo que tocaste la última vez",
            },
          },
          {
            text: {
              en: "Gig Mode: offline performance view for the booth",
              es: "Gig Mode: vista de performance offline para la cabina",
            },
          },
          {
            text: {
              en: "Global track library, priority support, and early access",
              es: "Librería global de temas, soporte prioritario y acceso anticipado",
            },
          },
        ],
        live: true,
        cta: { en: "Get PRO+", es: "Quiero PRO+" },
        ctaHref: "/signup?returnTo=%2Fpricing",
      },
    ],
    matrixTitle: {
      en: "What’s in each plan",
      es: "Qué incluye cada plan",
    },
    matrixLegend: {
      en: "“Soon” means it’s being built and isn’t available on any plan yet — including the paid ones.",
      es: "“Pronto” significa que se está construyendo y todavía no está disponible en ningún plan, ni en los pagos.",
    },
    columnCapability: { en: "Capability", es: "Función" },
    rows: [
      {
        key: "active_playlists",
        capability: { en: "Active playlists", es: "Playlists activas" },
        free: { en: "3", es: "3" },
        pro: { en: "Unlimited", es: "Ilimitadas" },
        proPlus: { en: "Unlimited", es: "Ilimitadas" },
      },
      {
        key: "import_all_formats",
        capability: {
          en: "Import (Rekordbox, Traktor, M3U8, TXT, audio files)",
          es: "Import (Rekordbox, Traktor, M3U8, TXT, archivos de audio)",
        },
        free: "yes",
        pro: "yes",
        proPlus: "yes",
      },
      {
        key: "analysis_core",
        capability: {
          en: "Analysis: score, energy curve, issue markers",
          es: "Análisis: score, curva de energía, marcadores",
        },
        free: "yes",
        pro: "yes",
        proPlus: "yes",
      },
      {
        key: "applied_fixes",
        capability: { en: "Applied fixes", es: "Arreglos aplicados" },
        // Uncapped on every tier. Applying a fix is local, instant and
        // reversible — there is no server boundary to meter, and a cap here made
        // the free tier feel broken on the interaction that demonstrates the
        // product. The differentiators are playlists, AI ordering and audio
        // analysis.
        free: "yes",
        pro: "yes",
        proPlus: "yes",
      },
      {
        key: "heuristic_reordering",
        capability: {
          en: "Heuristic reordering (no AI)",
          es: "Reordenamiento heurístico (sin IA)",
        },
        free: "yes",
        pro: "yes",
        proPlus: "yes",
      },
      {
        key: "ai_ordering",
        capability: { en: "AI ordering (Claude)", es: "Ordenamiento con IA (Claude)" },
        free: { en: "1 / month", es: "1 / mes" },
        pro: { en: "3 / month", es: "3 / mes" },
        proPlus: { en: "Unlimited", es: "Ilimitado" },
      },
      {
        key: "export_csv_txt",
        capability: { en: "Export to CSV and TXT", es: "Export a CSV y TXT" },
        free: "yes",
        pro: "yes",
        proPlus: "yes",
      },
      {
        // Free forever: exporting back to the booth is the whole point of the
        // tool, so it is never a paid upgrade.
        key: "native_export",
        capability: {
          en: "Native export (Rekordbox XML, Traktor NML, M3U8)",
          es: "Export nativo (XML de Rekordbox, NML de Traktor, M3U8)",
        },
        free: "yes",
        pro: "yes",
        proPlus: "yes",
      },
      {
        key: "custom_taxonomies",
        capability: {
          en: "Custom genres and set contexts",
          es: "Géneros y contextos de set propios",
        },
        free: { en: "2", es: "2" },
        pro: { en: "Unlimited", es: "Ilimitados" },
        proPlus: { en: "Unlimited", es: "Ilimitados" },
      },
      {
        key: "search_organization",
        capability: {
          en: "Search and organization",
          es: "Búsqueda y organización",
        },
        free: "yes",
        pro: "yes",
        proPlus: "yes",
      },
      {
        key: "audio_analysis",
        capability: {
          // Names BPM specifically rather than "real audio analysis", which a DJ
          // reads as BPM *and* key — the comparison being Mixed In Key. Key
          // detection isn't shippable yet (21% against tagged files), so
          // claiming it here would be the pricing page writing a cheque the
          // product can't cash. Widen this line when key lands.
          en: "Real BPM read from the audio, in your browser",
          es: "BPM real leído del audio, en tu navegador",
        },
        free: "no",
        pro: "yes",
        proPlus: "yes",
      },
      {
        key: "key_detection",
        capability: {
          en: "Musical key read from the audio",
          es: "Tonalidad leída del audio",
        },
        free: "no",
        pro: "soon",
        proPlus: "soon",
      },
      {
        key: "energy_model_v3",
        capability: {
          en: "Energy Model v3 (multi-feature)",
          es: "Energy Model v3 (multi-feature)",
        },
        free: "no",
        pro: "soon",
        proPlus: "soon",
      },
      {
        key: "version_history",
        capability: { en: "Set version history", es: "Historial de versiones del set" },
        free: "no",
        pro: "yes",
        proPlus: "yes",
      },
      {
        key: "slot_aware_planning",
        capability: {
          en: "Slot-aware planning (map the curve to clock time)",
          es: "Planificación por horario de slot (curva mapeada al reloj)",
        },
        free: "no",
        pro: "yes",
        proPlus: "yes",
      },
      {
        key: "named_curve_shapes",
        capability: {
          en: "Named target curve shapes (warm-up, peak time, after-hours…)",
          es: "Curvas objetivo con nombre (warm-up, peak time, after-hours…)",
        },
        free: "no",
        pro: "yes",
        proPlus: "yes",
      },
      {
        key: "custom_curve_templates",
        capability: {
          en: "Save your own curve templates",
          es: "Guardar tus propias plantillas de curva",
        },
        free: "no",
        pro: "no",
        proPlus: "yes",
      },
      {
        key: "planned_vs_played",
        capability: {
          en: "Planned vs played comparison",
          es: "Comparación entre planificado y tocado",
        },
        free: "no",
        pro: "yes",
        proPlus: "yes",
      },
      {
        key: "printable_set_sheet",
        capability: {
          en: "Printable PDF set sheet",
          es: "Set sheet imprimible en PDF",
        },
        free: "no",
        pro: "yes",
        proPlus: "yes",
      },
      {
        key: "residency_mode",
        capability: {
          en: "Residency mode (don’t repeat recent sets at a venue)",
          es: "Modo residencia (no repetir sets recientes en un club)",
        },
        free: "no",
        pro: "no",
        proPlus: "yes",
      },
      {
        key: "b2b_sets",
        /**
         * Named as what it is rather than as "collaborative sets", which promises
         * simultaneous editing this doesn't do. Someone who pays expecting to
         * co-edit and finds a read-only view plus comments has been mis-sold, and
         * the fix for that is the wording here, not a bigger feature.
         */
        capability: {
          en: "Share a set with another DJ — they see it and suggest changes (they don't need a plan)",
          es: "Compartir un set con otro DJ — lo ve y sugiere cambios (no necesita plan)",
        },
        free: "no",
        pro: "no",
        proPlus: "yes",
      },
      {
        key: "set_comparator",
        capability: {
          en: "Compare two sets — curves, harmony and repeated tracks",
          es: "Comparar dos sets — curvas, armonía y temas repetidos",
        },
        free: "no",
        pro: "no",
        proPlus: "yes",
      },
      {
        key: "gig_mode",
        capability: {
          en: "Gig Mode (offline performance view)",
          es: "Gig Mode (vista de performance offline)",
        },
        free: "no",
        pro: "no",
        proPlus: "yes",
      },
      {
        key: "global_library",
        capability: {
          en: "Global track library and insights",
          es: "Librería global de temas e insights",
        },
        free: "no",
        pro: "no",
        proPlus: "yes",
      },
      {
        key: "transition_suggestions",
        capability: {
          en: "Per-transition suggestions",
          es: "Transiciones sugeridas tema a tema",
        },
        free: "no",
        pro: "no",
        proPlus: "yes",
      },
      {
        key: "support",
        capability: { en: "Support", es: "Soporte" },
        free: { en: "Community", es: "Comunidad" },
        pro: { en: "Standard", es: "Estándar" },
        proPlus: { en: "Priority + early access", es: "Prioritario + acceso anticipado" },
      },
    ],
    // Rendered as a footnote marked with an asterisk beside the paid prices,
    // not as its own panel: it repeats what the footer already says, and a full
    // box for it read as a warning about something that isn't a problem.
    billingTitle: {
      en: "Who charges the card",
      es: "Quién cobra la tarjeta",
    },
    billingBody: {
      en: "EnergyCurve is part of the StageLink family and is operated by StageLink LLC: your card statement, invoices, and receipts read “StageLink LLC”, not “EnergyCurve”. Same company.",
      es: "EnergyCurve es parte de la familia StageLink y lo opera StageLink LLC: en tu resumen de tarjeta, las facturas y los recibos vas a leer “StageLink LLC”, no “EnergyCurve”. Es la misma empresa.",
    },
    questionsTitle: {
      en: "Still deciding?",
      es: "¿Todavía lo estás pensando?",
    },
    questionsBody: {
      en: "The free tier has no time limit, so the honest answer is: analyze a real set and see whether the fixes make sense to you. If something’s unclear, the FAQ covers the usual questions and a human answers the rest.",
      es: "El plan gratis no tiene límite de tiempo, así que la respuesta honesta es: analizá un set real y mirá si los arreglos te cierran. Si algo no queda claro, el FAQ cubre las preguntas habituales y una persona responde el resto.",
    },
    questionsCta: { en: "Read the FAQ", es: "Leer el FAQ" },
    backHome: { en: "Back to home", es: "Volver al inicio" },
  },
  contact: {
    title: { en: "Get in touch", es: "Contacto" },
    desc: {
      en: "A question, feedback, or something your set prep needs and we don’t do yet? Write to us — a human answers.",
      es: "¿Una duda, feedback o algo que te falta para preparar tus sets y todavía no hacemos? Escribinos — responde una persona.",
    },
    form: {
      name: { en: "Name", es: "Nombre" },
      email: { en: "Email", es: "Email" },
      message: { en: "Message", es: "Mensaje" },
      submit: { en: "Send message", es: "Enviar mensaje" },
    },
    status: {
      sending: { en: "Sending", es: "Enviando" },
      genericError: {
        en: "Something went wrong while sending your message. Please try again.",
        es: "Ocurrió un problema al enviar tu mensaje. Intentá nuevamente.",
      },
    },
  },
  cta: {
    title: {
      en: "Find out what your last set actually scored",
      es: "Enterate qué score sacó tu último set",
    },
    subtitle: {
      en: "Free, no card, nothing to install. Import a set you’ve already played, see the curve it drew, and read the moves that would have made it hit harder. Built for DJs, producers and performers.",
      es: "Gratis, sin tarjeta y sin instalar nada. Importá un set que ya tocaste, mirá la curva que dibujó y leé los movimientos que lo habrían hecho pegar más fuerte. Hecho para DJs, productores y performers.",
    },
    primary: { en: "Create your account", es: "Creá tu cuenta" },
    secondary: { en: "Contact us", es: "Contactanos" },
  },
  footer: {
    product: { en: "Product", es: "Producto" },
    features: { en: "Features", es: "Características" },
    contact: { en: "Contact", es: "Contacto" },
    rights: {
      en: "© EnergyCurve. All rights reserved.",
      es: "© EnergyCurve. Todos los derechos reservados.",
    },
    description: {
      en: "EnergyCurve helps DJs understand set energy, transitions, and performance flow.",
      es: "EnergyCurve ayuda a DJs a entender la energía del set, las transiciones y el flujo de la performance.",
    },
    madeIn: {
      en: "Built in Argentina — for DJs all over the world.",
      es: "Hecho en Argentina — para DJs de todo el mundo.",
    },
    family: {
      en: "Part of the StageLink family — tools for artists, this one for DJs.",
      es: "Parte de la familia StageLink — herramientas para artistas, ésta para DJs.",
    },
    billing: {
      en: "Operated by StageLink LLC. Payments and receipts appear as “StageLink LLC”.",
      es: "Operado por StageLink LLC. Los pagos y recibos aparecen como “StageLink LLC”.",
    },
    resources: { en: "Resources", es: "Recursos" },
    // Both languages call it Blog; the EN index has its own honest empty state.
    blog: { en: "Blog", es: "Blog" },
    legal: { en: "Legal", es: "Legal" },
    privacy: { en: "Privacy Policy", es: "Política de Privacidad" },
    terms: { en: "Terms of Service", es: "Términos del Servicio" },
    cookies: { en: "Cookie Policy", es: "Política de Cookies" },
  },
  install: {
    bannerTitle: {
      en: "Get the EnergyCurve app",
      es: "Descargá la app de EnergyCurve",
    },
    bannerBody: {
      en: "Add it to your home screen for the full-screen experience.",
      es: "Agregala a tu pantalla de inicio para usarla a pantalla completa.",
    },
    bannerCta: { en: "Install", es: "Instalar" },
    bannerDismiss: { en: "Dismiss", es: "Cerrar" },
    footerLink: { en: "Install the app", es: "Instalá la app" },
    title: {
      en: "Add EnergyCurve to your home screen",
      es: "Agregá EnergyCurve a tu pantalla de inicio",
    },
    description: {
      en: "EnergyCurve works in your browser and installs like an app on your phone or tablet — no app store required. Once installed, it opens straight into your dashboard.",
      es: "EnergyCurve funciona en tu navegador y se instala como una app en tu teléfono o tablet — sin pasar por ninguna tienda. Una vez instalada, se abre directo en tu dashboard.",
    },
    androidTitle: {
      en: "Android / Chrome",
      es: "Android / Chrome",
    },
    androidSteps: [
      {
        en: "Open energycurve.app in Chrome.",
        es: "Abrí energycurve.app en Chrome.",
      },
      {
        en: "Tap the ⋮ menu in the top-right corner.",
        es: "Tocá el menú ⋮ arriba a la derecha.",
      },
      {
        en: "Tap “Add to Home screen” (or “Install app”).",
        es: "Tocá “Agregar a la pantalla principal” (o “Instalar app”).",
      },
      {
        en: "Confirm — the EnergyCurve icon appears on your home screen.",
        es: "Confirmá — el ícono de EnergyCurve aparece en tu pantalla de inicio.",
      },
    ],
    iosTitle: {
      en: "iPhone / iPad (Safari)",
      es: "iPhone / iPad (Safari)",
    },
    iosSteps: [
      {
        en: "Open energycurve.app in Safari.",
        es: "Abrí energycurve.app en Safari.",
      },
      {
        en: "Tap the Share button (the square with an arrow).",
        es: "Tocá el botón Compartir (el cuadrado con la flecha).",
      },
      {
        en: "Scroll and tap “Add to Home Screen”.",
        es: "Deslizá y tocá “Agregar a pantalla de inicio”.",
      },
      {
        en: "Tap “Add” — the EnergyCurve icon appears on your home screen.",
        es: "Tocá “Agregar” — el ícono de EnergyCurve aparece en tu pantalla de inicio.",
      },
    ],
    noteTitle: {
      en: "How it opens",
      es: "Cómo se abre",
    },
    note: {
      en: "Launching the app takes you straight to your dashboard when you're logged in — otherwise you'll land on the login screen first.",
      es: "Al abrir la app vas directo a tu dashboard si ya iniciaste sesión — si no, primero ves la pantalla de login.",
    },
    openApp: { en: "Open EnergyCurve", es: "Abrir EnergyCurve" },
    backHome: { en: "Back to home", es: "Volver al inicio" },
  },
  ui: {
    login: { en: "Login", es: "Ingresar" },
    differentiation: { en: "Differentiation", es: "Diferenciación" },
    directContact: { en: "Direct contact", es: "Contacto directo" },
    previewTitle: {
      en: "EnergyCurve desktop preview",
      es: "Vista previa de EnergyCurve",
    },
    previewDescription: {
      en: "Preview of the EnergyCurve analysis interface.",
      es: "Vista previa de la interfaz de análisis de EnergyCurve.",
    },
    earlyAccess: { en: "Open access", es: "Acceso abierto" },
    trustSignals: {
      founder: {
        en: "Built by a DJ-producer solving a real set-planning problem.",
        es: "Creado por un DJ-productor resolviendo un problema real de planificación de sets.",
      },
      workflows: {
        en: "Designed for real set prep, not just library management.",
        es: "Diseñado para preparar sets de verdad, no sólo para gestionar librerías.",
      },
      access: {
        en: "Now onboarding early users directly into the product.",
        es: "Ya estamos incorporando early users directamente al producto.",
      },
    },
  },
}

/** Resolved shape of a plan-matrix cell: a token the table renders as an
 *  icon/badge, or plain text for quotas. */
export type ResolvedPlanCell =
  | { kind: "yes" }
  | { kind: "no" }
  | { kind: "soon" }
  | { kind: "text"; text: string }

function resolvePlanCell(cell: PlanCell, locale: SiteLocale): ResolvedPlanCell {
  if (cell === "yes" || cell === "no" || cell === "soon") {
    return { kind: cell }
  }

  return { kind: "text", text: cell[locale] }
}

export function getSiteCopy(locale: SiteLocale = "en") {
  return {
    /**
     * The locale this copy was resolved for.
     *
     * Carried on the object because every internal link now has a per-language
     * URL (`/pricing` vs `/es/pricing`), and every component that renders one
     * already receives `copy`. Threading a second `locale` prop through the
     * section tree in parallel would just create a way for the two to disagree.
     */
    locale,
    nav: {
      features: siteCopy.nav.features[locale],
      how: siteCopy.nav.how[locale],
      story: siteCopy.nav.story[locale],
      faq: siteCopy.nav.faq[locale],
      contact: siteCopy.nav.contact[locale],
      cta: siteCopy.nav.cta[locale],
    },
    hero: {
      title: siteCopy.hero.title[locale],
      subtitle: siteCopy.hero.subtitle[locale],
      support: siteCopy.hero.support[locale],
      audienceLine: siteCopy.hero.audienceLine[locale],
      visual: {
        energyScore: siteCopy.hero.visual.energyScore[locale],
        peakIntensity: siteCopy.hero.visual.peakIntensity[locale],
        setDuration: siteCopy.hero.visual.setDuration[locale],
        markers: siteCopy.hero.visual.markers.map((marker) => ({
          label: marker.label[locale],
          tone: marker.tone,
        })),
        phases: siteCopy.hero.visual.phases.map((phase) => phase[locale]),
      },
      cta: {
        primary: siteCopy.hero.cta.primary[locale],
        secondary: siteCopy.hero.cta.secondary[locale],
      },
    },
    features: {
      title: siteCopy.features.title[locale],
      intro: siteCopy.features.intro[locale],
      panel: {
        orderLabel: siteCopy.features.panel.orderLabel[locale],
        issuesBadge: siteCopy.features.panel.issuesBadge[locale],
        tracks: siteCopy.features.panel.tracks.map((track) => ({
          position: track.position[locale],
          title: track.title[locale],
          meta: track.meta[locale],
          energy: track.energy,
          score: track.score[locale],
          flagged: track.flagged ?? false,
        })),
        dropChip: siteCopy.features.panel.dropChip[locale],
        dropWhere: siteCopy.features.panel.dropWhere[locale],
        fixText: siteCopy.features.panel.fixText[locale],
        applyLabel: siteCopy.features.panel.applyLabel[locale],
        scoreBefore: siteCopy.features.panel.scoreBefore[locale],
        scoreAfter: siteCopy.features.panel.scoreAfter[locale],
      },
      cards: [
        {
          title: siteCopy.features.energy.title[locale],
          description: siteCopy.features.energy.desc[locale],
          key: "energy",
        },
        {
          title: siteCopy.features.transition.title[locale],
          description: siteCopy.features.transition.desc[locale],
          key: "transition",
        },
        {
          title: siteCopy.features.compare.title[locale],
          description: siteCopy.features.compare.desc[locale],
          key: "compare",
        },
        {
          title: siteCopy.features.design.title[locale],
          description: siteCopy.features.design.desc[locale],
          key: "design",
        },
      ],
    },
    how: {
      title: siteCopy.how.title[locale],
      cta: siteCopy.how.cta[locale],
      steps: [
        {
          title: siteCopy.how.step1.title[locale],
          description: siteCopy.how.step1.desc[locale],
        },
        {
          title: siteCopy.how.step2.title[locale],
          description: siteCopy.how.step2.desc[locale],
        },
        {
          title: siteCopy.how.step3.title[locale],
          description: siteCopy.how.step3.desc[locale],
        },
      ],
    },
    story: {
      title: siteCopy.story.title[locale],
      paragraphs: siteCopy.story.body.map((entry) => entry[locale]),
    },
    layer: {
      eyebrow: siteCopy.layer.eyebrow[locale],
      toolsHeading: siteCopy.layer.toolsHeading[locale],
      toolsItems: siteCopy.layer.toolsItems.map((item) => item[locale]),
      toolsCaption: siteCopy.layer.toolsCaption[locale],
      engineHeading: siteCopy.layer.engineHeading[locale],
      engineBody: siteCopy.layer.engineBody[locale],
      engineCaption: siteCopy.layer.engineCaption[locale],
      stageHeading: siteCopy.layer.stageHeading[locale],
      stageBody: siteCopy.layer.stageBody[locale],
      stageCaption: siteCopy.layer.stageCaption[locale],
    },
    diff: {
      title: siteCopy.diff.title[locale],
      body: siteCopy.diff.body[locale],
    },
    suite: {
      eyebrow: siteCopy.suite.eyebrow[locale],
      title: siteCopy.suite.title[locale],
      body: siteCopy.suite.body[locale],
      link: siteCopy.suite.link[locale],
    },
    faq: {
      eyebrow: siteCopy.faq.eyebrow[locale],
      title: siteCopy.faq.title[locale],
      intro: siteCopy.faq.intro[locale],
      items: siteCopy.faq.items.map((item) => ({
        question: item.q[locale],
        answer: item.a[locale],
      })),
    },
    loop: {
      navLabel: siteCopy.loop.navLabel[locale],
      eyebrow: siteCopy.loop.eyebrow[locale],
      title: siteCopy.loop.title[locale],
      intro: siteCopy.loop.intro[locale],
      footNote: siteCopy.loop.footNote[locale],
      cta: siteCopy.loop.cta[locale],
      stages: siteCopy.loop.stages.map((stage) => ({
        title: stage.title[locale],
        freeNote: stage.freeNote[locale],
        items: stage.items.map((item) => ({
          capability: item.capability,
          plan: item.plan,
          title: item.title[locale],
          desc: item.desc[locale],
        })),
      })),
    },
    pricing: {
      navLabel: siteCopy.pricing.navLabel[locale],
      eyebrow: siteCopy.pricing.eyebrow[locale],
      title: siteCopy.pricing.title[locale],
      subtitle: siteCopy.pricing.subtitle[locale],
      teaserTitle: siteCopy.pricing.teaserTitle[locale],
      teaserBody: siteCopy.pricing.teaserBody[locale],
      teaserCta: siteCopy.pricing.teaserCta[locale],
      liveBadge: siteCopy.pricing.liveBadge[locale],
      soonBadge: siteCopy.pricing.soonBadge[locale],
      recommendedBadge: siteCopy.pricing.recommendedBadge[locale],
      included: siteCopy.pricing.included[locale],
      notIncluded: siteCopy.pricing.notIncluded[locale],
      perMonth: siteCopy.pricing.perMonth[locale],
      perYear: siteCopy.pricing.perYear[locale],
      annualPrefix: siteCopy.pricing.annualPrefix[locale],
      intervalMonthly: siteCopy.pricing.intervalMonthly[locale],
      intervalYearly: siteCopy.pricing.intervalYearly[locale],
      intervalYearlyNote: siteCopy.pricing.intervalYearlyNote[locale],
      checkoutStarting: siteCopy.pricing.checkoutStarting[locale],
      checkoutError: siteCopy.pricing.checkoutError[locale],
      plans: siteCopy.pricing.plans.map((plan) => ({
        id: plan.id,
        name: plan.name[locale],
        price: plan.price[locale],
        annual: plan.annual ? plan.annual[locale] : null,
        tagline: plan.tagline[locale],
        highlights: plan.highlights.map((entry) => ({
          text: entry.text[locale],
          soon: entry.soon ?? false,
        })),
        live: plan.live,
        recommended: plan.recommended ?? false,
        cta: plan.cta[locale],
        ctaHref: plan.ctaHref,
      })),
      matrixTitle: siteCopy.pricing.matrixTitle[locale],
      matrixLegend: siteCopy.pricing.matrixLegend[locale],
      columnCapability: siteCopy.pricing.columnCapability[locale],
      rows: siteCopy.pricing.rows.map((row) => ({
        // Carried through so the table can key React children off something
        // stable and, later, link a locked row to its upgrade CTA.
        key: row.key,
        capability: row.capability[locale],
        free: resolvePlanCell(row.free, locale),
        pro: resolvePlanCell(row.pro, locale),
        proPlus: resolvePlanCell(row.proPlus, locale),
      })),
      billingTitle: siteCopy.pricing.billingTitle[locale],
      billingBody: siteCopy.pricing.billingBody[locale],
      questionsTitle: siteCopy.pricing.questionsTitle[locale],
      questionsBody: siteCopy.pricing.questionsBody[locale],
      questionsCta: siteCopy.pricing.questionsCta[locale],
      backHome: siteCopy.pricing.backHome[locale],
    },
    contact: {
      title: siteCopy.contact.title[locale],
      description: siteCopy.contact.desc[locale],
      locale,
      form: {
        name: siteCopy.contact.form.name[locale],
        email: siteCopy.contact.form.email[locale],
        message: siteCopy.contact.form.message[locale],
        submit: siteCopy.contact.form.submit[locale],
      },
      status: {
        sending: siteCopy.contact.status.sending[locale],
        genericError: siteCopy.contact.status.genericError[locale],
      },
    },
    cta: {
      title: siteCopy.cta.title[locale],
      subtitle: siteCopy.cta.subtitle[locale],
      primary: siteCopy.cta.primary[locale],
      secondary: siteCopy.cta.secondary[locale],
    },
    footer: {
      product: siteCopy.footer.product[locale],
      features: siteCopy.footer.features[locale],
      contact: siteCopy.footer.contact[locale],
      rights: siteCopy.footer.rights[locale],
      description: siteCopy.footer.description[locale],
      madeIn: siteCopy.footer.madeIn[locale],
      family: siteCopy.footer.family[locale],
      billing: siteCopy.footer.billing[locale],
      resources: siteCopy.footer.resources[locale],
      blog: siteCopy.footer.blog[locale],
      legal: siteCopy.footer.legal[locale],
      privacy: siteCopy.footer.privacy[locale],
      terms: siteCopy.footer.terms[locale],
      cookies: siteCopy.footer.cookies[locale],
    },
    install: {
      bannerTitle: siteCopy.install.bannerTitle[locale],
      bannerBody: siteCopy.install.bannerBody[locale],
      bannerCta: siteCopy.install.bannerCta[locale],
      bannerDismiss: siteCopy.install.bannerDismiss[locale],
      footerLink: siteCopy.install.footerLink[locale],
      title: siteCopy.install.title[locale],
      description: siteCopy.install.description[locale],
      androidTitle: siteCopy.install.androidTitle[locale],
      androidSteps: siteCopy.install.androidSteps.map((step) => step[locale]),
      iosTitle: siteCopy.install.iosTitle[locale],
      iosSteps: siteCopy.install.iosSteps.map((step) => step[locale]),
      noteTitle: siteCopy.install.noteTitle[locale],
      note: siteCopy.install.note[locale],
      openApp: siteCopy.install.openApp[locale],
      backHome: siteCopy.install.backHome[locale],
    },
    ui: {
      login: siteCopy.ui.login[locale],
      differentiation: siteCopy.ui.differentiation[locale],
      directContact: siteCopy.ui.directContact[locale],
      previewTitle: siteCopy.ui.previewTitle[locale],
      previewDescription: siteCopy.ui.previewDescription[locale],
      earlyAccess: siteCopy.ui.earlyAccess[locale],
      trustSignals: {
        founder: siteCopy.ui.trustSignals.founder[locale],
        workflows: siteCopy.ui.trustSignals.workflows[locale],
        access: siteCopy.ui.trustSignals.access[locale],
      },
    },
  }
}
