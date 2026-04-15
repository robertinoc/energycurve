export const supportedLocales = ["en", "es"] as const

export type SiteLocale = (typeof supportedLocales)[number]
export type ResolvedSiteCopy = ReturnType<typeof getSiteCopy>

type LocalizedLabel = Record<SiteLocale, string>

interface SiteCopySchema {
  nav: {
    features: LocalizedLabel
    how: LocalizedLabel
    story: LocalizedLabel
    contact: LocalizedLabel
    cta: LocalizedLabel
  }
  hero: {
    title: LocalizedLabel
    subtitle: LocalizedLabel
    support: LocalizedLabel
    audienceLine: LocalizedLabel
    audienceTags: LocalizedLabel[]
    visual: {
      energyScore: LocalizedLabel
      peakIntensity: LocalizedLabel
      setDuration: LocalizedLabel
      tags: LocalizedLabel[]
    }
    cta: {
      primary: LocalizedLabel
      secondary: LocalizedLabel
    }
  }
  features: {
    title: LocalizedLabel
    intro: LocalizedLabel
    energy: {
      title: LocalizedLabel
      desc: LocalizedLabel
    }
    transition: {
      title: LocalizedLabel
      desc: LocalizedLabel
    }
    track: {
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
  diff: {
    title: LocalizedLabel
    body: LocalizedLabel
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
  }
  ui: {
    login: LocalizedLabel
    builtFor: LocalizedLabel
    firstOutput: LocalizedLabel
    whyTrust: LocalizedLabel
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
    story: { en: "Founder Story", es: "Historia del fundador" },
    contact: { en: "Contact", es: "Contacto" },
    cta: { en: "Create your account", es: "Creá tu cuenta" },
  },
  hero: {
    title: {
      en: "Design better performances with better energy",
      es: "Diseñá mejores performances con mejor energía",
    },
    subtitle: {
      en: "EnergyCurve analyzes your DJ mixes, track transitions, and performance flow so you can see how energy rises, drops, and moves across a set.",
      es: "EnergyCurve analiza tus mixes de DJ, las transiciones entre tracks y el flujo de la performance para que puedas ver cómo la energía sube, cae y se mueve a lo largo del set.",
    },
    support: {
      en: "Upload a mix or playlist and get an instant visual read of peaks, drops, transition quality, and overall set momentum.",
      es: "Subí un mix o playlist y obtené una lectura visual inmediata de picos, caídas, calidad de transición y momentum general del set.",
    },
    audienceLine: {
      en: "Built for DJs, producers, and performers who want to design better performances, not just manage tracks.",
      es: "Pensado para DJs, productores y performers que quieren diseñar mejores performances, no sólo gestionar tracks.",
    },
    audienceTags: [
      { en: "DJs", es: "DJs" },
      { en: "Producers", es: "Productores" },
      { en: "Performers", es: "Performers" },
    ],
    visual: {
      energyScore: { en: "Energy score", es: "Nivel de energía" },
      peakIntensity: { en: "Peak intensity", es: "Intensidad pico" },
      setDuration: { en: "Set duration", es: "Duración del set" },
      tags: [
        { en: "Cold opening", es: "Inicio frío" },
        { en: "Track rise", es: "Subida de track" },
        { en: "Set arc %", es: "Arco del set %" },
        { en: "Teaser", es: "Teaser" },
        { en: "Stand easy", es: "Salida suave" },
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
      en: "Understand what your set is actually doing",
      es: "Entendé qué está haciendo realmente tu set",
    },
    intro: {
      en: "Go beyond playlist prep with DJ set analysis that reveals energy flow, transition quality, and the structure behind your strongest mixes.",
      es: "Andá más allá de preparar playlists con un análisis de sets de DJ que revela flujo de energía, calidad de transición y la estructura detrás de tus mixes más fuertes.",
    },
    energy: {
      title: {
        en: "See the full energy arc",
        es: "Visualizá el arco completo de energía",
      },
      desc: {
        en: "Visualize how energy rises, plateaus, and drops across your full set so peak moments and flat stretches are obvious.",
        es: "Visualizá cómo la energía sube, se sostiene y cae a lo largo de todo el set para detectar enseguida picos y momentos planos.",
      },
    },
    transition: {
      title: {
        en: "Understand your transitions",
        es: "Entendé tus transiciones",
      },
      desc: {
        en: "See where transitions feel smooth, abrupt, or disconnected and improve the flow between tracks.",
        es: "Detectá dónde las transiciones se sienten fluidas, abruptas o desconectadas y mejorá el flujo entre tracks.",
      },
    },
    track: {
      title: {
        en: "Break it down track by track",
        es: "Analizá track por track",
      },
      desc: {
        en: "Understand how each track shapes the structure, pacing, and emotional direction of the whole performance.",
        es: "Entendé cómo cada track moldea la estructura, el pacing y la dirección emocional de toda la performance.",
      },
    },
    compare: {
      title: {
        en: "Compare your best sets",
        es: "Compará tus mejores sets",
      },
      desc: {
        en: "Compare your strongest performances, find recurring patterns, and repeat what actually works on the dancefloor.",
        es: "Compará tus performances más fuertes, encontrá patrones repetibles y repetí lo que realmente funciona en la pista.",
      },
    },
    design: {
      title: {
        en: "Design your sets with intention",
        es: "Diseñá tus sets con intención",
      },
      desc: {
        en: "Move from improvisation to control by shaping energy progression before you play.",
        es: "Pasá de improvisar a tener control diseñando la progresión de energía antes de tocar.",
      },
    },
  },
  how: {
    title: {
      en: "From mix to insight in minutes",
      es: "De tu mix a insights en minutos",
    },
    step1: {
      title: { en: "Upload your set", es: "Subí tu set" },
      desc: { en: "Import your mix or playlist", es: "Importá tu mix o playlist" },
    },
    step2: {
      title: { en: "Analyze automatically", es: "Análisis automático" },
      desc: {
        en: "EnergyCurve processes structure, transitions, and energy flow",
        es: "EnergyCurve analiza estructura, transiciones y energía",
      },
    },
    step3: {
      title: { en: "Explore insights", es: "Explorá insights" },
      desc: {
        en: "Visualize and understand what’s really happening in your set",
        es: "Visualizá y entendé qué pasa en tu set",
      },
    },
    cta: {
      en: "Try it with your latest set",
      es: "Probalo con tu último set",
    },
  },
  story: {
    title: {
      en: "Built by a DJ who faced the same problem",
      es: "Creado por un DJ que tuvo el mismo problema",
    },
    body: [
      {
        en: "As a DJ and producer, I’ve always struggled with one thing: building sets that feel right — not just technically, but energetically.",
        es: "Como DJ y productor, siempre tuve un problema: lograr sets que se sientan bien energéticamente.",
      },
      {
        en: "Getting the energy flow right takes time. A lot of time.",
        es: "Lograr un buen flujo de energía lleva mucho tiempo.",
      },
      {
        en: "And most tools don’t really help. They stop at track management — like Rekordbox — but don’t go deeper into performance understanding.",
        es: "Y la mayoría de las herramientas no ayudan más allá de organizar tracks.",
      },
      {
        en: "So I decided to build something I actually needed.",
        es: "Entonces decidí crear algo que realmente necesitaba.",
      },
      {
        en: "A tool to analyze, understand, and improve my sets.",
        es: "Una herramienta para analizar y mejorar mis sets.",
      },
      {
        en: "And now, I’m sharing it with DJs everywhere — regardless of genre — so we can all create better performances.",
        es: "Y ahora lo comparto con DJs de todos los géneros para que todos podamos crear mejores performances.",
      },
      {
        en: "EnergyCurve is the tool I wanted when I was trying to understand not just what I played, but how the room actually felt because of it.",
        es: "EnergyCurve es la herramienta que me hubiera gustado tener cuando intentaba entender no sólo qué estaba tocando, sino cómo se sentía realmente la pista por eso.",
      },
    ],
  },
  diff: {
    title: {
      en: "Not a DJ software. A performance intelligence layer.",
      es: "No es software de DJ. Es inteligencia de performance.",
    },
    body: {
      en: "Your DJ software helps you manage and perform tracks. EnergyCurve helps you understand what your set is doing — where momentum builds, where transitions lose impact, and why some performances land harder than others.",
      es: "Tu software de DJ te ayuda a gestionar y ejecutar tracks. EnergyCurve te ayuda a entender qué está haciendo tu set: dónde crece el momentum, dónde las transiciones pierden impacto y por qué algunas performances pegan más que otras.",
    },
  },
  contact: {
    title: { en: "Get in touch", es: "Contacto" },
    desc: {
      en: "Want early access, have feedback, or want to collaborate on the future of DJ performance intelligence? Reach out.",
      es: "¿Querés acceso anticipado, tenés feedback o querés colaborar en el futuro de la inteligencia para performances de DJs? Escribinos.",
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
      en: "Start shaping better sets today",
      es: "Empezá a moldear mejores sets hoy",
    },
    subtitle: {
      en: "Create an account, explore your set energy, and build performances with more control.",
      es: "Creá tu cuenta, explorá la energía de tus sets y construí performances con más control.",
    },
    primary: { en: "Create your account", es: "Creá tu cuenta" },
    secondary: { en: "Contact the founder", es: "Contactar al fundador" },
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
  },
  ui: {
    login: { en: "Login", es: "Ingresar" },
    builtFor: { en: "Built for", es: "Creado para" },
    firstOutput: { en: "What you get first", es: "Qué obtenés primero" },
    whyTrust: { en: "Why trust it", es: "Por qué confiar" },
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

export function getSiteCopy(locale: SiteLocale = "en") {
  return {
    nav: {
      features: siteCopy.nav.features[locale],
      how: siteCopy.nav.how[locale],
      story: siteCopy.nav.story[locale],
      contact: siteCopy.nav.contact[locale],
      cta: siteCopy.nav.cta[locale],
    },
    hero: {
      title: siteCopy.hero.title[locale],
      subtitle: siteCopy.hero.subtitle[locale],
      support: siteCopy.hero.support[locale],
      audienceLine: siteCopy.hero.audienceLine[locale],
      audienceTags: siteCopy.hero.audienceTags.map((entry) => entry[locale]),
      visual: {
        energyScore: siteCopy.hero.visual.energyScore[locale],
        peakIntensity: siteCopy.hero.visual.peakIntensity[locale],
        setDuration: siteCopy.hero.visual.setDuration[locale],
        tags: siteCopy.hero.visual.tags.map((entry) => entry[locale]),
      },
      cta: {
        primary: siteCopy.hero.cta.primary[locale],
        secondary: siteCopy.hero.cta.secondary[locale],
      },
    },
    features: {
      title: siteCopy.features.title[locale],
      intro: siteCopy.features.intro[locale],
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
          title: siteCopy.features.track.title[locale],
          description: siteCopy.features.track.desc[locale],
          key: "track",
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
    diff: {
      title: siteCopy.diff.title[locale],
      body: siteCopy.diff.body[locale],
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
    },
    ui: {
      login: siteCopy.ui.login[locale],
      builtFor: siteCopy.ui.builtFor[locale],
      firstOutput: siteCopy.ui.firstOutput[locale],
      whyTrust: siteCopy.ui.whyTrust[locale],
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
