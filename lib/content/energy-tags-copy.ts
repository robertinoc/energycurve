import type { SiteLocale } from "@/lib/content/site-copy"

/**
 * "Which tag do I put the energy in, and in what format?"
 *
 * An alpha user asked this in as many words, and it was a fair complaint: the
 * product assumed Mixed In Key and never said so. He uses Lexicon DJ, which
 * writes wherever you tell it to, and had no way to find out what we read.
 *
 * So this page states the contract instead of leaving people to guess it. It is
 * kept as data rather than prose because the parser is tested against the same
 * list of accepted strings (`tests/energy-tag.test.ts`) — the page and the code
 * are meant to be checkable against each other.
 */

type Localized = Record<SiteLocale, string>

export interface EnergyFieldRow {
  /** Where the value goes, in the DJ's own vocabulary. */
  field: Localized
  /** Which software writes there, and what we call it internally. */
  where: Localized
  /** Whether a bare number ("7") is accepted there. */
  bareNumber: boolean
}

export interface EnergyFormatRow {
  written: string
  reads: string
  note: Localized
}

const FIELDS: EnergyFieldRow[] = [
  {
    field: { en: "A field named ENERGY", es: "Un campo llamado ENERGY" },
    where: {
      en: "ID3 TXXX:ENERGY, Vorbis/FLAC ENERGY, iTunes/MP4 ENERGY atom. Lexicon DJ can write a custom field with this name. This is the cleanest option and it wins over everything else.",
      es: "ID3 TXXX:ENERGY, ENERGY de Vorbis/FLAC, atom ENERGY de iTunes/MP4. Lexicon DJ puede escribir un campo custom con ese nombre. Es la opción más limpia y le gana a todas las demás.",
    },
    bareNumber: true,
  },
  {
    field: { en: "Comment", es: "Comentario" },
    where: {
      en: "Where Mixed In Key writes. Traktor INFO COMMENT, Rekordbox Comments, ID3 COMM. Also Traktor's second comment field (COMMENT2).",
      es: "Donde escribe Mixed In Key. INFO COMMENT en Traktor, Comments en Rekordbox, COMM en ID3. También el segundo campo de comentario de Traktor (COMMENT2).",
    },
    bareNumber: false,
  },
  {
    field: { en: "Grouping", es: "Grouping" },
    where: {
      en: "Rekordbox's Grouping column and the ID3 grouping frame — the usual choice for DJs who keep their comments for notes.",
      es: "La columna Grouping de Rekordbox y el frame grouping de ID3 — la opción habitual para DJs que dejan los comentarios para notas.",
    },
    bareNumber: false,
  },
  {
    field: { en: "Lyrics", es: "Lyrics" },
    where: {
      en: "The unsynchronised lyrics frame, and Traktor's KEY_LYRICS field. A real place to put it: nothing else reads it.",
      es: "El frame de letra no sincronizada, y el campo KEY_LYRICS de Traktor. Es un lugar válido: nada más lo lee.",
    },
    bareNumber: true,
  },
  {
    field: { en: "Producer", es: "Producer" },
    where: {
      en: "Traktor's INFO PRODUCER field.",
      es: "El campo INFO PRODUCER de Traktor.",
    },
    bareNumber: true,
  },
  {
    field: { en: "Composer", es: "Composer" },
    where: {
      en: "Rekordbox's Composer column and the ID3 composer frame.",
      es: "La columna Composer de Rekordbox y el frame composer de ID3.",
    },
    bareNumber: true,
  },
  {
    field: { en: "Label", es: "Sello (Label)" },
    where: {
      en: "Read as a last resort, and only with the word \"Energy\" written out.",
      es: "Se lee como último recurso, y sólo con la palabra \"Energy\" escrita.",
    },
    bareNumber: false,
  },
]

const FORMATS: EnergyFormatRow[] = [
  { written: "Energy 7", reads: "7", note: { en: "Mixed In Key's own format.", es: "El formato de Mixed In Key." } },
  { written: "8A - Energy 7", reads: "7", note: { en: "Key and energy in one comment — read fine.", es: "Key y energía en un comentario — se lee bien." } },
  { written: "Energy: 7", reads: "7", note: { en: "", es: "" } },
  { written: "Energy=7", reads: "7", note: { en: "", es: "" } },
  { written: "Energy 7/10", reads: "7", note: { en: "", es: "" } },
  { written: "Energy Level 7", reads: "7", note: { en: "Also EnergyLevel 7.", es: "También EnergyLevel 7." } },
  { written: "7 Energy", reads: "7", note: { en: "Value first works too.", es: "El valor primero también funciona." } },
  { written: "01 Energy", reads: "1", note: { en: "Leading zeros are fine.", es: "Los ceros adelante están bien." } },
  { written: "1.0 Energy", reads: "1", note: { en: "Decimals are rounded: 7.5 reads as 8.", es: "Los decimales se redondean: 7,5 se lee como 8." } },
  { written: "E7", reads: "7", note: { en: "Only when it is the whole field.", es: "Sólo cuando es todo el contenido del campo." } },
  { written: "7", reads: "7", note: { en: "Only in the fields marked above — in a comment, a bare 7 is a comment.", es: "Sólo en los campos marcados arriba — en un comentario, un 7 solo es un comentario." } },
]

const NOT_READ: Localized[] = [
  {
    en: "\"high energy\" — no number, nothing to read.",
    es: "\"high energy\" — sin número, no hay nada que leer.",
  },
  {
    en: "\"Energy 0\" or \"Energy 11\" — the scale is 1 to 10, and a value outside it belongs to somebody else's scale.",
    es: "\"Energy 0\" o \"Energy 11\" — la escala es de 1 a 10, y un valor fuera de eso pertenece a otra escala.",
  },
  {
    en: "A bare number in the comment field. \"128\" is a BPM, \"2024\" is a year, and \"7\" could be either — so we don't guess.",
    es: "Un número solo en el campo de comentario. \"128\" es un BPM, \"2024\" es un año, y \"7\" podría ser cualquiera — así que no adivinamos.",
  },
  {
    en: "\"E7\" inside a longer string, so a catalog number like E-1201 is never mistaken for an energy.",
    es: "\"E7\" dentro de un texto más largo, para que un número de catálogo como E-1201 nunca se confunda con energía.",
  },
]

export function getEnergyTagsCopy(locale: SiteLocale) {
  const pick = (value: Localized) => value[locale]

  return {
    title: locale === "es" ? "Dónde poner la energía" : "Where to put your energy values",
    intro:
      locale === "es"
        ? "No todo el mundo usa Mixed In Key. Si tu energía la calcula Lexicon DJ, Serato, un script propio o la escribís a mano, esto es exactamente en qué tag la leemos y con qué formato. Si ya la tenés en otro campo, decinos y lo agregamos."
        : "Not everyone uses Mixed In Key. If your energy comes from Lexicon DJ, Serato, your own script, or you type it in by hand, this is exactly which tag we read it from and in what format. If yours lives somewhere else, tell us and we'll add it.",
    fieldsHeading: locale === "es" ? "En qué campo" : "Which field",
    fieldsNote:
      locale === "es"
        ? "Se leen en este orden. Un campo llamado ENERGY define el valor por sí solo; después gana el primer campo donde esté la palabra \"Energy\" escrita."
        : "Read in this order. A field named ENERGY settles it on its own; after that, the first field with the word \"Energy\" written out wins.",
    bareNumberYes: locale === "es" ? "Sí" : "Yes",
    bareNumberNo: locale === "es" ? "No" : "No",
    bareNumberHeading: locale === "es" ? "¿Acepta sólo el número?" : "Bare number accepted?",
    fieldHeading: locale === "es" ? "Campo" : "Field",
    whereHeading: locale === "es" ? "Dónde vive" : "Where it lives",
    formatsHeading: locale === "es" ? "Con qué formato" : "Which format",
    writtenHeading: locale === "es" ? "Si escribís" : "If you write",
    readsHeading: locale === "es" ? "Leemos" : "We read",
    notReadHeading: locale === "es" ? "Qué NO leemos, a propósito" : "What we deliberately don't read",
    notReadNote:
      locale === "es"
        ? "Un número equivocado con confianza es peor que un número ausente: el ausente se ve, el equivocado te reordena el set en silencio."
        : "A confidently wrong number is worse than a missing one: a missing one is visibly missing, and a wrong one quietly reshapes your set.",
    provenanceHeading: locale === "es" ? "Te decimos de dónde salió" : "We tell you where it came from",
    provenanceBody:
      locale === "es"
        ? "Después de importar, EnergyCurve muestra para cuántos tracks encontró energía y de qué campo la leyó. Si dice 0 de 24, el problema es de formato y no tuyo — y esta página te dice cuál cambiar."
        : "After an import, EnergyCurve shows how many tracks it found energy for and which field it read. If it says 0 of 24, that's a format mismatch and not your fault — and this page tells you which one to change.",
    noEnergyHeading: locale === "es" ? "Si no tenés energía en ningún tag" : "If you have no energy tags at all",
    noEnergyBody:
      locale === "es"
        ? "No pasa nada: EnergyCurve estima la curva por BPM, género y posición, y podés editar cualquier valor a mano en la tabla de tracks. Los valores de tus tags simplemente hacen que el análisis arranque de datos reales en lugar de una estimación."
        : "That's fine: EnergyCurve estimates the curve from BPM, genre and position, and you can edit any value by hand in the track table. Tags just let the analysis start from real data instead of an estimate.",
    fields: FIELDS.map((row) => ({
      field: pick(row.field),
      where: pick(row.where),
      bareNumber: row.bareNumber,
    })),
    formats: FORMATS.map((row) => ({
      written: row.written,
      reads: row.reads,
      note: pick(row.note),
    })),
    notRead: NOT_READ.map(pick),
  }
}

export type EnergyTagsCopy = ReturnType<typeof getEnergyTagsCopy>
