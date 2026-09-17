import type { SiteLocale } from "@/lib/content/site-copy"

/**
 * Copy for the free tools: the hub, the energy-curve analyser's interface, and
 * the article that sits under it.
 *
 * The article is here rather than in `content/blog/` on purpose. A blog post is
 * dated and stands alone; this text is part of a page whose job is to be found,
 * and it is rendered on the server above the fold's fold so a crawler reads a
 * page about energy curves rather than an empty `<div>` waiting for JavaScript.
 *
 * Voseo in Spanish, same as every other surface. The English is plain and
 * unhedged: this is a tool page, not a brochure.
 */

type Localized = Record<SiteLocale, string>

export interface CopySection {
  heading: Localized
  paragraphs: Localized[]
}

export interface FaqEntry {
  question: Localized
  answer: Localized
}

export const TOOLS_HUB_COPY = {
  h1: {
    en: "Free tools for DJs",
    es: "Herramientas gratis para DJs",
  },
  intro: {
    en: "Small tools that answer one question each, in the browser, without an account. Your files are read where they already are and never uploaded.",
    es: "Herramientas chicas que contestan una pregunta cada una, en el navegador y sin cuenta. Tus archivos se leen donde ya están y no se suben a ningún lado.",
  },
  /** Shown under the list. The roadmap is stated because an empty-looking
   *  page reads as abandoned, and naming what is coming is more honest than
   *  a "more soon" that could mean anything. */
  comingUp: {
    en: "Coming up",
    es: "En camino",
  },
  comingUpBody: {
    en: "More small tools that answer one question each. Same rules every time: free, no account, and nothing you load leaves your browser.",
    es: "Más herramientas chicas que contestan una pregunta cada una. Las mismas reglas siempre: gratis, sin cuenta, y nada de lo que cargues sale de tu navegador.",
  },
  /** Kept: the breadcrumb and the WebApplication name still read the tool by it. */
  toolName: {
    en: "Energy curve analyzer",
    es: "Analizador de curva de energía",
  },
  toolBlurb: {
    en: "Load a playlist and see its energy curve, a score out of 10, and how many problems it has.",
    es: "Cargá una playlist y mirá su curva de energía, un score sobre 10 y cuántos problemas tiene.",
  },
  wheelName: { en: "Camelot wheel", es: "Rueda Camelot" },
  wheelBlurb: {
    en: "Pick a key and see everything that mixes with it, and what each move does to a room.",
    es: "Elegí una tonalidad y mirá todo lo que mezcla con ella, y qué le hace cada movimiento a la pista.",
  },
  checkerName: {
    en: "Key and BPM checker",
    es: "Compatibilidad de tonalidad y BPM",
  },
  checkerBlurb: {
    en: "Two tracks in: whether they mix, how far the tempo has to move, and what that does to the key.",
    es: "Dos temas: si mezclan, cuánto tiene que moverse el tempo y qué le hace eso a la tonalidad.",
  },
} as const

export const TOOL_COPY = {
  h1: {
    en: "DJ set energy curve analyzer: free, no sign-up",
    es: "Curva de energía de tu set de DJ: analizala gratis",
  },
  lede: {
    en: "Drop in a playlist export or paste a tracklist. You get the energy curve, a score from 1 to 10, and how many problems the set has — before you play it, and without an account.",
    es: "Soltá un export de tu playlist o pegá una lista de temas. Te devuelve la curva de energía, un score de 1 a 10 y cuántos problemas tiene el set — antes de tocarlo y sin crear una cuenta.",
  },

  // --- The tool's own interface -------------------------------------------
  ui: {
    dropTitle: {
      en: "Drop a playlist export here",
      es: "Soltá acá el export de tu playlist",
    },
    dropBody: {
      en: "Rekordbox XML or TXT, Traktor NML, M3U8, or a CSV. Read in your browser — the file is never uploaded.",
      es: "Rekordbox XML o TXT, Traktor NML, M3U8 o un CSV. Se lee en tu navegador — el archivo no se sube a ningún lado.",
    },
    browse: { en: "Choose a file", es: "Elegir un archivo" },
    orPaste: { en: "or paste a tracklist", es: "o pegá una lista de temas" },
    pastePlaceholder: {
      en: "Nite Fleit - First Light\nOr:la - Slow Burn\nAnetha - Pressure Drop",
      es: "Nite Fleit - First Light\nOr:la - Slow Burn\nAnetha - Pressure Drop",
    },
    pasteHint: {
      en: "One track per line, “Artist - Title”.",
      es: "Un tema por línea, “Artista - Título”.",
    },
    analyzePaste: { en: "Analyze this list", es: "Analizar esta lista" },
    tryExample: {
      en: "Try it with an example set",
      es: "Probar con un set de ejemplo",
    },
    startOver: { en: "Analyze another set", es: "Analizar otro set" },

    pickPlaylist: {
      en: "This file has more than one playlist. Which one?",
      es: "Este archivo tiene más de una playlist. ¿Cuál?",
    },
    trackCount: { en: "tracks", es: "temas" },

    contextLabel: { en: "This set is a", es: "Este set es un" },
    contextHint: {
      en: "It changes the shape the curve is measured against — a warm-up that climbs to a peak is a bad warm-up.",
      es: "Cambia la forma contra la que se mide la curva — un warm-up que trepa hasta el pico es un mal warm-up.",
    },
    contextOpening: { en: "Warm-up / opening", es: "Warm-up / apertura" },
    contextMain: { en: "Peak time / main", es: "Peak time / central" },
    contextClosing: { en: "Closing", es: "Cierre" },

    scoreLabel: { en: "Set score", es: "Score del set" },
    curveTitle: { en: "Your energy curve", es: "Tu curva de energía" },
    curveLegend: {
      en: "Solid line: your set. Faint line: the shape this kind of set usually wants.",
      es: "Línea llena: tu set. Línea tenue: la forma que suele querer un set así.",
    },
    problemsTitle: { en: "What it found", es: "Qué encontró" },
    energyJumps: { en: "Energy jumps", es: "Saltos de energía" },
    harmonicClashes: { en: "Harmonic clashes", es: "Choques armónicos" },
    misplacedPeaks: { en: "Misplaced peaks", es: "Picos mal ubicados" },
    seeOnWheel: {
      en: "See on the Camelot wheel →",
      es: "Ver en la rueda Camelot →",
    },
    noProblems: {
      en: "Nothing flagged. The curve follows the shape and the steps stay inside what the genre takes.",
      es: "No encontró nada. La curva sigue la forma y los pasos se quedan dentro de lo que el género aguanta.",
    },
    genreDetected: { en: "Read as", es: "Leído como" },
    genreFallback: {
      en: "No genre tag we recognised — read as house, which is the middle of the road.",
      es: "Ningún tag de género reconocible — leído como house, que es el término medio.",
    },

    // The honesty block, shown when energy had to be inferred or invented.
    coverageInferred: {
      en: "Some of this curve is inferred from BPM rather than read from an energy tag.",
      es: "Parte de esta curva está inferida del BPM, no leída de un tag de energía.",
    },
    coverageInvented: {
      en: "Your tracks carry no energy or BPM, so this curve is mostly our guess from their order — the shape is real, the numbers are not a reading.",
      es: "Tus temas no traen energía ni BPM, así que esta curva es sobre todo una estimación nuestra a partir del orden — la forma es real, los números no son una lectura.",
    },
    coverageLink: {
      en: "What to do when your tracks have no tags",
      es: "Qué hacer si tus temas no tienen tags",
    },

    lockedTitle: {
      en: "Which track to move, and where",
      es: "Qué tema mover, y a dónde",
    },
    lockedBody: {
      en: "The curve tells you the set has a problem. The fix names the track, the position to move it to, and how much the score goes up if you do. Saving and exporting the corrected order live here too.",
      es: "La curva te dice que el set tiene un problema. El arreglo te nombra el tema, la posición a la que moverlo y cuánto sube el score si lo hacés. Guardar y exportar el orden corregido también están acá.",
    },
    lockedCta: {
      en: "See how to fix it — free",
      es: "Ver cómo arreglarlo — gratis",
    },
    lockedKept: {
      en: "This set is kept in your browser, so you won't have to load it again.",
      es: "Este set queda guardado en tu navegador, así no lo tenés que cargar de nuevo.",
    },

    errorUnsupported: {
      en: "We couldn't read that file. Export your playlist as Rekordbox XML or TXT, Traktor NML, M3U8, or a CSV with a title column.",
      es: "No pudimos leer ese archivo. Exportá tu playlist como Rekordbox XML o TXT, Traktor NML, M3U8, o un CSV con una columna de título.",
    },
    errorTooFew: {
      en: "A curve needs at least two tracks.",
      es: "Una curva necesita al menos dos temas.",
    },
    errorEmptyPaste: {
      en: "Nothing to read. One track per line, “Artist - Title”.",
      es: "No hay nada para leer. Un tema por línea, “Artista - Título”.",
    },
    formatsLink: {
      en: "Everything we read from your files",
      es: "Todo lo que leemos de tus archivos",
    },
  },

  // --- The indexable article ----------------------------------------------
  article: [
    {
      heading: {
        en: "What an energy curve is",
        es: "Qué es una curva de energía",
      },
      paragraphs: [
        {
          en: "An energy curve is your set drawn as a line: one point per track, in playing order, height being how hard that track hits. It is the shape of the night as a picture rather than as a feeling, and it is the fastest way to see something about a set that a tracklist hides completely — that the thing you planned as a slow build actually peaks at track four and spends the next hour trying to get back.",
          es: "Una curva de energía es tu set dibujado como una línea: un punto por tema, en el orden en que los vas a tocar, y la altura es qué tan fuerte pega ese tema. Es la forma de la noche como dibujo en vez de como sensación, y la manera más rápida de ver algo que una lista de temas esconde — que eso que planeaste como subida lenta hace pico en el cuarto tema y se pasa la hora siguiente tratando de volver.",
        },
        {
          en: "DJs have always read this by ear, which works and is slow: you find out how a set flows by playing it, and the room you find out in is the one that paid to be there. Drawing it first does not replace the ear. It catches the things the ear would have caught on the night, on a Tuesday instead.",
          es: "Los DJs siempre leyeron esto de oído, lo cual funciona y es lento: te enterás de cómo fluye un set tocándolo, y la pista donde te enterás es la que pagó para estar ahí. Dibujarlo antes no reemplaza al oído. Agarra las cosas que el oído hubiera agarrado en la fecha, pero un martes.",
        },
      ],
    },
    {
      heading: {
        en: "How to read the chart",
        es: "Cómo leer el gráfico",
      },
      paragraphs: [
        {
          en: "The solid line is your set, left to right in playing order. The faint line behind it is the shape a set of that kind usually wants — not a rule, a reference. Where the two run together the set is doing what it set out to do; where they pull apart is where the interesting question is, and sometimes the answer is that the reference is wrong for what you are playing.",
          es: "La línea llena es tu set, de izquierda a derecha en orden de reproducción. La línea tenue de atrás es la forma que suele querer un set de ese tipo — no es una regla, es una referencia. Donde las dos van juntas el set está haciendo lo que se propuso; donde se separan está la pregunta interesante, y a veces la respuesta es que la referencia está equivocada para lo que vos tocás.",
        },
        {
          en: "Three things are worth looking for. A step that goes nearly vertical between two adjacent tracks — the room feels that as a lurch, up or down. A long flat stretch in the middle, which is not calm but stalled. And a peak that arrives too early, which is the most common problem in a set someone built by picking their favourite tracks and then ordering them.",
          es: "Hay tres cosas que vale la pena buscar. Un paso que se va casi vertical entre dos temas seguidos — la pista eso lo siente como un tirón, para arriba o para abajo. Un tramo largo y plano en el medio, que no es calma sino estancamiento. Y un pico que llega demasiado temprano, que es el problema más común en un set armado eligiendo los temas favoritos y ordenándolos después.",
        },
        {
          en: "Points drawn hollow are ones where we had no energy to read and estimated from position instead. A curve made mostly of hollow points still shows you the shape you built, but the numbers under it are ours, not your music's.",
          es: "Los puntos dibujados huecos son aquellos donde no tuvimos energía para leer y la estimamos a partir de la posición. Una curva hecha sobre todo de puntos huecos igual te muestra la forma que armaste, pero los números de abajo son nuestros, no de tu música.",
        },
      ],
    },
    {
      heading: {
        en: "The shapes sets usually take",
        es: "Las formas que suelen tener los sets",
      },
      paragraphs: [
        {
          en: "A warm-up is a ramp that never arrives. It ends higher than it started and lower than where the next DJ needs to begin, and the discipline of it is refusing the peak you are perfectly capable of playing. A warm-up that peaks is the single most reliable way to make an headliner's job harder, and it shows up on the chart instantly: a bump in the middle where the line should still be climbing.",
          es: "Un warm-up es una rampa que nunca llega. Termina más alto de donde arrancó y más abajo de donde el DJ que sigue necesita empezar, y su disciplina es negarse al pico que perfectamente podrías tocar. Un warm-up que hace pico es la forma más confiable de complicarle la vida al que cierra, y en el gráfico se ve al toque: una joroba en el medio donde la línea todavía debería estar subiendo.",
        },
        {
          en: "A peak-time set climbs, holds high with dips for air, and lands. The dips matter: an hour at nine is not a peak, it is a plateau, and a room stops hearing intensity that never lets up. The chart makes this obvious — a good peak-time curve looks like a mountain range near the top, not a table.",
          es: "Un set de peak time sube, se mantiene arriba con bajadas para respirar, y aterriza. Las bajadas importan: una hora en nueve no es un pico, es una meseta, y una pista deja de escuchar una intensidad que no afloja nunca. El gráfico lo deja claro — una buena curva de peak time parece una cadena de montañas cerca de la cima, no una mesa.",
        },
        {
          en: "A journey set is the one that earns the long slots: it moves through more than one arc, with real valleys, and treats an hour as something with chapters. A closing set does the opposite of a warm-up — it starts where the last DJ left the room and walks it down, and its ending is the part people remember. Each of these wants a different reference line, which is why the tool asks what kind of set this is before it measures anything.",
          es: "Un set journey es el que justifica los slots largos: se mueve por más de un arco, con valles de verdad, y trata una hora como algo que tiene capítulos. Un set de cierre hace lo contrario del warm-up — arranca donde el DJ anterior dejó la pista y la va bajando, y su final es la parte que la gente se lleva. Por eso la herramienta pregunta qué tipo de set es antes de medir nada.",
        },
      ],
    },
    {
      heading: {
        en: "Energy is not BPM",
        es: "La energía no es el BPM",
      },
      paragraphs: [
        {
          en: "This is the confusion worth undoing. Tempo is one input to how hard a track hits, and it is not the biggest one. A sparse 140 BPM roller can sit under a dense 124 BPM house track all night; a dub techno cut at 130 can be the quietest thing in an hour. Sets ordered by BPM alone read as mechanical for exactly this reason — the numbers climb and the room does not.",
          es: "Ésta es la confusión que vale la pena deshacer. El tempo es un insumo de qué tan fuerte pega un tema, y no es el más importante. Un roller de 140 BPM con poca información puede quedar por debajo de un house denso de 124 toda la noche; un corte de dub techno a 130 puede ser lo más tranquilo de la hora. Los sets ordenados sólo por BPM suenan mecánicos exactamente por esto — los números suben y la pista no.",
        },
        {
          en: "When a track carries an energy rating in its tags — Mixed In Key writes one, and plenty of DJs type their own — that number is used directly, because someone who listened to it decided it. When there is no rating, BPM is used as an estimate, anchored to the genre so that 128 does not mean the same thing in deep house and in hard techno. The distinction is kept visible rather than smoothed over, because a curve built from estimates and a curve built from ratings deserve different amounts of trust.",
          es: "Cuando un tema trae un valor de energía en los tags — Mixed In Key escribe uno, y un montón de DJs escriben el suyo — ese número se usa directamente, porque lo decidió alguien que lo escuchó. Cuando no hay valor, el BPM se usa como estimación, anclado al género para que 128 no signifique lo mismo en deep house que en hard techno. La diferencia se mantiene a la vista en vez de disimularse, porque una curva hecha de estimaciones y una hecha de valores reales merecen distinta confianza.",
        },
      ],
    },
    {
      heading: {
        en: "What this tool checks",
        es: "Qué chequea esta herramienta",
      },
      paragraphs: [
        {
          en: "Three readings, and it says how many of each it found. Energy jumps: steps between adjacent tracks bigger than the genre normally takes, in either direction. Harmonic clashes: pairs whose keys fight, counted only where both tracks actually have a key — an unknown key is not a clash, and warning about half a library with no tags is how a tool teaches you to ignore it. Misplaced peaks: the loudest moment landing somewhere the shape does not want it.",
          es: "Tres lecturas, y te dice cuántas encontró de cada una. Saltos de energía: pasos entre temas seguidos más grandes de lo que el género suele aguantar, para arriba o para abajo. Choques armónicos: pares cuyas tonalidades pelean, contados sólo donde los dos temas realmente tienen tonalidad — una tonalidad desconocida no es un choque, y avisar sobre media librería sin tags es la forma de enseñarte a ignorar la herramienta. Picos mal ubicados: el momento más fuerte cayendo donde la forma no lo quiere.",
        },
        {
          en: "The score from 1 to 10 blends three things: how closely the curve follows the shape, how clean the transitions are, and how the set lands. It is a summary, not a verdict — a 6 with one huge jump in it is a different set from a 6 that is slightly flat throughout, and the counts above tell you which one you have.",
          es: "El score de 1 a 10 mezcla tres cosas: qué tan de cerca sigue la curva a la forma, qué tan limpias son las transiciones y cómo aterriza el set. Es un resumen, no un veredicto — un 6 con un salto enorme adentro es un set distinto a un 6 que está levemente plano todo el tiempo, y los conteos de arriba te dicen cuál de los dos tenés.",
        },
      ],
    },
  ] satisfies CopySection[],

  faq: [
    {
      question: {
        en: "Do I need an account?",
        es: "¿Necesito una cuenta?",
      },
      answer: {
        en: "No. The curve, the score and the problem counts are free and need nothing from you. An account is only needed for the part that names which track to move and where, and for saving and exporting the corrected order.",
        es: "No. La curva, el score y el conteo de problemas son gratis y no te piden nada. La cuenta hace falta sólo para la parte que te dice qué tema mover y a dónde, y para guardar y exportar el orden corregido.",
      },
    },
    {
      question: {
        en: "Are my files uploaded?",
        es: "¿Se suben mis archivos?",
      },
      answer: {
        en: "No. The file is read by your own browser and analysed there. Nothing about its contents is sent to us or to anyone else — no track names, no filenames, no playlist. Close the tab and it is gone.",
        es: "No. El archivo lo lee tu propio navegador y ahí mismo se analiza. Nada de su contenido se manda a nosotros ni a nadie — ni nombres de temas, ni nombres de archivo, ni la playlist. Cerrás la pestaña y no queda nada.",
      },
    },
    {
      question: {
        en: "Which formats does it accept?",
        es: "¿Qué formatos acepta?",
      },
      answer: {
        en: "Rekordbox XML and the Rekordbox TXT export, Traktor NML, M3U8, and CSV with a title column. You can also paste a plain tracklist, one track per line as “Artist - Title”, which is enough to see the shape.",
        es: "Rekordbox XML y el export TXT de Rekordbox, Traktor NML, M3U8, y CSV con una columna de título. También podés pegar una lista de temas en texto plano, un tema por línea como “Artista - Título”, que alcanza para ver la forma.",
      },
    },
    {
      question: {
        en: "What if my tracks have no energy tag?",
        es: "¿Qué pasa si mis temas no tienen energía?",
      },
      answer: {
        en: "You still get a curve. Energy is taken from a tag when there is one, estimated from BPM and genre when there is not, and estimated from the track's position when there is neither. Points we had to invent are drawn hollow and the page says so, so you know how much of the curve is a reading and how much is a guess.",
        es: "Igual obtenés una curva. La energía se toma de un tag cuando lo hay, se estima del BPM y el género cuando no, y se estima de la posición del tema cuando no hay ninguna de las dos. Los puntos que tuvimos que inventar se dibujan huecos y la página te lo dice, así sabés cuánto de la curva es lectura y cuánto es estimación.",
      },
    },
    {
      question: {
        en: "How is this different from Mixed In Key?",
        es: "¿En qué se diferencia de Mixed In Key?",
      },
      answer: {
        en: "Mixed In Key analyses tracks one at a time and writes a key and an energy rating into each file's tags. This reads the set as a whole — the order you put them in — and tells you whether that order works. They fit together rather than compete: if your library has Mixed In Key ratings in it, this tool uses them instead of estimating.",
        es: "Mixed In Key analiza temas de a uno y escribe en los tags de cada archivo una tonalidad y un valor de energía. Esto lee el set completo — el orden en el que los pusiste — y te dice si ese orden funciona. Se complementan más que competir: si tu librería tiene valores de Mixed In Key, esta herramienta los usa en vez de estimar.",
      },
    },
    {
      question: {
        en: "Is it really free?",
        es: "¿Es realmente gratis?",
      },
      answer: {
        en: "Yes, and with no limit on how many sets you run through it. EnergyCurve also has a free account tier that stays free, and paid tiers for the parts that go further. The tool on this page is not a trial of anything — it does what it says without an account at all.",
        es: "Sí, y sin límite de cuántos sets le pases. EnergyCurve además tiene un plan gratuito que va a seguir siendo gratuito, y planes pagos para las partes que van más lejos. La herramienta de esta página no es una prueba de nada — hace lo que dice sin cuenta ninguna.",
      },
    },
  ] satisfies FaqEntry[],

  /** Where the article points a reader who wants the longer version. */
  readMore: {
    en: "Read more",
    es: "Seguir leyendo",
  },
} as const
