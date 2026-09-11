import type { SiteLocale } from "@/lib/content/site-copy"

/**
 * "Estableced una base, qué datos son necesarios en el csv."
 *
 * An alpha user noticed we export CSV and couldn't import it, and asked for a
 * spec he could point Lexicon at. This page is that spec — public, because you
 * need it *before* you have a playlist in EnergyCurve to export and copy.
 *
 * The column table is generated from the same synonym set the parser resolves
 * with (`lib/playlists/tabular-columns.ts`), so the page cannot promise a
 * spelling the reader doesn't accept.
 */

type Localized = Record<SiteLocale, string>

interface FormatRow {
  /** A proper noun stays as-is; anything descriptive gets translated. */
  format: string | Localized
  carries: Localized
  relinks: boolean
}

const FORMATS: FormatRow[] = [
  {
    format: "Traktor NML",
    carries: {
      en: "Everything: BPM, key, genre, energy, length and the file path. Your hotcues, comments and tags come back untouched on export.",
      es: "Todo: BPM, key, género, energía, duración y la ruta del archivo. Tus hotcues, comentarios y tags vuelven intactos al exportar.",
    },
    relinks: true,
  },
  {
    format: "Rekordbox XML",
    carries: {
      en: "Everything, same as NML — including memory cues and ratings on the way back out.",
      es: "Todo, igual que el NML — incluidos los cue points de memoria y los ratings a la vuelta.",
    },
    relinks: true,
  },
  {
    format: "CSV",
    carries: {
      en: "Whatever columns you give it — see the table below. The most flexible option, and the one almost every tool can produce.",
      es: "Las columnas que le pongas — mirá la tabla de abajo. La opción más flexible, y la que casi cualquier herramienta puede generar.",
    },
    relinks: true,
  },
  {
    format: "Rekordbox TXT",
    carries: {
      en: "BPM, key, genre and length. Rekordbox' own TXT has no file path, so a native re-export can't relink.",
      es: "BPM, key, género y duración. El TXT de Rekordbox no trae la ruta del archivo, así que un re-export nativo no puede reconectar.",
    },
    relinks: false,
  },
  {
    format: "M3U8 / M3U",
    carries: {
      en: "File paths and track lengths. That is all the format has — there is no BPM, key, genre or energy in an M3U8, so there is nothing for us to read.",
      es: "Rutas de archivo y duraciones. Eso es todo lo que el formato tiene — un M3U8 no lleva BPM, key, género ni energía, así que no hay nada que leer.",
    },
    relinks: true,
  },
  {
    format: { en: "Audio files", es: "Archivos de audio" },
    carries: {
      en: "Read straight from the tags in your files. Your audio never leaves your computer — only the parsed metadata.",
      es: "Se leen directo de los tags de tus archivos. Tu audio nunca sale de tu computadora — sólo la metadata.",
    },
    relinks: false,
  },
]

interface ColumnRow {
  field: Localized
  accepted: string
  required: boolean
  note: Localized
}

const COLUMNS: ColumnRow[] = [
  {
    field: { en: "Title", es: "Título" },
    accepted: "Title · Track Title · Name · Song · Título · Canción · Tema",
    required: true,
    note: {
      en: "The only column we insist on. A row with no title isn't a track.",
      es: "La única columna que exigimos. Una fila sin título no es un track.",
    },
  },
  {
    field: { en: "Artist", es: "Artista" },
    accepted: "Artist · Artists · Artista",
    required: false,
    note: {
      en: "Optional: plenty of exports put \"Artist - Title\" in one column.",
      es: "Opcional: muchos exports ponen \"Artista - Título\" en una sola columna.",
    },
  },
  {
    field: { en: "BPM", es: "BPM" },
    accepted: "BPM · Tempo",
    required: false,
    note: {
      en: "Decimals are fine. A comma decimal separator is read too.",
      es: "Los decimales están bien. La coma decimal también se lee.",
    },
  },
  {
    field: { en: "Key", es: "Key" },
    accepted: "Key · Tonality · Camelot · Open Key · Tonalidad · Clave",
    required: false,
    note: {
      en: "Any notation — Camelot, Open Key or musical. We convert.",
      es: "Cualquier notación — Camelot, Open Key o musical. Nosotros convertimos.",
    },
  },
  {
    field: { en: "Energy", es: "Energía" },
    accepted: "Energy · EnergyLevel · Energía",
    required: false,
    note: {
      en: "1 to 10. A bare number is fine in this column.",
      es: "Del 1 al 10. Un número solo está bien en esta columna.",
    },
  },
  {
    field: { en: "Genre", es: "Género" },
    accepted: "Genre · Style · Género",
    required: false,
    note: {
      en: "Used to detect the set's dominant genre.",
      es: "Se usa para detectar el género dominante del set.",
    },
  },
  {
    field: { en: "Length", es: "Duración" },
    accepted: "Time · Duration · Length · Duración · Tiempo",
    required: false,
    note: {
      en: "\"5:17\" or plain seconds.",
      es: "\"5:17\" o segundos pelados.",
    },
  },
  {
    field: { en: "File path", es: "Ruta del archivo" },
    accepted: "Location · Path · File · Filename · Ruta · Archivo",
    required: false,
    note: {
      en: "Worth including: it's what lets a CSV import export back to Rekordbox or Traktor and still find your files.",
      es: "Vale la pena incluirla: es lo que permite que un import por CSV se exporte a Rekordbox o Traktor y siga encontrando tus archivos.",
    },
  },
  {
    field: { en: "Comment", es: "Comentario" },
    accepted: "Comment · Comments · Grouping · Comentario",
    required: false,
    note: {
      en: "Read for an energy value when there's no Energy column.",
      es: "Se lee buscando energía cuando no hay columna Energy.",
    },
  },
]

export function getImportFormatsCopy(locale: SiteLocale) {
  const pick = (value: Localized) => value[locale]

  return {
    title:
      locale === "es"
        ? "Qué leemos de tus archivos"
        : "What we read from your files",
    intro:
      locale === "es"
        ? "Podés subir un export de tu software de DJ, un CSV, o tus archivos de audio directamente. Esto es exactamente qué trae cada formato — y qué columnas necesita un CSV, que es la opción más flexible porque casi cualquier herramienta la genera."
        : "You can upload an export from your DJ software, a CSV, or your audio files directly. Here is exactly what each format carries — and which columns a CSV needs, which is the most flexible option because almost any tool can produce one.",
    formatsHeading: locale === "es" ? "Formatos" : "Formats",
    formatHeading: locale === "es" ? "Formato" : "Format",
    carriesHeading: locale === "es" ? "Qué trae" : "What it carries",
    relinksHeading: locale === "es" ? "Reconecta archivos" : "Relinks files",
    yes: locale === "es" ? "Sí" : "Yes",
    no: locale === "es" ? "No" : "No",
    columnsHeading: locale === "es" ? "Columnas del CSV" : "CSV columns",
    columnsNote:
      locale === "es"
        ? "El orden de las columnas no importa: las resolvemos por el nombre del encabezado, y aceptamos varios nombres para cada una. El orden de las filas es el orden de reproducción. Los acentos no molestan."
        : "Column order doesn't matter: we resolve them by header name and accept several names for each. Row order is play order. Accents are fine.",
    fieldHeading: locale === "es" ? "Dato" : "Field",
    acceptedHeading:
      locale === "es" ? "Nombres que aceptamos" : "Header names we accept",
    requiredLabel: locale === "es" ? "obligatoria" : "required",
    referenceHeading:
      locale === "es" ? "La referencia más rápida" : "The fastest reference",
    referenceBody:
      locale === "es"
        ? "Exportá cualquier playlist de EnergyCurve como CSV y mirá el encabezado: ese archivo es exactamente lo que el importador lee de vuelta. Si tu herramienta puede producir esas columnas, entra sin tocar nada."
        : "Export any EnergyCurve playlist as CSV and look at the header: that file is exactly what the importer reads back. If your tool can produce those columns, it imports as-is.",
    delimiterHeading: locale === "es" ? "Comas o punto y coma" : "Commas or semicolons",
    delimiterBody:
      locale === "es"
        ? "Los dos funcionan. Si abrís un CSV en Excel con configuración regional en español y lo volvés a guardar, te devuelve punto y coma — y eso también lo leemos. Un título con una coma adentro tiene que ir entre comillas, que es lo que hace cualquier export."
        : "Both work. If you open a CSV in Excel on a Spanish or German locale and save it again, you get semicolons back — we read those too. A title with a comma in it needs quotes around it, which is what every export already does.",
    formats: FORMATS.map((row) => ({
      format: typeof row.format === "string" ? row.format : pick(row.format),
      carries: pick(row.carries),
      relinks: row.relinks,
    })),
    columns: COLUMNS.map((row) => ({
      field: pick(row.field),
      accepted: row.accepted,
      required: row.required,
      note: pick(row.note),
    })),
  }
}

export type ImportFormatsCopy = ReturnType<typeof getImportFormatsCopy>
