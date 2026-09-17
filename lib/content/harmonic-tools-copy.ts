import type { CopySection, FaqEntry } from "@/lib/content/tools-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import type { HarmonicLevel } from "@/lib/music/harmonic-transitions"

/**
 * Copy for the two harmonic tools: the Camelot wheel and the key/BPM checker.
 *
 * Separate from `tools-copy.ts` because that file is already the energy tool's
 * and these are two more pages' worth — one file per tool keeps a diff readable.
 * The article bodies stay focused on **using the tool**: what a highlighted key
 * means, what the pitch does to it. A general guide to harmonic mixing is a blog
 * post, and having both would be two of our own pages competing for one query.
 */

type Localized = Record<SiteLocale, string>

/** The twelve roots, spoken, in semitone order from C. */
export const NOTE_NAMES: Record<SiteLocale, readonly string[]> = {
  en: ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"],
  es: ["Do", "Re♭", "Re", "Mi♭", "Mi", "Fa", "Sol♭", "Sol", "La♭", "La", "Si♭", "Si"],
}

const MODE: Record<SiteLocale, { minor: string; major: string }> = {
  en: { minor: "minor", major: "major" },
  es: { minor: "menor", major: "mayor" },
}

/** "A minor" / "La menor" — the name a musician would say out loud. */
export function spokenKeyName(
  noteIndex: number,
  minor: boolean,
  locale: SiteLocale
): string {
  const note = NOTE_NAMES[locale][noteIndex] ?? "?"

  return `${note} ${minor ? MODE[locale].minor : MODE[locale].major}`
}

/**
 * One line per kind of move, in the transition table's own vocabulary.
 *
 * These describe what the engine already decided; they do not decide anything.
 * Changing one changes what a DJ is told, never what the app scores.
 */
export const LEVEL_COPY: Record<
  HarmonicLevel,
  { name: Localized; line: Localized }
> = {
  perfect: {
    name: { en: "Perfect match", es: "Match perfecto" },
    line: {
      en: "The same key, or its relative major/minor. Nothing will fight; this is the safe move.",
      es: "La misma tonalidad, o su relativa mayor/menor. No va a pelear nada; es el movimiento seguro.",
    },
  },
  boost_1: {
    name: { en: "One step up", es: "Un paso arriba" },
    line: {
      en: "One position clockwise, or across to the other ring. Lifts the room a little without changing the mood.",
      es: "Una posición en sentido horario, o cruzando al otro anillo. Levanta un poco la pista sin cambiar el clima.",
    },
  },
  boost_2: {
    name: { en: "Energy boost", es: "Subida de energía" },
    line: {
      en: "A bigger jump up the wheel. Audibly a lift — usable, not seamless, and best on a drop.",
      es: "Un salto más grande en la rueda. Se escucha como subida — usable, no invisible, y mejor sobre un drop.",
    },
  },
  boost_3: {
    name: { en: "Long lift", es: "Subida larga" },
    line: {
      en: "The furthest lift the table still endorses. Works when the incoming track is clearly stronger.",
      es: "La subida más larga que la tabla todavía avala. Funciona cuando el tema que entra es claramente más fuerte.",
    },
  },
  drop_1: {
    name: { en: "One step down", es: "Un paso abajo" },
    line: {
      en: "One position anticlockwise. Releases pressure without the room noticing a key change.",
      es: "Una posición en sentido antihorario. Libera presión sin que la pista note un cambio de tonalidad.",
    },
  },
  drop_2: {
    name: { en: "Energy drop", es: "Bajada de energía" },
    line: {
      en: "A deliberate step down. This is how you open space after a peak instead of just getting quieter.",
      es: "Un paso abajo deliberado. Así abrís espacio después de un pico, en vez de simplemente bajar el volumen.",
    },
  },
  drop_3: {
    name: { en: "Long release", es: "Bajada larga" },
    line: {
      en: "The furthest release the table endorses. Use it when you mean to change the room, not to rest it.",
      es: "La bajada más larga que la tabla avala. Usala cuando querés cambiar la pista, no descansarla.",
    },
  },
  mood: {
    name: { en: "Mood change", es: "Cambio de clima" },
    line: {
      en: "Minor to major or back. The tempo can sit still and the whole feeling turns over.",
      es: "De menor a mayor o al revés. El tempo puede quedarse quieto y el clima entero da vuelta.",
    },
  },
}

// --- The wheel --------------------------------------------------------------

export const WHEEL_COPY = {
  h1: {
    en: "Camelot wheel: compatible keys for harmonic mixing",
    es: "Rueda Camelot: tonalidades compatibles para mezclar",
  },
  lede: {
    en: "Pick a key and see everything that mixes with it, and what each move does to a room. Same rules the set analyser uses.",
    es: "Elegí una tonalidad y mirá todo lo que mezcla con ella, y qué le hace cada movimiento a la pista. Las mismas reglas que usa el analizador de sets.",
  },
  ui: {
    pick: { en: "Pick a key", es: "Elegí una tonalidad" },
    selected: { en: "Selected", es: "Seleccionada" },
    compatibleWith: { en: "Mixes with", es: "Mezcla con" },
    wheelLabel: {
      en: "Camelot wheel — 24 keys. Use the arrow keys to move, Enter to select.",
      es: "Rueda Camelot — 24 tonalidades. Usá las flechas para moverte, Enter para seleccionar.",
    },
    tableTitle: { en: "Every key, in every notation", es: "Todas las tonalidades, en cada notación" },
    search: { en: "Filter keys", es: "Filtrar tonalidades" },
    searchPlaceholder: { en: "8A, Am, 11m…", es: "8A, Am, 11m…" },
    noMatches: { en: "Nothing matches that.", es: "No hay nada que coincida." },
    colCamelot: { en: "Camelot", es: "Camelot" },
    colMusical: { en: "Musical", es: "Notación musical" },
    colOpenKey: { en: "Open Key", es: "Open Key" },
    colShort: { en: "Short", es: "Abreviatura" },
    toCalculator: {
      en: "Check two specific tracks →",
      es: "Chequear dos temas concretos →",
    },
    toCurve: {
      en: "Analyze a whole set →",
      es: "Analizar un set entero →",
    },
  },
  article: [
    {
      heading: { en: "How to read the wheel", es: "Cómo leer la rueda" },
      paragraphs: [
        {
          en: "Twelve numbers around a clock, two rings. The inner ring is minor keys and carries an A; the outer ring is major keys and carries a B. 8A is A minor, 8B is C major, and the reason they sit together is that they are the same seven notes — a relative pair. That is the whole trick of the wheel: it rearranges keys so that the ones that share notes end up next to each other, and you can find a mix without knowing any theory.",
          es: "Doce números alrededor de un reloj, dos anillos. El anillo interno son las tonalidades menores y lleva una A; el externo son las mayores y lleva una B. 8A es La menor, 8B es Do mayor, y están juntas porque son las mismas siete notas — un par relativo. Ése es todo el truco de la rueda: reordena las tonalidades para que las que comparten notas queden pegadas, y podés encontrar una mezcla sin saber nada de teoría.",
        },
        {
          en: "Click any key and the ones it mixes with light up, each labelled with what kind of move it is. The labels matter more than the highlighting: every one of these is a valid mix, but they do different things. Some hold the room where it is, some lift it, some let it down on purpose. Picking between them is the actual decision, and it depends on where you are in the set rather than on the keys.",
          es: "Tocá cualquier tonalidad y se encienden las que mezclan con ella, cada una con la etiqueta de qué tipo de movimiento es. Las etiquetas importan más que el resaltado: todas son mezclas válidas, pero hacen cosas distintas. Algunas mantienen la pista donde está, otras la levantan, otras la bajan a propósito. Elegir entre ellas es la decisión de verdad, y depende de en qué punto del set estás, no de las tonalidades.",
        },
      ],
    },
    {
      heading: {
        en: "What each kind of move does",
        es: "Qué hace cada tipo de movimiento",
      },
      paragraphs: [
        {
          en: "The safest is the same key or its relative: nothing clashes, and the room does not register a change at all. One step around the wheel in either direction is nearly as safe and does something useful — clockwise adds a little tension, anticlockwise lets a little out. These are the moves you can make on a whim mid-set without listening first.",
          es: "Lo más seguro es la misma tonalidad o su relativa: no choca nada y la pista no registra ningún cambio. Un paso en la rueda en cualquier dirección es casi igual de seguro y hace algo útil — en sentido horario suma un poco de tensión, en antihorario suelta un poco. Son los movimientos que podés hacer de taquito en medio del set sin escuchar antes.",
        },
        {
          en: "Bigger jumps up the wheel are audible. They work, but the room hears them as a lift, so they want a moment that justifies one — a drop, a break, a track everyone recognises. The same distance downward releases pressure, which is how you open space after a peak without simply turning the energy off. And moving between the rings at the same number is the mood change: minor to major, the tempo unchanged, the whole feeling of the room turning over.",
          es: "Los saltos grandes hacia arriba se escuchan. Funcionan, pero la pista los oye como subida, así que piden un momento que la justifique — un drop, un break, un tema que todos reconocen. La misma distancia hacia abajo libera presión, y así abrís espacio después de un pico sin apagar la energía. Y moverte entre anillos con el mismo número es el cambio de clima: de menor a mayor, el tempo igual, y el ánimo entero de la pista dando vuelta.",
        },
        {
          en: "What the wheel does not show is anything that is not in the table. A key that stays dark is not forbidden — DJs break this constantly and on purpose — but it is a move you should hear before you trust it, rather than one the wheel is telling you is safe.",
          es: "Lo que la rueda no muestra es todo lo que no está en la tabla. Una tonalidad que queda apagada no está prohibida — los DJs rompen esto todo el tiempo y a propósito — pero es un movimiento que conviene escuchar antes de confiar en él, no uno que la rueda te esté diciendo que es seguro.",
        },
      ],
    },
    {
      heading: {
        en: "Camelot, Open Key and musical notation",
        es: "Camelot, Open Key y notación musical",
      },
      paragraphs: [
        {
          en: "Three ways of writing the same twenty-four keys, and your library probably has more than one. Camelot is Mixed In Key's system and the one most DJs say out loud. Open Key is Traktor's: the same wheel rotated, so Camelot 8A is Open Key 1m. Musical notation is what the rest of the world uses — A minor, or Am.",
          es: "Tres formas de escribir las mismas veinticuatro tonalidades, y tu librería seguramente tiene más de una. Camelot es el sistema de Mixed In Key y el que la mayoría de los DJs dice en voz alta. Open Key es el de Traktor: la misma rueda rotada, así que 8A en Camelot es 1m en Open Key. La notación musical es la que usa el resto del mundo — La menor, o Am.",
        },
        {
          en: "The table below has all twenty-four in all four columns, and it is in the page itself rather than drawn by JavaScript, so you can search it, print it or read it on a phone with a bad connection in a booth. The calculator on the next page accepts any of the three notations without being told which one you typed.",
          es: "La tabla de abajo tiene las veinticuatro en las cuatro columnas, y está en la página misma en vez de dibujada por JavaScript, así que la podés buscar, imprimir o leer en un celular con mala conexión en una cabina. La calculadora de la página siguiente acepta cualquiera de las tres notaciones sin que le digas cuál escribiste.",
        },
      ],
    },
    {
      heading: {
        en: "Where the wheel stops helping",
        es: "Dónde la rueda deja de ayudar",
      },
      paragraphs: [
        {
          en: "Two tracks in compatible keys can still sound wrong together, and the wheel has no opinion about why. Tempo is the obvious one. Energy is the less obvious one: a perfectly matched key between a sparse intro and a peak-time roller is still a mix the room feels as a lurch. And key tags are often wrong — detection software disagrees with itself, and a tag nobody checked is a guess with a number on it.",
          es: "Dos temas en tonalidades compatibles igual pueden sonar mal juntos, y la rueda no tiene opinión sobre por qué. El tempo es lo obvio. La energía es lo menos obvio: una tonalidad perfectamente compatible entre un intro despojado y un roller de peak time sigue siendo una mezcla que la pista siente como un tirón. Y los tags de tonalidad suelen estar mal — los detectores se contradicen entre sí, y un tag que nadie chequeó es una estimación con un número puesto.",
        },
        {
          en: "That is what the other two tools are for: the checker adds the tempo half of the question for two specific tracks, and the set analyser reads the energy of a whole tracklist at once.",
          es: "Para eso están las otras dos herramientas: el chequeador suma la mitad de tempo de la pregunta para dos temas concretos, y el analizador de sets lee la energía de una lista entera de una sola vez.",
        },
      ],
    },
  ] satisfies CopySection[],
  faq: [
    {
      question: { en: "What is the Camelot system?", es: "¿Qué es el sistema Camelot?" },
      answer: {
        en: "A way of numbering the twenty-four musical keys so that compatible ones end up next to each other. Mixed In Key invented it so DJs could mix harmonically without reading music: instead of knowing that A minor and C major share notes, you see that they are both 8.",
        es: "Una forma de numerar las veinticuatro tonalidades para que las compatibles queden pegadas. Mixed In Key lo inventó para que los DJs pudieran mezclar en armonía sin leer música: en vez de saber que La menor y Do mayor comparten notas, ves que las dos son 8.",
      },
    },
    {
      question: { en: "Camelot or Open Key?", es: "¿Camelot u Open Key?" },
      answer: {
        en: "The same wheel, rotated, with different letters: Camelot uses A for minor and B for major, Open Key uses m and d. Camelot 8A is Open Key 1m. Traktor writes Open Key, most other software writes Camelot, and neither is better — but mixing the two up inside one library is how a set ends up in the wrong key.",
        es: "La misma rueda, rotada, con letras distintas: Camelot usa A para menor y B para mayor, Open Key usa m y d. 8A en Camelot es 1m en Open Key. Traktor escribe Open Key, la mayoría del resto escribe Camelot, y ninguno es mejor — pero mezclar los dos dentro de una misma librería es cómo un set termina en la tonalidad equivocada.",
      },
    },
    {
      question: {
        en: "Does Mixed In Key use Camelot?",
        es: "¿Mixed In Key usa Camelot?",
      },
      answer: {
        en: "Yes — Camelot is theirs. If your library has been through Mixed In Key, the key tags are already Camelot codes and this wheel reads them directly. EnergyCurve also reads the energy rating it writes, rather than estimating one.",
        es: "Sí — Camelot es de ellos. Si tu librería pasó por Mixed In Key, los tags de tonalidad ya son códigos Camelot y esta rueda los lee directo. EnergyCurve además lee el valor de energía que escribe, en vez de estimar uno.",
      },
    },
    {
      question: {
        en: "Are keys that aren't highlighted forbidden?",
        es: "¿Las tonalidades que no se resaltan están prohibidas?",
      },
      answer: {
        en: "No. They are moves the table does not endorse, which is not the same as moves that do not work. Plenty of memorable mixes are outside the wheel and were chosen on purpose. Treat the highlighting as the set of moves you can make without listening first.",
        es: "No. Son movimientos que la tabla no avala, que no es lo mismo que movimientos que no funcionan. Un montón de mezclas memorables están fuera de la rueda y fueron elegidas a propósito. Tomá el resaltado como el conjunto de movimientos que podés hacer sin escuchar antes.",
      },
    },
    {
      question: {
        en: "Do I need an account?",
        es: "¿Necesito una cuenta?",
      },
      answer: {
        en: "No, and there is nothing to load. The wheel and the table are the whole tool. An account is only for the set analyser's fixes — the part that names which track to move and where.",
        es: "No, y no hay nada que cargar. La rueda y la tabla son toda la herramienta. La cuenta es sólo para los arreglos del analizador de sets — la parte que te dice qué tema mover y a dónde.",
      },
    },
    {
      question: { en: "Is it free?", es: "¿Es gratis?" },
      answer: {
        en: "Yes, with no limit and no sign-up. It uses exactly the same harmonic rules as the paid product, because there is only one set of them in the codebase.",
        es: "Sí, sin límite y sin registro. Usa exactamente las mismas reglas armónicas que el producto pago, porque en el código hay un solo juego de reglas.",
      },
    },
  ] satisfies FaqEntry[],
} as const

// --- The calculator ---------------------------------------------------------

export const CHECKER_COPY = {
  h1: {
    en: "Key and BPM compatibility checker",
    es: "¿Estos dos temas mezclan? Compatibilidad de tonalidad y BPM",
  },
  lede: {
    en: "Two tracks, two keys, two BPMs. Tells you whether they mix, how far the tempo has to move, and what that does to the key.",
    es: "Dos temas, dos tonalidades, dos BPM. Te dice si mezclan, cuánto tiene que moverse el tempo y qué le hace eso a la tonalidad.",
  },
  ui: {
    trackA: { en: "Playing now", es: "Sonando ahora" },
    trackB: { en: "Coming in", es: "El que entra" },
    keyLabel: { en: "Key", es: "Tonalidad" },
    keyPlaceholder: { en: "8A, Am or 1m", es: "8A, Am o 1m" },
    bpmLabel: { en: "BPM", es: "BPM" },
    bpmPlaceholder: { en: "128", es: "128" },
    pitchRange: { en: "Pitch range", es: "Rango de pitch" },
    keyLock: { en: "Key lock on", es: "Key lock activado" },
    check: { en: "Check", es: "Chequear" },
    clear: { en: "Clear", es: "Limpiar" },

    harmonyTitle: { en: "Harmony", es: "Armonía" },
    tempoTitle: { en: "Tempo", es: "Tempo" },
    pitchTitle: { en: "Pitch and key", es: "Pitch y tonalidad" },

    noKeys: {
      en: "Add both keys to get a harmonic verdict. An unknown key is not a clash — it is an unknown.",
      es: "Poné las dos tonalidades para tener un veredicto armónico. Una tonalidad desconocida no es un choque — es una incógnita.",
    },
    noBpm: {
      en: "Add both BPMs to see the tempo move.",
      es: "Poné los dos BPM para ver el movimiento de tempo.",
    },
    notInTable: {
      en: "Not a move the table endorses. It can still work — listen to it before you trust it.",
      es: "No es un movimiento que la tabla avale. Igual puede funcionar — escuchalo antes de confiar.",
    },
    faster: { en: "faster", es: "más rápido" },
    slower: { en: "slower", es: "más lento" },
    halfTime: {
      en: "Half-time: one beat against two, not a tempo jump.",
      es: "Half-time: un beat contra dos, no un salto de tempo.",
    },
    doubleTime: {
      en: "Double-time: two beats against one, not a tempo jump.",
      es: "Double-time: dos beats contra uno, no un salto de tempo.",
    },
    withinMargin: {
      en: "Inside the 7% a crossfade normally survives.",
      es: "Dentro del 7% que un crossfade normalmente aguanta.",
    },
    beyondMargin: {
      en: "Past the 7% a crossfade normally survives — the beats will fight even if the fader reaches.",
      es: "Pasa el 7% que un crossfade normalmente aguanta — los beats van a pelear aunque el fader llegue.",
    },
    fitsRange: { en: "fits a ±{range}% fader", es: "entra en un fader de ±{range}%" },
    missesRange: {
      en: "needs more than ±{range}%",
      es: "necesita más de ±{range}%",
    },
    keyLockHeld: {
      en: "Key lock is on, so the key does not move.",
      es: "El key lock está activado, así que la tonalidad no se mueve.",
    },
    keyBecomes: { en: "becomes", es: "queda en" },
    approximate: {
      en: "Between two keys — closer to out of tune than to either.",
      es: "Entre dos tonalidades — más cerca de desafinado que de cualquiera de las dos.",
    },
    seeOnWheel: { en: "See this on the Camelot wheel →", es: "Ver esto en la rueda Camelot →" },
    analyzeSet: { en: "Analyze a whole set →", es: "Analizar un set entero →" },
  },
  article: [
    {
      heading: { en: "What the result tells you", es: "Qué te dice el resultado" },
      paragraphs: [
        {
          en: "Three separate readings, deliberately not blended into one verdict. The harmonic one says whether the two keys are a move the transition table endorses, and which kind. The tempo one says how far apart the BPMs are as a percentage, and whether that is inside the margin a crossfade normally survives. The pitch one says what happens to the incoming track's key once you have pulled it onto the other one's tempo.",
          es: "Tres lecturas separadas, deliberadamente no mezcladas en un solo veredicto. La armónica dice si las dos tonalidades son un movimiento que la tabla de transiciones avala, y de qué tipo. La de tempo dice cuánto están separados los BPM en porcentaje, y si eso entra en el margen que un crossfade normalmente aguanta. La de pitch dice qué le pasa a la tonalidad del tema que entra una vez que lo llevaste al tempo del otro.",
        },
        {
          en: "They are separate because they disagree often, and a single traffic light would have to pick one to lie about. Two tracks in perfect keys can be nine percent apart. Two tracks at identical BPMs can be in keys that fight. Both of those are useful things to know and neither is 'compatible: no'.",
          es: "Están separadas porque se contradicen seguido, y un semáforo único tendría que elegir sobre cuál mentir. Dos temas en tonalidades perfectas pueden estar a nueve por ciento de distancia. Dos temas con BPM idénticos pueden estar en tonalidades que pelean. Las dos cosas son útiles de saber y ninguna es «compatible: no».",
        },
      ],
    },
    {
      heading: { en: "Pitch and key lock", es: "Pitch y key lock" },
      paragraphs: [
        {
          en: "On a deck with key lock off, tempo and pitch are one knob. Speed a record up and everything in it rises, including its key. That is not a bug to be corrected — it is what vinyl did and what a lot of mixes are built on — but it means the key you matched on paper is not the key that plays.",
          es: "En una bandeja con el key lock apagado, tempo y pitch son la misma perilla. Acelerás un disco y todo lo que hay adentro sube, incluida la tonalidad. Eso no es un error a corregir — es lo que hacía el vinilo y sobre lo que están armadas un montón de mezclas — pero significa que la tonalidad que calzaste en el papel no es la que suena.",
        },
        {
          en: "A semitone is a frequency ratio of about 5.95%, which is why a track pulled six percent lands almost exactly one semitone away and one pulled three percent lands between two keys, sounding slightly out of tune against everything. The tool reports both: how many semitones the move is worth, and which key that leaves you in — flagged when the answer falls between keys rather than on one.",
          es: "Un semitono es una relación de frecuencia de aproximadamente 5,95 %, y por eso un tema movido seis por ciento cae casi exactamente un semitono más allá, y uno movido tres por ciento cae entre dos tonalidades, sonando levemente desafinado contra todo. La herramienta reporta las dos cosas: cuántos semitonos vale el movimiento, y en qué tonalidad te deja — marcado cuando la respuesta cae entre tonalidades en vez de sobre una.",
        },
        {
          en: "With key lock on, none of that happens: the deck holds the pitch and only the tempo moves. Turn it on in the tool and the key reading says so instead of pretending the move still shifts it.",
          es: "Con el key lock activado no pasa nada de eso: la bandeja sostiene el pitch y sólo se mueve el tempo. Activalo en la herramienta y la lectura de tonalidad lo dice, en vez de fingir que el movimiento igual la corre.",
        },
      ],
    },
    {
      heading: { en: "Half-time and double-time", es: "Half-time y double-time" },
      paragraphs: [
        {
          en: "87 into 174 is not a 100% tempo jump. It is one beat against two, and it is one of the most reliable transitions in the book — the whole relationship between drum and bass and its halftime intros is built on it. A checker that reported it as impossible would be wrong in exactly the sets where it matters most.",
          es: "87 a 174 no es un salto de tempo del 100 %. Es un beat contra dos, y es una de las transiciones más confiables que hay — toda la relación entre el drum and bass y sus intros en halftime está construida sobre eso. Un chequeador que lo reportara como imposible estaría equivocado justo en los sets donde más importa.",
        },
        {
          en: "So the tempo reading matches half and double before it measures anything, and then measures the gap against whichever relationship is closest. 86 into 174 comes back as double-time with a 1.2% gap, because that is what your ears and your pitch fader are both dealing with.",
          es: "Por eso la lectura de tempo busca half y double antes de medir nada, y después mide la distancia contra la relación que quede más cerca. 86 a 174 vuelve como double-time con 1,2 % de diferencia, porque eso es lo que tu oído y tu fader de pitch tienen enfrente.",
        },
      ],
    },
    {
      heading: {
        en: "Your fader's range is not the same question",
        es: "El rango de tu fader es otra pregunta",
      },
      paragraphs: [
        {
          en: "Two different limits get confused constantly. A ±8% pitch fader is a fact about your equipment: past that the deck simply cannot go. The seven percent the tool mentions is a musical judgement about what a crossfade survives — past it the two tracks drift audibly during the blend even though the fader reached comfortably.",
          es: "Hay dos límites distintos que se confunden todo el tiempo. Un fader de pitch de ±8 % es un dato de tu equipo: más allá de eso la bandeja no llega, y listo. El siete por ciento que menciona la herramienta es un juicio musical sobre qué sobrevive un crossfade — pasado eso los dos temas se separan audiblemente durante la mezcla aunque el fader haya llegado sobrado.",
        },
        {
          en: "A 7.5% move clears a ±8 fader and fails the margin. That is not a contradiction, it is two answers to two questions, and the tool gives both rather than averaging them into a number that answers neither.",
          es: "Un movimiento de 7,5 % pasa un fader de ±8 y no pasa el margen. No es una contradicción, son dos respuestas a dos preguntas, y la herramienta da las dos en vez de promediarlas en un número que no contesta ninguna.",
        },
      ],
    },
    {
      heading: {
        en: "When to override what it says",
        es: "Cuándo ignorar lo que dice",
      },
      paragraphs: [
        {
          en: "A verdict about two tracks is a verdict about two tracks, and you are mixing a night. A move the table does not endorse can be exactly right at the moment you make it — after a break, over a drop, into a track the room already knows. The checker cannot hear any of that, and the tag it is reading may be wrong in the first place: key detection disagrees with itself often enough that a code nobody verified is a strong guess rather than a fact.",
          es: "Un veredicto sobre dos temas es un veredicto sobre dos temas, y vos estás mezclando una noche. Un movimiento que la tabla no avala puede ser exactamente el correcto en el momento en que lo hacés — después de un break, sobre un drop, hacia un tema que la pista ya conoce. El chequeador no puede escuchar nada de eso, y el tag que está leyendo puede estar mal de entrada: la detección de tonalidad se contradice lo bastante seguido como para que un código que nadie verificó sea una estimación fuerte, no un hecho.",
        },
        {
          en: "Where it earns its place is the case you cannot hear in advance: planning at home, with two tracks you have not tried together, deciding whether the transition is worth building a section around. That is also why the third reading exists — a mix that works in isolation can still be the wrong move for where the set has got to, and only the whole tracklist can answer that.",
          es: "Donde sí gana su lugar es en el caso que no podés escuchar por adelantado: preparando en tu casa, con dos temas que nunca probaste juntos, decidiendo si la transición vale como para armar un bloque alrededor. Por eso también existe la tercera lectura — una mezcla que funciona aislada igual puede ser el movimiento equivocado para el punto al que llegó el set, y eso sólo lo puede contestar la lista entera.",
        },
      ],
    },
  ] satisfies CopySection[],
  faq: [
    {
      question: {
        en: "How much can I change the BPM before it shows?",
        es: "¿Cuánto puedo cambiar el BPM sin que se note?",
      },
      answer: {
        en: "About seven percent is where a crossfade starts to struggle — the two tracks drift apart audibly during the blend. That is the margin this tool and the set analyser both use. Your fader may reach further; whether it should is a separate question.",
        es: "Alrededor del siete por ciento es donde un crossfade empieza a sufrir — los dos temas se separan de forma audible durante la mezcla. Ése es el margen que usan esta herramienta y el analizador de sets. Tu fader puede llegar más lejos; si conviene o no es otra pregunta.",
      },
    },
    {
      question: {
        en: "What happens to the key when I raise the pitch?",
        es: "¿Qué pasa con la tonalidad al subir el pitch?",
      },
      answer: {
        en: "Without key lock it rises with the tempo: about 5.95% is one semitone, which on the Camelot wheel is seven positions clockwise. Speed 8A up six percent and you are playing something very close to 3A. With key lock on, the key does not move at all.",
        es: "Sin key lock sube junto con el tempo: alrededor de 5,95 % es un semitono, que en la rueda Camelot son siete posiciones en sentido horario. Acelerá un 8A un seis por ciento y estás tocando algo muy cerca de 3A. Con el key lock activado la tonalidad no se mueve.",
      },
    },
    {
      question: {
        en: "Is half-time really compatible?",
        es: "¿Half-time realmente es compatible?",
      },
      answer: {
        en: "Yes, and the tool treats it as a matched tempo rather than a jump. 87 into 174 is one beat against two; the percentage it reports is the distance after matching, which is the number your pitch fader actually has to cover.",
        es: "Sí, y la herramienta lo trata como un tempo calzado, no como un salto. 87 a 174 es un beat contra dos; el porcentaje que reporta es la distancia después de calzarlos, que es el número que tu fader de pitch realmente tiene que cubrir.",
      },
    },
    {
      question: {
        en: "Which key notations does it accept?",
        es: "¿Qué notaciones de tonalidad acepta?",
      },
      answer: {
        en: "Camelot (8A), Open Key (1m) and musical notation (Am, A minor). You do not have to say which one you are using — it works it out, and the two tracks can be written differently from each other.",
        es: "Camelot (8A), Open Key (1m) y notación musical (Am, La menor). No hace falta que digas cuál estás usando — lo deduce, y los dos temas pueden estar escritos distinto entre sí.",
      },
    },
    {
      question: {
        en: "Does it use the same rules as the app?",
        es: "¿Usa las mismas reglas que la app?",
      },
      answer: {
        en: "The same ones, from the same code. The harmonic verdict comes from the transition table the set analyser scores against, and a test compares all 576 key pairs against the analyser itself so the two cannot drift apart.",
        es: "Las mismas, del mismo código. El veredicto armónico sale de la tabla de transiciones contra la que puntúa el analizador de sets, y un test compara los 576 pares de tonalidades contra el analizador mismo para que no puedan separarse.",
      },
    },
    {
      question: { en: "Is it free?", es: "¿Es gratis?" },
      answer: {
        en: "Yes, with no account and no limit. Nothing you type is sent anywhere — the whole calculation happens in your browser.",
        es: "Sí, sin cuenta y sin límite. Nada de lo que escribís se manda a ningún lado — todo el cálculo pasa en tu navegador.",
      },
    },
  ] satisfies FaqEntry[],
} as const
