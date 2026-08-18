import type { CurveShape, PlaylistContext } from "@/lib/product/strategy"
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

/**
 * Names and one-line promises for the target-curve shapes.
 *
 * The description matters as much as the name: "after-hours" tells a DJ nothing
 * about what the scorer will now expect of them, while "starts high and holds a
 * long plateau" is a claim they can agree or disagree with before committing.
 */
export const CURVE_SHAPE_COPY: Record<
  CurveShape,
  { label: LocalizedLabel; promise: LocalizedLabel }
> = {
  warm_up: {
    label: { en: "Warm-up", es: "Warm-up" },
    promise: {
      en: "Builds slowly and hands over warm, without ever peaking.",
      es: "Sube despacio y entrega la pista caliente, sin llegar nunca al pico.",
    },
  },
  peak_time: {
    label: { en: "Peak time", es: "Peak time" },
    promise: {
      en: "Busy from track one, tops out early and holds there.",
      es: "Arranca fuerte, llega al techo temprano y se mantiene.",
    },
  },
  after_hours: {
    label: { en: "After-hours", es: "After-hours" },
    promise: {
      en: "A long hypnotic plateau — staying flat is the craft, not a flaw.",
      es: "Una meseta hipnótica larga — mantenerse plano es el oficio, no un error.",
    },
  },
  journey: {
    label: { en: "Journey", es: "Journey" },
    promise: {
      en: "Two acts: a build, a deliberate mid-set breath, then a bigger build.",
      es: "Dos actos: una subida, un respiro deliberado a mitad de set, y otra subida más grande.",
    },
  },
  landing: {
    label: { en: "Landing", es: "Landing" },
    promise: {
      en: "Peaks early and comes down on purpose, so ending lower is correct.",
      es: "Pica temprano y baja a propósito, así que terminar abajo es lo correcto.",
    },
  },
}

export const DASHBOARD_COPY = {
  shell: {
    workspace: { en: "Workspace", es: "Workspace" },
    home: { en: "Home", es: "Inicio" },
    playlists: { en: "Playlists", es: "Playlists" },
    library: { en: "Library", es: "Librería" },
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
    // Error boundary: shown instead of the browser's own failure page when a
    // dashboard render throws. Keeps the user inside the app, with a way out.
    crashTitle: {
      en: "The dashboard didn't load",
      es: "El dashboard no cargó",
    },
    // App-wide variant (app/error.tsx covers every route, not just /dashboard).
    crashTitleApp: {
      en: "This page didn't load",
      es: "Esta página no cargó",
    },
    crashBodyApp: {
      en: "Something failed on our side. Your data is safe — try again, and if it keeps happening the reference below helps us trace it.",
      es: "Algo falló de nuestro lado. Tus datos están a salvo — probá de nuevo, y si sigue pasando la referencia de abajo nos ayuda a rastrearlo.",
    },
    crashBody: {
      en: "Something failed on our side while loading your sets. Your data is safe — try again, and if it keeps happening the reference below helps us trace it.",
      es: "Algo falló de nuestro lado al cargar tus sets. Tus datos están a salvo — probá de nuevo, y si sigue pasando la referencia de abajo nos ayuda a rastrearlo.",
    },
    crashRetry: {
      en: "Try again",
      es: "Reintentar",
    },
    crashHome: {
      en: "Back to home",
      es: "Volver al inicio",
    },
    crashReference: {
      en: "Reference",
      es: "Referencia",
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
    yourSets: { en: "Your sets", es: "Tus sets" },
    searchPlaceholder: { en: "Search sets…", es: "Buscar sets…" },
    viewRecent: { en: "Recent", es: "Recientes" },
    viewByGenre: { en: "By genre", es: "Por género" },
    noMatches: {
      en: 'No sets match "{query}".',
      es: 'Ningún set coincide con "{query}".',
    },
  },

  firstRun: {
    title: { en: "Get your first set scored", es: "Conseguí el puntaje de tu primer set" },
    subtitle: {
      en: "Three steps. It disappears on its own once you've done them.",
      es: "Tres pasos. Desaparece solo cuando los hiciste.",
    },
    importTitle: { en: "Bring your music in", es: "Traé tu música" },
    importBody: {
      en: "Drop a Rekordbox or Traktor export, a folder of audio files, or paste a tracklist. Your audio never leaves your machine.",
      es: "Soltá un export de Rekordbox o Traktor, una carpeta de archivos, o pegá un tracklist. Tu audio nunca sale de tu máquina.",
    },
    analyzeTitle: { en: "See the shape of it", es: "Mirá qué forma tiene" },
    analyzeBody: {
      en: "The curve, a score out of ten, and the specific tracks that break it.",
      es: "La curva, un puntaje sobre diez, y los tracks concretos que la rompen.",
    },
    improveTitle: { en: "Change something and run it again", es: "Cambiá algo y analizalo de nuevo" },
    improveBody: {
      en: "Apply a fix or reorder by hand, then re-analyse. Watching the score move is the whole point.",
      es: "Aplicá un arreglo o reordená a mano, y volvé a analizar. Ver moverse el puntaje es todo el punto.",
    },
    currentBadge: { en: "You're here", es: "Estás acá" },
  },

  compare: {
    title: { en: "Compare two sets", es: "Comparar dos sets" },
    back: { en: "Back to set", es: "Volver al set" },
    pick: { en: "Compare with", es: "Comparar con" },
    pickEmpty: {
      en: "You need a second set to compare against.",
      es: "Necesitás un segundo set para comparar.",
    },
    pickPrompt: {
      en: "Pick a set to compare this one against.",
      es: "Elegí contra qué set querés comparar este.",
    },
    scoreA: { en: "This set", es: "Este set" },
    scoreB: { en: "The other one", es: "El otro" },
    harmony: { en: "Harmonic transitions", es: "Transiciones armónicas" },
    overlapTitle: { en: "Played in both", es: "Tocados en los dos" },
    overlapNone: {
      en: "Nothing repeats between these two. For a residency, that's the answer you want.",
      es: "No se repite nada entre estos dos. Para una residencia, esa es la respuesta que querés.",
    },
    overlapRatio: {
      en: "{percent}% of the shorter set repeats",
      es: "Se repite el {percent}% del set más corto",
    },
    positions: { en: "#{a} here · #{b} there", es: "#{a} acá · #{b} allá" },
    onlyA: { en: "Only in this set", es: "Solo en este set" },
    onlyB: { en: "Only in the other", es: "Solo en el otro" },
    lockedTitle: {
      en: "Comparing sets is a PRO+ feature",
      es: "Comparar sets es una función PRO+",
    },
    lockedBody: {
      en: "PRO+ puts two sets side by side: both curves on one axis, how harmonic each one runs, and which records you played in both — the question every resident ends up asking.",
      es: "PRO+ pone dos sets lado a lado: las dos curvas en un eje, qué tan armónico corre cada uno, y qué discos tocaste en los dos — la pregunta que todo residente termina haciéndose.",
    },
    lockedCta: { en: "See plans", es: "Ver planes" },
  },

  share: {
    button: { en: "Share the shape", es: "Compartir la forma" },
    copied: { en: "Link copied", es: "Link copiado" },
    hint: {
      en: "A public page with the curve and the score. Your tracklist is not on it.",
      es: "Una página pública con la curva y el puntaje. Tu tracklist no está ahí.",
    },
  },

  publicCurve: {
    eyebrow: { en: "The shape of a set", es: "La forma de un set" },
    scoreLabel: { en: "Set score", es: "Puntaje del set" },
    trackCount: { en: "{count} tracks", es: "{count} tracks" },
    privacyNote: {
      en: "The tracklist stays private — this page only shows the shape.",
      es: "El tracklist queda privado — esta página solo muestra la forma.",
    },
    cta: { en: "Map your own set", es: "Mapeá tu propio set" },
    tagline: {
      en: "EnergyCurve reads the energy curve of a DJ set and tells you where it breaks.",
      es: "EnergyCurve lee la curva de energía de un set y te dice dónde se rompe.",
    },
  },

  versions: {
    title: { en: "Order history", es: "Historial de órdenes" },
    intro: {
      en: "Every time you save a new order, the previous one is kept here. Nothing you try is lost.",
      es: "Cada vez que guardás un orden nuevo, el anterior queda acá. Nada de lo que probás se pierde.",
    },
    emptyBody: {
      en: "Nothing here yet. The first order you save will keep the one it replaced.",
      es: "Todavía no hay nada. El primer orden que guardes va a conservar al que reemplaza.",
    },
    kindImported: { en: "As imported", es: "Como se importó" },
    kindCurated: { en: "Curated", es: "Curado" },
    kindAi: { en: "AI order", es: "Orden de la IA" },
    kindPlayed: { en: "As played", es: "Como se tocó" },
    current: { en: "Current order", es: "Orden actual" },
    best: { en: "Best score", es: "Mejor puntaje" },
    noScore: { en: "not scored", es: "sin puntaje" },
    restore: { en: "Restore", es: "Restaurar" },
    restoring: { en: "Restoring…", es: "Restaurando…" },
    trackCount: { en: "{count} tracks", es: "{count} tracks" },
    lockedTitle: {
      en: "Order history is a PRO feature",
      es: "El historial de órdenes es una función PRO",
    },
    lockedBody: {
      en: "We're already keeping every order you save. PRO lets you look back at them, compare what each one scored, and restore any of them.",
      es: "Ya estamos guardando cada orden que salvás. PRO te deja mirarlos, comparar cuánto puntuó cada uno y restaurar el que quieras.",
    },
    lockedCta: { en: "See plans", es: "Ver planes" },
    markPlayed: { en: "This is what I played", es: "Esto es lo que toqué" },
    markingPlayed: { en: "Saving…", es: "Guardando…" },
    compare: { en: "Compare with now", es: "Comparar con ahora" },
    comparing: { en: "Comparing…", es: "Comparando…" },
    hide: { en: "Hide", es: "Ocultar" },
    diffIdentical: {
      en: "Identical — you played exactly this order.",
      es: "Idéntico — tocaste exactamente este orden.",
    },
    diffMoved: { en: "Moved", es: "Se movieron" },
    diffSkipped: { en: "Never played", es: "No se tocaron" },
    diffAdded: { en: "Played unplanned", es: "Se tocaron sin plan" },
    diffUnchanged: {
      en: "{count} stayed in place",
      es: "{count} se quedaron en su lugar",
    },
    diffScore: { en: "Score", es: "Puntaje" },
    diffScoreUnknown: {
      en: "One of these orders was never scored, so there is nothing to compare.",
      es: "Uno de estos órdenes nunca se puntuó, así que no hay nada que comparar.",
    },
    diffCurveMissing: {
      en: "This version predates per-track energy capture, so only the score can be compared.",
      es: "Esta versión es anterior a que guardáramos la energía por track, así que solo se puede comparar el puntaje.",
    },
    diffMovedBy: { en: "{from} → {to}", es: "{from} → {to}" },
    curveBefore: { en: "then", es: "entonces" },
    curveAfter: { en: "now", es: "ahora" },
  },

  playlistDetail: {
    back: { en: "Playlists", es: "Playlists" },
    analyzeSet: { en: "Analyze set", es: "Analizar set" },
    setSheet: { en: "Set sheet", es: "Hoja de set" },
    gigMode: { en: "Gig Mode", es: "Modo cabina" },
  },

  /**
   * Gig Mode. Written for someone reading a phone at arm's length, in the dark,
   * with a monitor going — so the strings are short and say one thing each.
   */
  gigMode: {
    pageTitle: { en: "Gig Mode", es: "Modo cabina" },
    back: { en: "Leave Gig Mode", es: "Salir del modo cabina" },
    open: { en: "Gig Mode", es: "Modo cabina" },
    nowPlaying: { en: "Playing now", es: "Suena ahora" },
    upNext: { en: "Up next", es: "Sigue" },
    setEnd: { en: "End of set", es: "Fin del set" },
    prev: { en: "Back", es: "Atrás" },
    next: { en: "Next track", es: "Siguiente" },
    restart: { en: "Back to the top", es: "Volver al principio" },
    position: { en: "Track", es: "Track" },
    of: { en: "of", es: "de" },
    due: { en: "Due", es: "Va a las" },
    keepAwake: { en: "Keep screen on", es: "Mantener pantalla encendida" },
    keepAwakeOn: { en: "Screen stays on", es: "Pantalla siempre encendida" },
    keepAwakeUnsupported: {
      en: "This browser won't let a page hold the screen awake.",
      es: "Este navegador no permite que una página mantenga la pantalla encendida.",
    },
    offlineReady: {
      en: "Saved for offline — this set opens without signal.",
      es: "Guardado sin conexión — este set abre sin señal.",
    },
    offlineNow: {
      en: "No connection. Running from the copy saved on this device.",
      es: "Sin conexión. Funcionando con la copia guardada en este dispositivo.",
    },
    resumed: {
      en: "Picked up where you left off.",
      es: "Retomado donde lo dejaste.",
    },
    peak: { en: "Peak", es: "Pico" },
    hint: {
      en: "Tap the big button as each track ends. Your place is saved on this device, so locking the phone or losing signal doesn't lose it.",
      es: "Tocá el botón grande cuando termina cada track. Tu posición se guarda en este dispositivo, así que bloquear el celular o perder señal no la pierde.",
    },
    emptyTitle: { en: "No tracks to play", es: "No hay tracks para tocar" },
    emptyBody: {
      en: "Add tracks to this set and Gig Mode has something to walk you through.",
      es: "Agregá tracks a este set y el modo cabina tiene algo para guiarte.",
    },
    lockedTitle: {
      en: "Gig Mode is a PRO+ feature",
      es: "El modo cabina es una función PRO+",
    },
    lockedBody: {
      en: "The booth view keeps your set, its curve and every transition on one screen that stays awake and works without signal.",
      es: "La vista de cabina mantiene tu set, su curva y cada transición en una pantalla que no se apaga y funciona sin señal.",
    },
    lockedCta: { en: "See plans", es: "Ver planes" },
  },

  setSheet: {
    pageTitle: { en: "Set sheet", es: "Hoja de set" },
    back: { en: "Back to set", es: "Volver al set" },
    print: { en: "Print / Save as PDF", es: "Imprimir / Guardar como PDF" },
    hint: {
      en: "One page for the booth. Print it, or save it as a PDF from the same dialog — it reads the same on paper and on a phone.",
      es: "Una página para la cabina. Imprimila, o guardala como PDF desde el mismo diálogo — se lee igual en papel que en el celular.",
    },
    tracks: { en: "tracks", es: "tracks" },
    time: { en: "Time", es: "Hora" },
    track: { en: "Track", es: "Track" },
    key: { en: "Key", es: "Tono" },
    energy: { en: "Energy", es: "Energía" },
    notes: { en: "Notes", es: "Notas" },
    setNotes: { en: "Set notes", es: "Notas del set" },
    peak: { en: "Peak", es: "Pico" },
    emptyTitle: { en: "Nothing to print yet", es: "Todavía no hay nada que imprimir" },
    emptyBody: {
      en: "Add tracks to this set and the sheet builds itself.",
      es: "Agregá tracks a este set y la hoja se arma sola.",
    },
    lockedTitle: {
      en: "The set sheet is a PRO feature",
      es: "La hoja de set es una función PRO",
    },
    lockedBody: {
      en: "PRO turns any set into a one-page sheet for the booth: the tracklist with BPM and key, the curve, and the clock time each track lands on.",
      es: "PRO convierte cualquier set en una hoja de una página para la cabina: el tracklist con BPM y tono, la curva, y la hora a la que cae cada track.",
    },
    lockedCta: { en: "See plans", es: "Ver planes" },
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
    fieldKey: { en: "Key", es: "Key" },
    fieldGenre: { en: "Genre", es: "Género" },
    fieldComment: { en: "Comment", es: "Comentario" },
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

  importUpload: {
    eyebrow: { en: "Upload your playlist", es: "Cargá tu playlist" },
    title: {
      en: "Drop your set. See its energy.",
      es: "Soltá tu set. Mirá su energía.",
    },
    // Per-method subtitles — the card hosts three entry ways (tabs).
    subtitle: {
      en: "Export from Rekordbox or Traktor and we chart the whole set — BPM, keys, genres and Mixed In Key energies included.",
      es: "Exportá desde Rekordbox o Traktor y graficamos el set completo — BPM, keys, géneros y energías de Mixed In Key incluidos.",
    },
    subtitleAudio: {
      en: "Pick tracks (or a whole folder) from your computer — we read BPM, keys, genres and Mixed In Key energies from the files' tags. Your audio never leaves your machine.",
      es: "Elegí tracks (o una carpeta entera) de tu computadora — leemos BPM, keys, géneros y energías de Mixed In Key de los tags. Tu audio nunca sale de tu máquina.",
    },
    subtitleManual: {
      en: "Name your set, pick genre and context, and optionally paste a tracklist — the analysis engine adapts to both.",
      es: "Nombrá tu set, elegí género y contexto, y si querés pegá un tracklist — el motor de análisis se adapta a los dos.",
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
    tabDjSoftware: { en: "From DJ software", es: "Desde tu software DJ" },
    tabAudioFiles: {
      en: "From your music files",
      es: "Desde tus archivos de audio",
    },
    tabManual: { en: "Manual entry", es: "Carga manual" },
  },

  playlistHeaderEdit: {
    editAria: { en: "Edit name and description", es: "Editar nombre y descripción" },
    nameLabel: { en: "Set name", es: "Nombre del set" },
    descriptionLabel: {
      en: "Description (optional)",
      es: "Descripción (opcional)",
    },
    descriptionPlaceholder: {
      en: "Notes about this set — venue, vibe, what you're going for…",
      es: "Notas sobre este set — el lugar, la vibra, lo que buscás…",
    },
    slotLabel: { en: "Your slot (optional)", es: "Tu horario (opcional)" },
    slotStartLabel: { en: "From", es: "Desde" },
    slotEndLabel: { en: "To", es: "Hasta" },
    slotHint: {
      en: "Venue time, no timezone. Sets that cross midnight are fine — 23:00 to 02:00 reads as three hours.",
      es: "Hora del venue, sin zona horaria. Los sets que cruzan medianoche funcionan igual — 23:00 a 02:00 se leen como tres horas.",
    },
    shapeLabel: { en: "Target curve", es: "Curva objetivo" },
    shapeDerived: {
      en: "Automatic — from genre and set context",
      es: "Automática — según género y contexto del set",
    },
    shapeHint: {
      en: "Pick a shape when the set isn't an ordinary climb. Your analysis is then scored against what you said you're playing.",
      es: "Elegí una forma cuando el set no es una subida común. El análisis se mide contra lo que dijiste que vas a tocar.",
    },
    save: { en: "Save", es: "Guardar" },
    saving: { en: "Saving…", es: "Guardando…" },
    cancel: { en: "Cancel", es: "Cancelar" },
  },

  transitions: {
    title: { en: "The mixes", es: "Las mezclas" },
    subtitle: {
      en: "Every transition, judged on key and on how big the energy step is for this genre.",
      es: "Cada transición, juzgada por tonalidad y por qué tan grande es el salto de energía para este género.",
    },
    allGood: {
      en: "Every mix in this set works. Nothing to flag.",
      es: "Todas las mezclas de este set funcionan. Nada que señalar.",
    },
    rough: { en: "Rough", es: "Áspera" },
    workable: { en: "Workable", es: "Pasable" },
    tierClash: { en: "keys clash", es: "las tonalidades chocan" },
    tierBoost: { en: "energy-boost jump", es: "salto de energía" },
    tierUnknown: { en: "no key on one side", es: "falta la tonalidad de un lado" },
    bigStep: { en: "step of {delta}", es: "salto de {delta}" },
    suggestion: {
      en: "#{position} would fit better here",
      es: "El #{position} encajaría mejor acá",
    },
    lockedTitle: {
      en: "Per-transition advice is a PRO+ feature",
      es: "El detalle por transición es una función PRO+",
    },
    lockedBody: {
      en: "PRO+ judges every mix in the set on its own — the key relationship and whether the energy step is one your genre tolerates — and names a track you already have that would sit better.",
      es: "PRO+ juzga cada mezcla del set por separado — la relación de tonalidades y si el salto de energía es de los que tu género tolera — y te dice qué track que ya tenés encajaría mejor.",
    },
    lockedCta: { en: "See plans", es: "Ver planes" },
  },

  manualCreate: {
    name: { en: "Set name", es: "Nombre del set" },
    namePlaceholder: { en: "Friday warm-up", es: "Warm-up del viernes" },
    pasteTitle: {
      en: "Paste a tracklist (optional)",
      es: "Pegá un tracklist (opcional)",
    },
    pasteHint: {
      en: 'One track per line. Numbering prefixes and a trailing "(128 bpm)" are picked up automatically. Leave it empty to start from scratch and add tracks later.',
      es: 'Un track por línea. Los prefijos numerados y un "(128 bpm)" al final se detectan solos. Dejalo vacío para arrancar de cero y sumar tracks después.',
    },
    createCta: { en: "Create playlist", es: "Crear playlist" },
    createWithTracksCta: {
      en: "Create playlist · {count} tracks",
      es: "Crear playlist · {count} tracks",
    },
    creating: { en: "Creating…", es: "Creando…" },
  },

  curveTemplates: {
    saveButton: { en: "Save this shape", es: "Guardar esta forma" },
    saving: { en: "Saving…", es: "Guardando…" },
    namePlaceholder: { en: "Name this shape", es: "Nombrá esta forma" },
    save: { en: "Save", es: "Guardar" },
    cancel: { en: "Cancel", es: "Cancelar" },
    saved: { en: "Saved", es: "Guardada" },
    hint: {
      en: "Turns this set's curve into a target you can aim other sets at.",
      es: "Convierte la curva de este set en un objetivo al que apuntar otros sets.",
    },
    yours: { en: "Your shapes", es: "Tus formas" },
    builtIn: { en: "Built-in", es: "Predefinidas" },
    lockedHint: {
      en: "Saving your own shapes is a PRO+ feature.",
      es: "Guardar tus propias formas es una función PRO+.",
    },
  },

  audioImport: {
    analyzeTitle: {
      en: "Read the real BPM from the audio",
      es: "Leer el BPM real del audio",
    },
    analyzeBody: {
      en: "{count} of these tracks carry no BPM tag, so their energy is being guessed from position alone. Analysing the audio measures it. Takes a couple of seconds per track and happens on your machine — nothing is uploaded.",
      es: "{count} de estos tracks no traen BPM en los tags, así que su energía se está adivinando solo por la posición. Analizar el audio la mide. Tarda un par de segundos por track y pasa en tu máquina — no se sube nada.",
    },
    analyzeCta: { en: "Analyse {count} tracks", es: "Analizar {count} tracks" },
    analyzeProgress: { en: "{done} of {total}", es: "{done} de {total}" },
    analyzeCancel: { en: "Stop", es: "Frenar" },
    analyzeDone: {
      en: "{ok} of {total} now have a measured BPM.",
      es: "{ok} de {total} ya tienen BPM medido.",
    },
    analyzeFailed: {
      en: "{count} had no detectable beat — ambient or beatless material.",
      es: "{count} no tenían pulso detectable — material ambient o sin beat.",
    },
    analyzeLockedBody: {
      en: "PRO reads the real BPM out of files that carry no tags — the wav, flac and aiff that today get their energy guessed from position alone.",
      es: "PRO lee el BPM real de los archivos que no traen tags — los wav, flac y aiff a los que hoy se les adivina la energía solo por la posición.",
    },
    analyzeLockedCta: { en: "See plans", es: "Ver planes" },
    dropzoneMain: {
      en: "Drag your tracks here, or",
      es: "Arrastrá tus tracks acá, o",
    },
    browse: { en: "choose files", es: "elegí los archivos" },
    chooseFolder: { en: "Choose a folder", es: "Elegir una carpeta" },
    dropzoneHint: {
      en: "MP3, M4A, FLAC, WAV… — we read the tags, your audio never leaves your computer",
      es: "MP3, M4A, FLAC, WAV… — leemos los tags, tu audio nunca sale de tu computadora",
    },
    readingProgress: {
      en: "Reading tags… {done}/{total}",
      es: "Leyendo tags… {done}/{total}",
    },
    filteredNote: {
      en: "Kept {kept} of {total} files (audio only)",
      es: "Quedaron {kept} de {total} archivos (solo audio)",
    },
    truncatedNote: {
      en: "Keeping the first {max} files",
      es: "Tomamos los primeros {max} archivos",
    },
    unreadableNote: {
      en: "{count} file(s) couldn't be read — using their filenames",
      es: "{count} archivo(s) no se pudieron leer — usamos sus nombres",
    },
    zeroReadable: {
      en: "No audio files found in that selection.",
      es: "No encontramos archivos de audio en esa selección.",
    },
    missingTagsNote: {
      en: "{noBpm} of {total} tracks missing BPM · {noKey} missing key — analysis quality depends on your tags",
      es: "{noBpm} de {total} tracks sin BPM · {noKey} sin key — la calidad del análisis depende de tus tags",
    },
    fromFilename: { en: "from filename", es: "del nombre de archivo" },
    excludeAria: {
      en: "Include {name} in the import",
      es: "Incluir {name} en el import",
    },
    nameLabel: { en: "Set name", es: "Nombre del set" },
    namePlaceholder: {
      en: "Friday warm-up",
      es: "Warm-up del viernes",
    },
    clearSelection: { en: "Start over", es: "Empezar de nuevo" },
    createCta: {
      en: "Create set with {count} tracks",
      es: "Crear set con {count} tracks",
    },
    creating: { en: "Creating…", es: "Creando…" },
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
    recommendedTag: { en: "recommended", es: "recomendado" },
    /** Shown when the playlist came from local audio files. */
    filesWarningTitle: {
      en: "Rekordbox and Traktor won't find these tracks",
      es: "Rekordbox y Traktor no van a encontrar estos tracks",
    },
    filesWarningBody: {
      en: "This playlist came from files on your computer, so we only know their names — not where they live. Those two formats will open with every track missing. Use M3U8 and save it in the same folder as your music.",
      es: "Esta playlist salió de archivos de tu computadora, así que sólo conocemos sus nombres — no dónde están. Esos dos formatos van a abrir con todos los tracks en missing. Usá M3U8 y guardalo en la misma carpeta que tu música.",
    },
    /** Hover/aria label on the affected rows; the block above explains why. */
    willBeMissing: {
      en: "Tracks will show as missing in this format",
      es: "Los tracks van a aparecer como missing en este formato",
    },
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
    playlistLimit: {
      en: "You've reached {max} playlists on your plan. Delete one, or upgrade for unlimited.",
      es: "Llegaste a {max} playlists en tu plan. Borrá una, o pasá a ilimitadas.",
    },
    genericError: {
      en: "Something went wrong while saving. Please try again.",
      es: "Algo salió mal al guardar. Probá de nuevo.",
    },
    versionStale: {
      en: "This version is from before you added a track, so restoring it would leave that track out. Reorder by hand instead.",
      es: "Esta versión es de antes de que agregaras un track, así que restaurarla lo dejaría afuera. Reordená a mano.",
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
    detailsSaved: { en: "Playlist updated.", es: "Playlist actualizada." },
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
  /**
   * Plan state, shown on the dashboard. Every string here answers one question a
   * paying customer asks: what am I on, until when, and what do I do about it.
   */
  billing: {
    sectionLabel: { en: "Your plan", es: "Tu plan" },
    planName: {
      free: { en: "FREE", es: "FREE" },
      pro: { en: "PRO", es: "PRO" },
      pro_plus: { en: "PRO+", es: "PRO+" },
    },

    free: {
      title: { en: "You're on FREE", es: "Estás en FREE" },
      body: {
        en: "3 playlists, 3 fixes a month, and one AI ordering. Native export is included — and always will be.",
        es: "3 playlists, 3 arreglos por mes y un ordenamiento con IA. El export nativo está incluido, y va a seguir estándolo.",
      },
    },
    active: {
      title: { en: "{plan} is active", es: "{plan} está activo" },
      body: { en: "Renews on {date}.", es: "Se renueva el {date}." },
    },
    ending: {
      title: { en: "{plan} ends on {date}", es: "{plan} termina el {date}" },
      body: {
        en: "You keep everything until then, and you can reactivate any time before that date.",
        es: "Conservás todo hasta esa fecha, y podés reactivarlo en cualquier momento antes.",
      },
    },
    pastDue: {
      title: { en: "Your payment didn't go through", es: "Tu pago no se procesó" },
      body: {
        en: "{plan} still works for now. Update your card so you don't lose it.",
        es: "{plan} sigue funcionando por ahora. Actualizá tu tarjeta para no perderlo.",
      },
    },
    ended: {
      title: {
        en: "Your {plan} subscription ended",
        es: "Tu suscripción {plan} terminó",
      },
      body: {
        en: "You're back on the free limits. Everything you made is still here.",
        es: "Volviste a los límites del plan gratuito. Todo lo que hiciste sigue acá.",
      },
    },
    incomplete: {
      title: { en: "Your checkout wasn't finished", es: "No se completó tu pago" },
      body: {
        en: "Nothing was charged. You can start again whenever you want.",
        es: "No se te cobró nada. Podés empezar de nuevo cuando quieras.",
      },
    },

    seePlans: { en: "See plans", es: "Ver planes" },
    manage: { en: "Manage subscription", es: "Gestionar suscripción" },
    managing: { en: "Opening…", es: "Abriendo…" },
    manageError: {
      en: "Couldn't open the billing portal. Try again in a moment.",
      es: "No se pudo abrir el portal de facturación. Probá de nuevo en un momento.",
    },

    checkoutSuccess: {
      title: { en: "You're in — welcome to {plan}", es: "Listo — bienvenido a {plan}" },
      // Names the billing entity at the exact moment the charge appears, which is
      // when an unrecognised name on a statement turns into a dispute.
      body: {
        en: "Your payment went through. Receipts come from StageLink LLC, the company that operates EnergyCurve.",
        es: "Tu pago se procesó. Los comprobantes llegan de StageLink LLC, la empresa que opera EnergyCurve.",
      },
      dismiss: { en: "Dismiss", es: "Cerrar" },
    },
  },
  library: {
    title: { en: "Your library", es: "Tu librería" },
    subtitle: {
      en: "Every record across your sets, collapsed into one list.",
      es: "Todos tus discos cruzando tus sets, en una sola lista.",
    },
    records: { en: "records", es: "discos" },
    repeated: { en: "in more than one set", es: "en más de un set" },
    neverPlayed: { en: "never marked played", es: "nunca marcados como tocados" },
    filterAll: { en: "All", es: "Todos" },
    filterRepeated: { en: "Repeated", es: "Repetidos" },
    filterNeverPlayed: { en: "Never played", es: "Nunca tocados" },
    inSets: { en: "in {count} sets", es: "en {count} sets" },
    inOneSet: { en: "in 1 set", es: "en 1 set" },
    neverPlayedCaveat: {
      en: "\"Never played\" only counts sets you marked as played — it doesn't know about nights you didn't record.",
      es: "\"Nunca tocados\" cuenta solo los sets que marcaste como tocados — no sabe de las noches que no registraste.",
    },
    empty: {
      en: "Import a set and your library builds itself.",
      es: "Importá un set y tu librería se arma sola.",
    },
    emptyFiltered: {
      en: "Nothing matches this filter.",
      es: "Nada coincide con este filtro.",
    },
    lockedTitle: {
      en: "Your library is a PRO+ feature",
      es: "Tu librería es una función PRO+",
    },
    lockedBody: {
      en: "PRO+ collapses every set you own into one list: what you lean on, what repeats across nights, and what you've never once played.",
      es: "PRO+ junta todos tus sets en una sola lista: en qué te apoyás, qué se repite entre noches, y qué nunca tocaste ni una vez.",
    },
    lockedCta: { en: "See plans", es: "Ver planes" },
  },
} as const
