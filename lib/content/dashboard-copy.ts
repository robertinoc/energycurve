import type { PlaylistContext } from "@/lib/product/strategy"
import type { SiteLocale } from "@/lib/content/site-copy"

/**
 * Localized copy for every dashboard surface (shell, home, playlists,
 * workspace, forms, server-action messages). Same shape as
 * analysis-copy.ts: leaves are Record<SiteLocale, string>, components index
 * with the locale they receive from their server parent, and `{slot}`
 * params interpolate via formatTemplate. The ES voice is rioplatense voseo,
 * matching the analysis recommendations.
 */

export type LocalizedLabel = Record<SiteLocale, string>

/**
 * Capitalized context labels. The ES strings deliberately keep the DJ-booth
 * jargon (same decision as CONTEXT_DISPLAY_NAMES in analysis-copy.ts) —
 * "warm up / main time / closing" is how Spanish-speaking DJs talk.
 */
export const CONTEXT_COPY: Record<PlaylistContext, LocalizedLabel> = {
  opening: { en: "Opening", es: "Opening" },
  main: { en: "Main time", es: "Main time" },
  closing: { en: "Closing", es: "Closing" },
}

export const DASHBOARD_COPY = {
  shell: {
    workspace: { en: "Workspace", es: "Workspace" },
    home: { en: "Home", es: "Inicio" },
    playlists: { en: "Playlists", es: "Playlists" },
    logOut: { en: "Log out", es: "Cerrar sesión" },
    openMenu: { en: "Open menu", es: "Abrir menú" },
    closeMenu: { en: "Close menu", es: "Cerrar menú" },
    language: { en: "Language", es: "Idioma" },
  },

  home: {
    heroSubtitle: {
      en: "Upload a set, get its energy curve, set score, and concrete fixes per track.",
      es: "Subí un set y recibí su curva de energía, el puntaje y arreglos concretos por track.",
    },
    dbAlertTitle: {
      en: "Database setup still needs attention",
      es: "La configuración de la base de datos necesita atención",
    },
    supabaseMissing: {
      en: "Your WorkOS session is valid, but Supabase is not configured yet. Add the required Supabase environment variables and restart the dev server.",
      es: "Tu sesión de WorkOS es válida, pero Supabase todavía no está configurado. Agregá las variables de entorno de Supabase y reiniciá el servidor de desarrollo.",
    },
    dbBootstrapFailed: {
      en: "Your WorkOS session is valid, but the application database could not be initialized. Confirm the Supabase environment variables and apply the initial schema migration.",
      es: "Tu sesión de WorkOS es válida, pero la base de datos de la aplicación no pudo inicializarse. Confirmá las variables de entorno de Supabase y aplicá la migración inicial del esquema.",
    },
    byHand: {
      en: "Prefer to build it by hand?",
      es: "¿Preferís armarla a mano?",
    },
    newFromScratch: {
      en: "New playlist from scratch",
      es: "Nueva playlist desde cero",
    },
    latestPlaylists: { en: "Latest playlists", es: "Últimas playlists" },
    pickUp: {
      en: "Pick up where you left off",
      es: "Retomá donde lo dejaste",
    },
    viewAll: { en: "View all", es: "Ver todas" },
    trackCount: {
      en: "{count} track{plural}",
      es: "{count} track{plural}",
    },
    edit: { en: "Edit", es: "Editar" },
    analyze: { en: "Analyze", es: "Analizar" },
  },

  playlists: {
    title: { en: "Your playlists", es: "Tus playlists" },
    subtitle: {
      en: "Each playlist is a set you can analyze: name, genre, and context drive how the energy engine reads the flow.",
      es: "Cada playlist es un set que podés analizar: el nombre, el género y el contexto definen cómo el motor de energía lee el flow.",
    },
    emptyTitle: { en: "No playlists yet", es: "Todavía no hay playlists" },
    emptyDescription: {
      en: "Create your first one above — then add tracks manually or paste a full tracklist.",
      es: "Creá la primera acá arriba — después sumá tracks a mano o pegá un tracklist completo.",
    },
    trackCount: { en: "{count} track(s)", es: "{count} track(s)" },
  },

  playlistDetail: {
    back: { en: "Playlists", es: "Playlists" },
    analyzeSet: { en: "Analyze set", es: "Analizar set" },
  },

  workspace: {
    curveEyebrow: { en: "Set energy curve", es: "Curva de energía del set" },
    curveTitle: { en: "The shape of the night", es: "La forma de la noche" },
    legendYourSet: { en: "your set", es: "tu set" },
    legendTarget: { en: "target", es: "objetivo" },
    previewUnsaved: {
      en: "Preview — unsaved order",
      es: "Vista previa — orden sin guardar",
    },
    undo: { en: "Undo", es: "Deshacer" },
    discard: { en: "Discard", es: "Descartar" },
    saveOrder: { en: "Save order", es: "Guardar orden" },
    saving: { en: "Saving…", es: "Guardando…" },
    orderSaved: { en: "Set order saved", es: "Orden del set guardado" },
    orderSaveFailed: {
      en: "Could not save order",
      es: "No se pudo guardar el orden",
    },
    statsTracks: { en: "tracks", es: "tracks" },
    statsAvg: { en: "avg", es: "prom." },
    statsEnergy: { en: "energy", es: "energía" },
    minutesShort: { en: "{minutes} min", es: "{minutes} min" },
  },

  trackTable: {
    tracklist: { en: "Tracklist", es: "Tracklist" },
    energyLegendLow: { en: "low → high", es: "baja → alta" },
    energyLegend: { en: "Energy", es: "Energía" },
    columns: { en: "Columns", es: "Columnas" },
    optionalColumns: { en: "Optional columns", es: "Columnas opcionales" },
    emptyState: {
      en: "No tracks yet. Add one below, or paste a full tracklist in the import panel.",
      es: "Todavía no hay tracks. Sumá uno abajo, o pegá un tracklist completo en el panel de import.",
    },
    headerEnergy: { en: "Energy", es: "Energía" },
    headerArtist: { en: "Artist", es: "Artista" },
    headerTitle: { en: "Title", es: "Título" },
    headerBpm: { en: "BPM", es: "BPM" },
    headerCamelot: { en: "Camelot", es: "Camelot" },
    headerKey: { en: "Key", es: "Key" },
    headerComment: { en: "Comment", es: "Comentario" },
    fieldArtist: { en: "Artist", es: "Artista" },
    fieldTrack: { en: "Track", es: "Track" },
    fieldTrackPlaceholder: { en: "Track title", es: "Título del track" },
    fieldEnergy: { en: "Energy (1–10)", es: "Energía (1–10)" },
    fieldEnergyPlaceholder: { en: "Optional", es: "Opcional" },
    addTrack: { en: "Add track", es: "Agregar track" },
    adding: { en: "Adding…", es: "Agregando…" },
    saveChanges: { en: "Save changes", es: "Guardar cambios" },
    saving: { en: "Saving…", es: "Guardando…" },
    cancel: { en: "Cancel", es: "Cancelar" },
    close: { en: "Close", es: "Cerrar" },
    confirm: { en: "Confirm", es: "Confirmar" },
    editTrack: { en: "Edit track", es: "Editar track" },
    removeTrack: { en: "Remove track", es: "Quitar track" },
    cancelRemove: { en: "Cancel remove", es: "Cancelar quitar" },
    dragToReorder: { en: "Drag to reorder", es: "Arrastrá para reordenar" },
    energySource: {
      en: "energy source: {source}",
      es: "origen de la energía: {source}",
    },
  },

  columnLabels: {
    genre: { en: "Genre", es: "Género" },
    duration: { en: "Time", es: "Duración" },
    comment: { en: "Comment", es: "Comentario" },
  },

  createForm: {
    title: { en: "New playlist", es: "Nueva playlist" },
    description: {
      en: "Name your set and lock in the genre and context — the analysis engine adapts to both.",
      es: "Nombrá tu set y fijá el género y el contexto — el motor de análisis se adapta a los dos.",
    },
    name: { en: "Name", es: "Nombre" },
    namePlaceholder: {
      en: "Warehouse opening set",
      es: "Set de opening en el warehouse",
    },
    genre: { en: "Genre", es: "Género" },
    context: { en: "Context", es: "Contexto" },
    creating: { en: "Creating…", es: "Creando…" },
    create: { en: "Create playlist", es: "Crear playlist" },
  },

  importUpload: {
    eyebrow: { en: "Import your playlist", es: "Importá tu playlist" },
    title: {
      en: "Drop your set. See its energy.",
      es: "Soltá tu set. Mirá su energía.",
    },
    subtitle: {
      en: "Export from Rekordbox or Traktor and we chart the whole set — BPM, keys, genres and Mixed In Key energies included.",
      es: "Exportá desde Rekordbox o Traktor y graficamos el set completo — BPM, keys, géneros y energías de Mixed In Key incluidos.",
    },
    dropzoneMain: {
      en: "Drag your playlist here, or",
      es: "Arrastrá tu playlist acá, o",
    },
    browse: { en: "browse files", es: "elegí el archivo" },
    dropzoneHint: {
      en: "One file, straight from your DJ software",
      es: "Un archivo, directo de tu software de DJ",
    },
    fileReady: { en: "Ready to import", es: "Listo para importar" },
    readsLabel: { en: "We read for you", es: "Leemos por vos" },
    readKey: { en: "Key → Camelot", es: "Key → Camelot" },
    readGenres: { en: "Genre tags", es: "Tags de género" },
    readMik: { en: "Mixed In Key energy", es: "Energía de Mixed In Key" },
    setContext: { en: "Set context", es: "Contexto del set" },
    genre: { en: "Genre", es: "Género" },
    autoDetect: { en: "Auto-detect from file", es: "Auto-detectar del archivo" },
    recommended: { en: "Recommended", es: "Recomendado" },
    importing: { en: "Importing…", es: "Importando…" },
    importCta: { en: "Import playlist", es: "Importar playlist" },
    ctaHint: {
      en: "~5 seconds · nothing leaves your account",
      es: "~5 segundos · nada sale de tu cuenta",
    },
  },

  tracklistImport: {
    title: { en: "Paste a tracklist", es: "Pegá un tracklist" },
    description: {
      en: 'One track per line. Numbering prefixes and a trailing "(128 bpm)" are picked up automatically. Flip the format if the preview looks swapped.',
      es: 'Un track por línea. Los prefijos numerados y un "(128 bpm)" al final se detectan solos. Cambiá el formato si la vista previa se ve invertida.',
    },
    lineFormat: { en: "Line format", es: "Formato de línea" },
    formatArtistTrack: { en: "Artist – Track", es: "Artista – Track" },
    formatTrackArtist: { en: "Track – Artist", es: "Track – Artista" },
    tracklist: { en: "Tracklist", es: "Tracklist" },
    preview: {
      en: "Preview — {count} track(s)",
      es: "Vista previa — {count} track(s)",
    },
    skippedSuffix: {
      en: ", {count} skipped line(s)",
      es: ", {count} línea(s) salteada(s)",
    },
    andMore: { en: "…and {count} more", es: "…y {count} más" },
    lineError: {
      en: "Line {line}: no “Artist – Track” separator found — it will be skipped.",
      es: "Línea {line}: no se encontró el separador “Artista – Track” — se va a saltear.",
    },
    replacesWarning: {
      en: "Importing replaces the {count} track(s) currently in this playlist.",
      es: "Importar reemplaza los {count} track(s) que tiene esta playlist ahora.",
    },
    importing: { en: "Importing…", es: "Importando…" },
    importCta: {
      en: "Import {count} track(s)",
      es: "Importar {count} track(s)",
    },
  },

  exportMenu: {
    export: { en: "Export…", es: "Exportar…" },
    djSoftware: { en: "DJ software", es: "Software de DJ" },
    forRekordbox: { en: "For Rekordbox", es: "Para Rekordbox" },
    forTraktor: { en: "For Traktor", es: "Para Traktor" },
    forMusicApps: { en: "For music apps", es: "Para apps de música" },
    forSerato: { en: "For Serato", es: "Para Serato" },
    soon: { en: "soon", es: "pronto" },
    plain: { en: "Plain", es: "Plano" },
    csvFile: { en: "CSV file", es: "Archivo CSV" },
    textFile: { en: "Text file", es: "Archivo de texto" },
    defaultTag: { en: "default", es: "por defecto" },
  },

  deleteButton: {
    deleteAria: { en: "Delete {name}", es: "Eliminar {name}" },
    deleting: { en: "Deleting…", es: "Eliminando…" },
    confirmDelete: { en: "Confirm delete", es: "Confirmar eliminación" },
    cancel: { en: "Cancel", es: "Cancelar" },
  },

  genreNote: {
    detected: { en: "Main genre detected", es: "Género principal detectado" },
  },

  /** Messages returned by server actions (toasts / inline). */
  actions: {
    genericError: {
      en: "Something went wrong while saving. Please try again.",
      es: "Algo salió mal al guardar. Probá de nuevo.",
    },
    rateLimited: {
      en: "Too many changes in a short time. Wait a moment and try again.",
      es: "Demasiados cambios en poco tiempo. Esperá un momento y probá de nuevo.",
    },
    reviewFields: {
      en: "Review the highlighted fields.",
      es: "Revisá los campos marcados.",
    },
    playlistDeleted: { en: "Playlist deleted.", es: "Playlist eliminada." },
    trackAdded: { en: "Track added.", es: "Track agregado." },
    trackUpdated: { en: "Track updated.", es: "Track actualizado." },
    trackRemoved: { en: "Track removed.", es: "Track eliminado." },
    trackMoved: { en: "Track moved.", es: "Track movido." },
    importedTracks: {
      en: "Imported {count} track(s).{skipped}",
      es: "Se importaron {count} track(s).{skipped}",
    },
    chooseFile: {
      en: "Choose a Rekordbox XML or Traktor NML file to import.",
      es: "Elegí un archivo XML de Rekordbox o NML de Traktor para importar.",
    },
    fileTooLarge: {
      en: "That file is too large. Export a single playlist and retry.",
      es: "Ese archivo es demasiado grande. Exportá una sola playlist y reintentá.",
    },
    pickContext: {
      en: "Pick a set context (opening, main, or closing).",
      es: "Elegí un contexto de set (opening, main o closing).",
    },
    cantReadFile: {
      en: "We couldn't read that file. Make sure it's a Rekordbox XML or Traktor NML export.",
      es: "No pudimos leer ese archivo. Asegurate de que sea un export XML de Rekordbox o NML de Traktor.",
    },
    noValidLines: {
      en: "No valid lines found in the pasted text.",
      es: "No se encontraron líneas válidas en el texto pegado.",
    },
    noValidLinesParsed: {
      en: "No valid lines found — {count} line(s) could not be parsed.",
      es: "No se encontraron líneas válidas — {count} línea(s) no se pudieron interpretar.",
    },
    importSkippedSuffix: {
      en: " {count} line(s) were skipped.",
      es: " Se saltearon {count} línea(s).",
    },
    importedSetName: {
      en: "Imported {source} set",
      es: "Set importado de {source}",
    },
  },

  /** Custom contexts & genres ("behaves like" model). */
  taxonomy: {
    groupStandard: { en: "Standard", es: "Estándar" },
    groupYours: { en: "Yours", es: "Tuyos" },
    behavesLikeHint: { en: "≈ {base}", es: "≈ {base}" },
    addContext: { en: "Add your own context", es: "Agregá tu propio contexto" },
    addGenre: { en: "Add your own genre", es: "Agregá tu propio género" },
    modalContextTitle: {
      en: "Add your own context",
      es: "Agregá tu propio contexto",
    },
    modalGenreTitle: { en: "Add your own genre", es: "Agregá tu propio género" },
    modalContextSub: {
      en: "Name it the way you play it — the engine just needs to know what it feels like.",
      es: "Nombralo como lo tocás — el motor solo necesita saber a qué se parece.",
    },
    modalGenreSub: {
      en: "Name it the way you tag it — the engine just needs to know what it sounds closest to.",
      es: "Nombralo como lo etiquetás — el motor solo necesita saber a qué suena más parecido.",
    },
    nameLabel: { en: "Name", es: "Nombre" },
    contextNamePlaceholder: { en: "Sunset", es: "Sunset" },
    genreNamePlaceholder: { en: "Folktronica", es: "Folktronica" },
    feelsClosestTo: { en: "Feels closest to", es: "Se parece más a" },
    whyContext: {
      en: "EnergyCurve scores your set against an ideal curve per context. Your custom context borrows the curve of the one it feels closest to — so it gets a proven shape with your own name everywhere in the app.",
      es: "EnergyCurve puntúa tu set contra una curva ideal por contexto. Tu contexto custom toma prestada la curva del que más se le parece — una forma probada, con tu nombre en toda la app.",
    },
    whyGenre: {
      en: "Genres drive BPM bands and transition tolerances. Your custom genre borrows the rules of the closest one — no invented scoring, your name everywhere in the app.",
      es: "Los géneros definen bandas de BPM y tolerancias de transición. Tu género custom toma prestadas las reglas del más cercano — sin reglas inventadas, con tu nombre en toda la app.",
    },
    create: { en: "Create", es: "Crear" },
    creating: { en: "Creating…", es: "Creando…" },
    cancel: { en: "Cancel", es: "Cancelar" },
    deleteEntryAria: { en: "Delete {name}", es: "Eliminar {name}" },
    nameInvalid: {
      en: "Use 2–32 characters.",
      es: "Usá entre 2 y 32 caracteres.",
    },
    limitReached: {
      en: "You reached the limit of {max} custom entries.",
      es: "Llegaste al límite de {max} entradas custom.",
    },
    duplicateName: {
      en: "You already have one with that name.",
      es: "Ya tenés una con ese nombre.",
    },
  },
} as const
