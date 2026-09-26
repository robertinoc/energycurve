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

/**
 * The first real guide, and the article the whole plan assumes exists.
 *
 * What makes it a guide rather than a long article is that the components
 * show what the prose explains: a curve drawn beside the paragraph that
 * describes it teaches more than three paragraphs would. Each one is here for
 * what it clarifies, not to use them all — the draft above already proves the
 * machinery.
 *
 * Two rules it must not break: the energy scale is read from the engine's
 * constants by `<EscalaEnergia>` and never written down here as numbers, and
 * the harmonic rules live in `lib/music/harmonic-transitions.ts` — the guide
 * sends the reader to the wheel rather than restating them.
 */
const GUIA_CURVA_DE_ENERGIA: Guide = {
  id: "curva-de-energia",
  slug: { es: "curva-de-energia-en-un-set-de-dj", en: "energy-curve-in-a-dj-set" },
  updatedAt: "2026-09-26",
  title: {
    es: "La curva de energía en un set de DJ: qué es, cómo se lee y cómo se arregla",
    en: "The energy curve in a DJ set: what it is, how to read it, how to fix it",
  },
  description: {
    es: "Qué es la curva de energía de un set, de dónde sale el número de cada tema, las formas que toma según el horario y cómo leer la tuya antes de tocar.",
    en: "What a DJ set's energy curve is, where each track's number comes from, the shapes it takes by slot, and how to read your own before you play it.",
  },
  summary: {
    es: "Todo set tiene una forma, la hayas dibujado o no. Esta guía es para verla antes de tocar: qué mide la curva, qué formas son normales, qué errores se ven a simple vista y qué hacer con ellos.",
    en: "Every set has a shape, whether you drew it or not. This guide is for seeing it before you play: what the curve measures, which shapes are normal, which mistakes are visible at a glance, and what to do about them.",
  },
  sections: [
    {
      id: "que-es",
      heading: { es: "Qué es la curva de energía", en: "What the energy curve is" },
      nodes: [
        {
          kind: "prose",
          markdown: {
            es: `La [curva de energía](/es/glosario/curva-de-energia) de un set es la línea que se dibuja cuando ponés, en orden de reproducción, cuánta energía tiene cada tema. Un número por tema, unidos en el orden en que van a sonar. Nada más que eso — y es lo único que muestra la forma de la noche antes de que la noche pase.

Conviene separar dos cosas que se confunden todo el tiempo. La [energía de un tema](/es/glosario/energia-de-un-tema) describe un archivo: cuánto empuja ese tema en particular. La curva describe un *orden*: qué pasa cuando esos archivos suenan uno atrás de otro. Dos DJs con exactamente los mismos veinte temas pueden tocar dos noches completamente distintas, y la diferencia entera está en la curva.

Ésta es la forma más común en un set largo: una subida larga con un respiro en el medio. Fijate que no sube en línea recta — el respiro es parte del diseño, no un error.`,
            en: `A set's [energy curve](/glossary/energy-curve) is the line you get when you write down, in play order, how much energy each track has. One number per track, joined in the order they will be played. Nothing more than that — and it is the one thing that shows the shape of a night before the night happens.

Two things get confused all the time and are worth separating. A [track's energy](/glossary/track-energy) describes a file: how hard that particular track pushes. The curve describes an *order*: what happens when those files play one after another. Two DJs with exactly the same twenty tracks can play two completely different nights, and the whole difference is in the curve.

This is the commonest shape for a long set: one long climb with a breather in the middle. Notice it is not a straight line — the breather is part of the design, not a mistake.`,
          },
        },
        { kind: "curva", shape: "journey" },
      ],
    },
    {
      id: "el-numero",
      heading: { es: "De dónde sale el número de cada tema", en: "Where each track's number comes from" },
      nodes: [
        {
          kind: "prose",
          markdown: {
            es: `Cada tema tiene una energía en una escala del 1 al 10. Ese número puede venir de tres lugares: de una etiqueta que ya está en tu archivo (Mixed In Key, Lexicon y otros la escriben; [acá está dónde la guarda cada programa](/energy-tags)), de un valor que escribiste vos a mano, o de una estimación que hace EnergyCurve a partir del [BPM](/es/glosario/bpm) y de lo que el archivo sí trae cuando no hay etiqueta.

Las tres cosas no valen lo mismo. Una etiqueta que pusiste vos escuchando el tema es la mejor; una estimación por BPM es la peor, y la app te dice cuál de las dos está usando en vez de mezclarlas. Lo que importa para esta guía es que **el número existe** y que la escala es siempre la misma, así que dos temas se pueden comparar.

La tabla de abajo es esa escala. Las bandas y sus rangos de BPM se leen de las constantes del motor de análisis — no están escritos acá a mano — y las palabras que describen cada banda son sólo eso, palabras.`,
            en: `Every track has an energy on a scale from 1 to 10. That number can come from three places: a tag already in your file (Mixed In Key, Lexicon and others write one; [here is where each program keeps it](/energy-tags)), a value you typed by hand, or an estimate EnergyCurve makes from the [BPM](/glossary/bpm) and whatever else the file carries when there is no tag.

The three are not worth the same. A tag you set while listening to the track is the best; an estimate from BPM is the worst, and the app tells you which of the two it is using rather than blending them. What matters for this guide is that **the number exists** and that the scale is always the same, so two tracks can be compared.

The table below is that scale. The bands and their BPM ranges are read from the analysis engine's own constants — they are not written here by hand — and the words describing each band are only that, words.`,
          },
        },
        { kind: "escala" },
        {
          kind: "callout",
          tone: "note",
          title: { es: "Sin etiquetas también sirve", en: "It works without tags too" },
          body: {
            es: "Si tus temas no tienen energía ni tonalidad, la curva se dibuja igual con lo que sí hay, y la app marca qué parte es dato y qué parte es estimación. Hay un artículo entero sobre [qué hacer cuando faltan los tags](/es/blog/tus-temas-no-tienen-bpm-ni-tonalidad).",
            en: "If your tracks have no energy and no key, the curve is drawn anyway from what is there, and the app marks which part is data and which is a guess. There is a whole article on [what to do when the tags are missing](/blog/dj-tracks-with-no-bpm-or-key).",
          },
        },
      ],
    },
    {
      id: "las-formas",
      heading: { es: "Las formas que toma según el horario", en: "The shapes it takes, by slot" },
      nodes: [
        {
          kind: "prose",
          markdown: {
            es: `No hay una curva correcta. Hay una curva correcta *para un horario*, y por eso lo primero que conviene saber de un toque no es qué temas llevar sino a qué hora te toca. Tres horarios, tres formas.

**El [warm-up](/es/glosario/warm-up).** Empieza abajo y sube despacio, y termina con margen: el que sigue tiene que tener a dónde ir. El error clásico del warm-up es el pico — tocar a las once el tema que iba a la una.`,
            en: `There is no correct curve. There is a correct curve *for a slot*, which is why the first thing worth knowing about a gig is not which tracks to bring but what time you are on. Three slots, three shapes.

**The [warm-up](/glossary/warm-up).** Starts low and climbs slowly, and ends with headroom: whoever comes next needs somewhere to go. The classic warm-up mistake is the peak — playing at eleven the track that belonged at one.`,
          },
        },
        { kind: "curva", shape: "warm-up" },
        {
          kind: "prose",
          markdown: {
            es: `**El [peak time](/es/glosario/peak-time).** Arriba casi todo el tiempo, pero no plano: las bajadas cortas son las que hacen que el pico se sienta como pico. Un set entero a 10 no se siente intenso, se siente igual.

**El [cierre](/es/glosario/closing-set).** Baja, pero baja a propósito y con algún repunte antes del final. Bajar no es apagarse; el último tema es una decisión, no lo que quedó.`,
            en: `**[Peak time](/glossary/peak-time).** High for most of it, but not flat: the short dips are what make the peak feel like a peak. A whole set at 10 does not feel intense, it feels the same.

**The [closing set](/glossary/closing-set).** Comes down, but on purpose and with a lift before the end. Coming down is not fading out; the last track is a decision, not what was left.`,
          },
        },
        { kind: "curva", shape: "closing" },
      ],
    },
    {
      id: "como-leer-la-tuya",
      heading: { es: "Cómo leer la tuya", en: "How to read yours" },
      nodes: [
        {
          kind: "prose",
          markdown: {
            es: `Todo lo de arriba se puede hacer con lápiz. También se puede hacer en un minuto, y la diferencia no es la velocidad: es que la curva dibujada te muestra cosas que en una lista de temas no se ven.`,
            en: `Everything above can be done with a pencil. It can also be done in a minute, and the difference is not speed: a drawn curve shows you things a list of tracks does not.`,
          },
        },
        {
          kind: "pasos",
          steps: [
            {
              title: { es: "Traé el set que ya armaste", en: "Bring the set you already built" },
              body: {
                es: "Exportalo desde Rekordbox, Traktor o como M3U8, o pegá la lista de temas como texto. La [herramienta gratis](/es/herramientas/curva-de-energia) lo lee en tu navegador y el archivo no sale de tu máquina.",
                en: "Export it from Rekordbox, Traktor or as M3U8, or paste the track list as text. The [free tool](/tools/energy-curve) reads it in your browser and the file never leaves your machine.",
              },
            },
            {
              title: { es: "Mirá la forma antes que los números", en: "Look at the shape before the numbers" },
              body: {
                es: "¿Sube? ¿Está plana? ¿Tiene un pico donde no debería? Los problemas de un set casi siempre se ven como forma antes de leer un solo valor.",
                en: "Does it climb? Is it flat? Is there a peak where there should not be one? A set's problems almost always show up as shape before you read a single value.",
              },
            },
            {
              title: { es: "Buscá los saltos", en: "Find the jumps" },
              body: {
                es: "Un escalón de uno o dos puntos es una subida. Un escalón grande es un tirón, y un tirón hacia abajo a mitad del set es el que la pista nota. [Cuánto es mucho salto](/es/blog/cuanto-es-mucho-salto-de-energia) depende del momento, pero un salto que no podés explicar es un salto para mirar.",
                en: "A step of one or two points is a climb. A big step is a lurch, and a lurch downward mid-set is the one the floor notices. [How much is too much](/blog/how-much-energy-jump-is-too-much-dj) depends on the moment, but a jump you cannot explain is a jump to look at.",
              },
            },
            {
              title: { es: "Chequeá las tonalidades", en: "Check the keys" },
              body: {
                es: "La curva es de energía; las [tonalidades](/es/glosario/tonalidad) son la otra mitad. Dos temas vecinos que chocan armónicamente hacen una [transición](/es/glosario/transicion) que hay que esconder en vez de tocar. Las reglas viven en la [rueda Camelot](/es/herramientas/rueda-camelot), que te dice qué combinaciones funcionan sin que tengas que memorizar nada.",
                en: "The curve is about energy; [keys](/glossary/key) are the other half. Two neighbouring tracks that clash harmonically make a [transition](/glossary/transition) you have to hide rather than play. The rules live in the [Camelot wheel](/tools/camelot-wheel), which tells you which combinations work without your having to memorise anything.",
              },
            },
            {
              title: { es: "Mové un tema y volvé a mirar", en: "Move one track and look again" },
              body: {
                es: "Cambiar un tema de lugar cambia la curva entera. Por eso se mira de nuevo después de cada cambio, y por eso conviene arreglar de a uno.",
                en: "Moving one track changes the whole curve. That is why you look again after every change, and why it is worth fixing one thing at a time.",
              },
            },
          ],
        },
      ],
    },
    {
      id: "los-errores",
      heading: { es: "Los errores que la curva muestra", en: "The mistakes the curve shows" },
      nodes: [
        {
          kind: "prose",
          markdown: {
            es: `Hay errores de estructura que son invisibles en una lista y obvios en un dibujo. Éstos son los que más aparecen.

**El pico temprano.** El mejor tema va demasiado pronto, porque es el mejor tema y querés tocarlo. Todo lo que viene después es una bajada que no planificaste.

**La meseta.** Seis temas seguidos con la misma energía. Cada uno está bien; juntos son una línea plana, y una línea plana es la forma de una pista que se aburre. Es el error más común, y así se ve:`,
            en: `Some structural mistakes are invisible in a list and obvious in a drawing. These are the ones that come up most.

**The early peak.** The best track goes in too soon, because it is the best track and you want to play it. Everything after it is a comedown you did not plan.

**The plateau.** Six tracks in a row at the same energy. Each one is fine; together they are a flat line, and a flat line is the shape of a floor losing interest. It is the commonest mistake, and this is what it looks like:`,
          },
        },
        { kind: "curva", shape: "plana" },
        {
          kind: "prose",
          markdown: {
            es: `**El serrucho.** Sube, baja, sube, baja — casi siempre el resultado de ordenar por lo que mezcla bien en vez de por a dónde va el set. Cada transición está limpia y el set no va a ningún lado.

**El precipicio.** Una caída de varios puntos en un solo paso, casi siempre un tema que pertenece a otro set.

Ninguno de estos errores se arregla eligiendo otros temas. Todos se arreglan moviendo los que ya tenés — que es la parte que la herramienta hace bien y la parte que vale la pena hacer [antes de tocar, no después](/es/blog/antes-de-tocar-no-despues).`,
            en: `**The sawtooth.** Up, down, up, down — almost always the result of ordering by what mixes rather than by where the set is going. Every transition is clean and the set goes nowhere.

**The cliff.** A drop of several points in one step, almost always a track that belongs to a different set.

None of these are fixed by picking different tracks. All of them are fixed by moving the ones you have — which is the part the tool does well, and the part worth doing [before you play, not after](/blog/analyse-your-dj-set-before-you-play-it).`,
          },
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
                es: "¿La curva de energía es lo mismo que la energía de Mixed In Key?",
                en: "Is the energy curve the same as Mixed In Key's energy?",
              },
              answer: {
                es: "No, y es la confusión más común. El 1 a 10 de Mixed In Key es un valor por tema. La curva es la forma que hace el set entero cuando esos valores se leen en orden de reproducción. Uno describe un archivo; la otra, una noche. EnergyCurve lee la etiqueta de Mixed In Key si está — [acá se explica la diferencia con sus propias palabras](/es/comparar/mixed-in-key).",
                en: "No, and it is the commonest confusion. Mixed In Key's 1 to 10 is a value per track. The curve is the shape the whole set makes when those values are read in play order. One describes a file; the other, a night. EnergyCurve reads Mixed In Key's tag when it is there — [the difference, in their own words, is here](/compare/mixed-in-key).",
              },
            },
            {
              question: {
                es: "¿Necesito cuenta para ver la curva de mi set?",
                en: "Do I need an account to see my set's curve?",
              },
              answer: {
                es: "No. La herramienta de curva de energía funciona sin cuenta y sin subir el archivo a ningún lado: el procesamiento pasa en tu navegador. La cuenta sirve para guardar el set, aplicar los arreglos y exportarlo de vuelta a tu reproductor.",
                en: "No. The energy curve tool works without an account and without uploading your file anywhere: the processing happens in your browser. The account is for saving the set, applying the fixes and exporting it back to your player.",
              },
            },
            {
              question: {
                es: "¿Cuánto tiene que subir la curva entre un tema y el siguiente?",
                en: "How much should the curve climb from one track to the next?",
              },
              answer: {
                es: "No hay un número correcto, y desconfiá de quien te dé uno. Un escalón chico es una subida; uno grande es un tirón; y cuál es cuál depende del momento del set y del horario. Lo que sí se puede decir es que un salto que no podés explicar es un salto para mirar.",
                en: "There is no correct number, and be wary of anyone who gives you one. A small step is a climb; a big one is a lurch; and which is which depends on the moment in the set and the slot. What can be said is that a jump you cannot explain is a jump to look at.",
              },
            },
            {
              question: {
                es: "¿Y si mi set no tiene un horario definido?",
                en: "What if my set has no defined slot?",
              },
              answer: {
                es: "Planificá para el medio: una curva que sube, se sostiene y afloja aguanta mejor que la muevan más temprano o más tarde que una hecha para una hora exacta. Y dejá dos o tres temas sueltos en cada punta para ajustar en la noche.",
                en: "Plan for the middle: a curve that rises, holds and eases survives being moved earlier or later better than one built for an exact hour. And leave two or three loose tracks at each end to adjust on the night.",
              },
            },
          ],
        },
      ],
    },
    {
      id: "probalo",
      heading: { es: "Probalo con tu último set", en: "Try it with your last set" },
      nodes: [
        { kind: "cta", variant: "tool" },
      ],
    },
  ],
  related: [
    { path: "/tools/energy-curve", label: { es: "Herramienta de curva de energía", en: "Energy curve tool" } },
    { path: "/tools/camelot-wheel", label: { es: "Rueda Camelot", en: "Camelot wheel" } },
    { path: "/energy-tags", label: { es: "Dónde guarda cada programa la energía", en: "Where each program keeps energy" } },
    { path: "/glossary", label: { es: "Glosario de DJ", en: "DJ glossary" } },
  ],
  articles: [
    {
      slug: "esta-bien-el-orden-de-mi-set",
      label: { es: "¿Está bien el orden de mi set?", en: "Is my set in the right order?" },
    },
    {
      slug: "cuanto-es-mucho-salto-de-energia",
      label: { es: "Cuánto es mucho salto de energía", en: "How much energy jump is too much" },
    },
    {
      slug: "antes-de-tocar-no-despues",
      label: { es: "Antes de tocar, no después", en: "Before you play, not after" },
    },
  ],
}

export const GUIDES: readonly Guide[] = [GUIA_CURVA_DE_ENERGIA, COMPONENT_PROOF]

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
