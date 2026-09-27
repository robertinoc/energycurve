import type { FaqEntry } from "@/lib/content/content-nodes"
import type { SiteLocale } from "@/lib/content/site-copy"

/**
 * Copy for the harmonic cheat sheet — the words around the generated tables.
 *
 * What is deliberately **not** here: any key, any move, any count that the
 * tables carry. Those come from `lib/tools/harmonic-cheat-sheet.ts`, and the
 * prose refers to them through `{keys}`, `{levels}`, `{targets}` and `{moves}`
 * placeholders that the page fills from the same source. A sentence that said
 * "twelve recommended moves per key" in its own words would be the hand-written
 * copy this page exists to avoid.
 */

type Localized = Record<SiteLocale, string>

export const CHEAT_SHEET_COPY = {
  h1: {
    en: "Harmonic mixing cheat sheet: the Camelot wheel, every key, every move",
    es: "Tabla de mezcla armónica: la rueda Camelot, cada tonalidad, cada movimiento",
  },
  lede: {
    en: "The {keys} keys in Camelot, Open Key and musical notation, and the {moves} moves the transition table recommends between them — generated from the same table the set analyser scores with, not copied from it.",
    es: "Las {keys} tonalidades en notación Camelot, Open Key y musical, y los {moves} movimientos que la tabla de transiciones recomienda entre ellas — generados de la misma tabla con la que puntúa el analizador de sets, no copiados de ella.",
  },
  keysHeading: {
    en: "Camelot ↔ Open Key ↔ musical key",
    es: "Camelot ↔ Open Key ↔ tonalidad",
  },
  keysNote: {
    en: "Ring B is major, ring A is minor, and a number is shared by a major key and its relative minor. Open Key is the same wheel rotated: Camelot 8 is Open Key 1.",
    es: "El anillo B es mayor, el A es menor, y un número lo comparten una tonalidad mayor y su relativa menor. Open Key es la misma rueda rotada: Camelot 8 es Open Key 1.",
  },
  colCamelot: { en: "Camelot", es: "Camelot" },
  colOpenKey: { en: "Open Key", es: "Open Key" },
  colKey: { en: "Key", es: "Tonalidad" },
  colShort: { en: "Short", es: "Abreviada" },
  movesHeading: {
    en: "What to play next, from every key",
    es: "Qué tocar después, desde cada tonalidad",
  },
  movesNote: {
    en: "One row per key playing now. Each of the {levels} columns is a kind of move; a code in parentheses is that level's second choice, for when the first is not in the crate. A key that appears in no column of its row is not recommended from there.",
    es: "Una fila por tonalidad que está sonando. Cada una de las {levels} columnas es un tipo de movimiento; un código entre paréntesis es la segunda opción de ese nivel, para cuando la primera no está en el crate. Una tonalidad que no aparece en ninguna columna de su fila no está recomendada desde ahí.",
  },
  colFrom: { en: "Playing", es: "Suena" },
  theoryHeading: {
    en: "Camelot and the circle of fifths are the same wheel",
    es: "Camelot y el círculo de quintas son la misma rueda",
  },
  theory: {
    en: [
      "The circle of fifths is the musician's arrangement of the twelve major keys so that each one sits next to the two it shares the most notes with: a step clockwise goes up a perfect fifth, and neighbours differ by a single accidental. The Camelot wheel is that exact circle with the note names replaced by numbers. 8B is C major; every step clockwise adds one to the number and a fifth to the key, so 9B is G major and 7B is F major. The relative minor of each key — the one built on the same notes — takes the same number on ring A, which is why A minor is 8A.",
      "The DJ notation exists because a booth is not a place to work out that G major and E minor share a key signature. With numbers, the rule becomes arithmetic: same number is safe, one number either way is safe, and the same number on the other ring is safe. Everything the table below adds — the boosts, the drops, the mood change — is a named move of a fixed number of semitones, which the numbers make just as easy to read.",
      "Open Key is the same idea with the wheel rotated five positions and different letters (d for major, m for minor). Nothing in it disagrees with Camelot; the two only fall out with each other when one library stores both and nobody converts.",
    ],
    es: [
      "El círculo de quintas es la forma en que un músico ordena las doce tonalidades mayores para que cada una quede al lado de las dos con las que comparte más notas: un paso en sentido horario sube una quinta justa, y las vecinas difieren en una sola alteración. La rueda Camelot es exactamente ese círculo con los nombres de las notas reemplazados por números. 8B es Do mayor; cada paso en sentido horario suma uno al número y una quinta a la tonalidad, así que 9B es Sol mayor y 7B es Fa mayor. La relativa menor de cada tonalidad —la que se arma con las mismas notas— lleva el mismo número en el anillo A, y por eso La menor es 8A.",
      "La notación de DJ existe porque la cabina no es lugar para deducir que Sol mayor y Mi menor comparten armadura. Con números, la regla se vuelve aritmética: el mismo número es seguro, un número para cualquier lado es seguro, y el mismo número en el otro anillo es seguro. Todo lo que agrega la tabla de abajo —los boosts, los drops, el cambio de clima— es un movimiento con nombre y una cantidad fija de semitonos, que los números hacen igual de fácil de leer.",
      "Open Key es la misma idea con la rueda rotada cinco posiciones y otras letras (d para mayor, m para menor). Nada en ella contradice a Camelot; las dos sólo se pelean cuando una librería guarda las dos y nadie convierte.",
    ],
  },
  downloadHeading: {
    en: "The wheel, as a file",
    es: "La rueda, como archivo",
  },
  downloadNote: {
    en: "An SVG of the wheel with all {keys} codes, their musical keys and their Open Key codes, drawn from the same data as the tables above. It scales to any size without blurring, opens in any browser, and prints.",
    es: "Un SVG de la rueda con los {keys} códigos, sus tonalidades y sus códigos Open Key, dibujado de los mismos datos que las tablas de arriba. Escala a cualquier tamaño sin pixelarse, se abre en cualquier navegador y se imprime.",
  },
  downloadLabel: {
    en: "Download the Camelot wheel (SVG)",
    es: "Descargar la rueda Camelot (SVG)",
  },
  wheelAlt: {
    en: "The Camelot wheel: ring B (major) outside, ring A (minor) inside, each position labelled with its Camelot code, musical key and Open Key code.",
    es: "La rueda Camelot: el anillo B (mayor) afuera, el A (menor) adentro, cada posición con su código Camelot, su tonalidad y su código Open Key.",
  },
  sourceHeading: {
    en: "Where this comes from",
    es: "De dónde sale esto",
  },
  source: {
    en: "The moves are the harmonic transition table EnergyCurve adopted from an alpha user's reference file: {keys} rows, {targets} recommended targets each, {moves} moves in all. Nothing on this page is typed in by hand — the tables and the SVG are rendered from the constant the set analyser scores against, so if that table ever changes, this page changes with it. The interactive version, where you pick a key and the wheel lights up, is the free Camelot wheel tool.",
    es: "Los movimientos son la tabla de transiciones armónicas que EnergyCurve adoptó del archivo de referencia de un usuario alfa: {keys} filas, {targets} destinos recomendados cada una, {moves} movimientos en total. Nada de esta página está tipeado a mano — las tablas y el SVG se renderizan de la constante contra la que puntúa el analizador de sets, así que si esa tabla cambia alguna vez, esta página cambia con ella. La versión interactiva, donde elegís una tonalidad y la rueda se ilumina, es la herramienta gratuita de rueda Camelot.",
  },
  toolLink: { en: "Open the interactive Camelot wheel", es: "Abrí la rueda Camelot interactiva" },
  checkerLink: { en: "Check two tracks' key and BPM", es: "Compará la tonalidad y el BPM de dos temas" },
  glossaryLink: { en: "What harmonic mixing is", es: "Qué es la mezcla armónica" },
} satisfies Record<string, Localized | Record<SiteLocale, string[]>>

/**
 * Four questions, like the other reference pages. Answers are prose about the
 * notation, not cells of the table: a number typed here would be the copy the
 * page exists to avoid, and the test that pairs the page with the constant
 * would not see it.
 */
export const CHEAT_SHEET_FAQ: FaqEntry[] = [
  {
    question: {
      en: "Is the Camelot wheel the same as the circle of fifths?",
      es: "¿La rueda Camelot es lo mismo que el círculo de quintas?",
    },
    answer: {
      en: "Yes — it is the circle of fifths with numbers instead of note names. A step clockwise is up a fifth in both. Camelot adds a second ring for the relative minors and calls the two rings B (major) and A (minor), so a DJ can match keys by comparing numbers instead of reading key signatures.",
      es: "Sí: es el círculo de quintas con números en vez de nombres de notas. Un paso en sentido horario sube una quinta en los dos. Camelot agrega un segundo anillo para las relativas menores y llama a los anillos B (mayor) y A (menor), así un DJ empareja tonalidades comparando números en vez de leer armaduras.",
    },
  },
  {
    question: {
      en: "What is the musical key for a Camelot code?",
      es: "¿Qué tonalidad es cada código Camelot?",
    },
    answer: {
      en: "Read it off the first table: every code is listed with its musical key in full and in the short spelling DJ software writes. 8B is C major and 8A is A minor; each number up is a fifth up. The table is generated from the converters the app uses, so it matches what EnergyCurve shows in your track list.",
      es: "Leelo en la primera tabla: cada código está con su tonalidad completa y con la abreviatura que escribe el software de DJ. 8B es Do mayor y 8A es La menor; cada número hacia arriba es una quinta arriba. La tabla se genera con los conversores que usa la app, así que coincide con lo que EnergyCurve muestra en tu lista de temas.",
    },
  },
  {
    question: {
      en: "Where do the recommended moves come from?",
      es: "¿De dónde salen los movimientos recomendados?",
    },
    answer: {
      en: "From a harmonic transition table an alpha user mixes by, which EnergyCurve audited and adopted in full: every cell is a fixed shift of the tonic, and the relation is symmetric. It replaced the old rule of counting steps around the wheel, which called half the valid moves a clash. The set analyser scores transitions with this same table.",
      es: "De una tabla de transiciones armónicas con la que mezcla un usuario alfa, que EnergyCurve auditó y adoptó entera: cada celda es un desplazamiento fijo de la tónica, y la relación es simétrica. Reemplazó la regla vieja de contar pasos en la rueda, que marcaba como choque a la mitad de los movimientos válidos. El analizador de sets puntúa las transiciones con esta misma tabla.",
    },
  },
  {
    question: {
      en: "Can I download the Camelot wheel?",
      es: "¿Puedo descargar la rueda Camelot?",
    },
    answer: {
      en: "Yes, as an SVG, free and without an account. It is drawn at build time from the same key data as the tables, so it carries every Camelot code with its musical key and Open Key code, and it scales to any size for printing or a phone lock screen.",
      es: "Sí, como SVG, gratis y sin cuenta. Se dibuja al compilar el sitio con los mismos datos de tonalidades que las tablas, así que trae cada código Camelot con su tonalidad y su código Open Key, y escala a cualquier tamaño para imprimir o para la pantalla bloqueada del teléfono.",
    },
  },
]

/** `{keys}` → 24, and so on. Numbers arrive from the data, never from here. */
export function fillCounts(
  text: string,
  counts: { keys: number; levels: number; targetsPerKey: number; totalMoves: number }
): string {
  return text
    .replaceAll("{keys}", String(counts.keys))
    .replaceAll("{levels}", String(counts.levels))
    .replaceAll("{targets}", String(counts.targetsPerKey))
    .replaceAll("{moves}", String(counts.totalMoves))
}
