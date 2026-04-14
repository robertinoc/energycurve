export const supportedLocales = ["en", "es"] as const

export type SiteLocale = (typeof supportedLocales)[number]

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
    cta: {
      primary: LocalizedLabel
      secondary: LocalizedLabel
    }
  }
  features: {
    title: LocalizedLabel
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
  }
}

const siteCopy: SiteCopySchema = {
  nav: {
    features: { en: "Features", es: "Features" },
    how: { en: "How it Works", es: "Cómo funciona" },
    story: { en: "Story", es: "Historia" },
    contact: { en: "Contact", es: "Contacto" },
    cta: { en: "Get Early Access", es: "Acceso anticipado" },
  },
  hero: {
    title: {
      en: "Design better performances with better energy",
      es: "Diseñá mejores performances con mejor energía",
    },
    subtitle: {
      en: "EnergyCurve analyzes your mixes, tracks, and transitions to reveal the hidden energy flow behind every great set.",
      es: "EnergyCurve analiza tus mixes, tracks y transiciones para revelar el flujo de energía detrás de cada gran set.",
    },
    support: {
      en: "Designed for DJs, producers, and performers exploring the intersection of music energy and data.",
      es: "Diseñado para DJs, productores y performers que exploran la intersección entre energía musical y datos.",
    },
    cta: {
      primary: {
        en: "Start analyzing your sets",
        es: "Empezar a analizar tus sets",
      },
      secondary: {
        en: "See how it works",
        es: "Ver cómo funciona",
      },
    },
  },
  features: {
    title: {
      en: "Understand your sets like never before",
      es: "Entendé tus sets como nunca antes",
    },
    energy: {
      title: {
        en: "See your set like never before",
        es: "Visualizá tu set como nunca antes",
      },
      desc: {
        en: "Visualize the rise and fall of energy across your entire set. Instantly identify peaks, drops, and flat moments.",
        es: "Visualizá la energía de tu set y detectá picos, caídas y momentos planos.",
      },
    },
    transition: {
      title: {
        en: "Understand your transitions",
        es: "Entendé tus transiciones",
      },
      desc: {
        en: "Analyze how your tracks connect — smooth, abrupt, or mismatched — and improve your flow.",
        es: "Analizá cómo conectan tus tracks y mejorá el flujo.",
      },
    },
    track: {
      title: {
        en: "Break it down track by track",
        es: "Analizá track por track",
      },
      desc: {
        en: "Understand how each track contributes to the overall energy and structure of your set.",
        es: "Entendé cómo cada track impacta en la energía del set.",
      },
    },
    compare: {
      title: {
        en: "Compare your best sets",
        es: "Compará tus mejores sets",
      },
      desc: {
        en: "Identify patterns across your performances and replicate what actually works.",
        es: "Detectá patrones y replicá lo que funciona.",
      },
    },
    design: {
      title: {
        en: "Design your sets with intention",
        es: "Diseñá tus sets con intención",
      },
      desc: {
        en: "Move from improvisation to control. Shape your sets based on energy progression and emotional impact.",
        es: "Pasá de improvisar a diseñar con control.",
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
        es: "Y ahora lo comparto con DJs de todos los géneros.",
      },
    ],
  },
  diff: {
    title: {
      en: "Not a DJ software. A performance intelligence layer.",
      es: "No es software de DJ. Es inteligencia de performance.",
    },
    body: {
      en: "It upgrades how you understand what you play — and helps you predict your audience energy.",
      es: "Mejora cómo entendés lo que tocás y te ayuda a predecir la energía del público.",
    },
  },
  contact: {
    title: { en: "Get in touch", es: "Contacto" },
    desc: {
      en: "Have questions, ideas, or want to collaborate? Reach out.",
      es: "¿Tenés preguntas o ideas? Escribinos.",
    },
    form: {
      name: { en: "Name", es: "Nombre" },
      email: { en: "Email", es: "Email" },
      message: { en: "Message", es: "Mensaje" },
      submit: { en: "Send message", es: "Enviar mensaje" },
    },
  },
  cta: {
    title: {
      en: "Start designing better performances today",
      es: "Empezá a diseñar mejores performances hoy",
    },
    subtitle: {
      en: "Gain more control over your sets and the energy on the dancefloor",
      es: "Tomá control de la energía en la pista",
    },
    primary: { en: "Get early access", es: "Acceso anticipado" },
    secondary: { en: "Join the waitlist", es: "Unirme a la lista" },
  },
  footer: {
    product: { en: "Product", es: "Producto" },
    features: { en: "Features", es: "Features" },
    contact: { en: "Contact", es: "Contacto" },
    rights: {
      en: "© EnergyCurve. All rights reserved.",
      es: "© EnergyCurve. Todos los derechos reservados.",
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
      cta: {
        primary: siteCopy.hero.cta.primary[locale],
        secondary: siteCopy.hero.cta.secondary[locale],
      },
    },
    features: {
      title: siteCopy.features.title[locale],
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
      form: {
        name: siteCopy.contact.form.name[locale],
        email: siteCopy.contact.form.email[locale],
        message: siteCopy.contact.form.message[locale],
        submit: siteCopy.contact.form.submit[locale],
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
    },
  }
}
