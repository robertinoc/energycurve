import type { SiteLocale } from "@/lib/content/site-copy"
import type { IssueType } from "@/types/analysis"

type LocalizedLabel = Record<SiteLocale, string>

interface IssueCopy {
  title: LocalizedLabel
  body: LocalizedLabel
  recommendation: LocalizedLabel
}

/**
 * Replaces `{slot}` placeholders in a template with the provided values.
 * Missing params are left untouched so mistakes stay visible in tests.
 */
export function formatTemplate(
  template: string,
  params: Record<string, string | number> = {}
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match
  )
}

export const ISSUE_COPY: Record<IssueType, IssueCopy> = {
  abrupt_drop: {
    title: {
      en: "Abrupt energy drop",
      es: "Caída brusca de energía",
    },
    body: {
      en: "Energy falls {delta} points between tracks {from} and {to}. Sudden drops like this can empty a dancefloor.",
      es: "La energía cae {delta} puntos entre los tracks {from} y {to}. Una caída así puede vaciar la pista.",
    },
    recommendation: {
      en: "Add a transition track between positions {from} and {to}, or move one of them so the descent happens in smaller steps.",
      es: "Sumá un track de transición entre las posiciones {from} y {to}, o mové uno de los dos para que la bajada sea más gradual.",
    },
  },
  abrupt_spike: {
    title: {
      en: "Abrupt energy spike",
      es: "Pico brusco de energía",
    },
    body: {
      en: "Energy jumps {delta} points between tracks {from} and {to}. For this genre a smoother build works better.",
      es: "La energía salta {delta} puntos entre los tracks {from} y {to}. Para este género funciona mejor una subida progresiva.",
    },
    recommendation: {
      en: "Bridge the jump with a mid-energy track so the build between positions {from} and {to} feels earned.",
      es: "Puenteá el salto con un track de energía intermedia para que la subida entre las posiciones {from} y {to} se sienta natural.",
    },
  },
  flat_zone: {
    title: {
      en: "Flat zone",
      es: "Zona plana",
    },
    body: {
      en: "{count} consecutive tracks sit at the same energy (positions {positions}). The set loses momentum here.",
      es: "{count} tracks consecutivos quedan en la misma energía (posiciones {positions}). El set pierde impulso acá.",
    },
    recommendation: {
      en: "Swap one of the tracks in positions {positions} for something slightly higher or lower to reintroduce movement.",
      es: "Cambiá uno de los tracks de las posiciones {positions} por algo un poco más arriba o más abajo para recuperar movimiento.",
    },
  },
  early_peak: {
    title: {
      en: "Early peak",
      es: "Pico temprano",
    },
    body: {
      en: "The set hits its maximum energy at track {position}, inside the first third. That leaves nowhere to go.",
      es: "El set alcanza su energía máxima en el track {position}, dentro del primer tercio. Después no queda a dónde ir.",
    },
    recommendation: {
      en: "Move the peak track later in the set and rebuild the opening with lower-energy selections.",
      es: "Mové el track pico más adelante en el set y rearmá la apertura con selecciones de menor energía.",
    },
  },
  weak_ending: {
    title: {
      en: "Weak ending",
      es: "Final débil",
    },
    body: {
      en: "The final track lands at energy {score}, below the {threshold} expected for this context. Sets are remembered by how they close.",
      es: "El último track queda en energía {score}, debajo del {threshold} esperado para este contexto. Los sets se recuerdan por cómo cierran.",
    },
    recommendation: {
      en: "Close with one of your higher-energy tracks, or re-order so the last stretch climbs instead of fading.",
      es: "Cerrá con uno de tus tracks de mayor energía, o reordená para que el tramo final suba en vez de apagarse.",
    },
  },
  context_range: {
    title: {
      en: "Outside the context range",
      es: "Fuera del rango del contexto",
    },
    body: {
      en: "Track {position} sits at energy {score}, outside the {min}–{max} range expected for a {context} set.",
      es: "El track {position} queda en energía {score}, fuera del rango {min}–{max} esperado para un set de {context}.",
    },
    recommendation: {
      en: "Replace track {position} with something inside the {min}–{max} range, or reconsider the set's context.",
      es: "Reemplazá el track {position} por algo dentro del rango {min}–{max}, o reconsiderá el contexto del set.",
    },
  },
  context_high_peak: {
    title: {
      en: "High peak in a warm-up context",
      es: "Pico alto en contexto de warm-up",
    },
    body: {
      en: "Track {position} peaks at energy {score}. An opening set should hold the room, not burn it early.",
      es: "El track {position} llega a energía {score}. Un opening debe sostener la sala, no quemarla antes de tiempo.",
    },
    recommendation: {
      en: "Save track {position} for a main-time slot and keep the opening below high-peak territory.",
      es: "Guardá el track {position} para un main time y mantené la apertura debajo de la zona de picos altos.",
    },
  },
  no_progression: {
    title: {
      en: "No overall progression",
      es: "Sin progresión general",
    },
    body: {
      en: "The last third of the set is not higher in energy than the first third — the journey stays flat overall.",
      es: "El último tercio del set no supera en energía al primero — el viaje queda plano en conjunto.",
    },
    recommendation: {
      en: "Re-order so energy trends upward across the set, saving stronger tracks for the back half.",
      es: "Reordená para que la energía tienda a subir a lo largo del set, guardando los tracks más fuertes para la segunda mitad.",
    },
  },
  too_many_rests: {
    title: {
      en: "Too many rests",
      es: "Demasiados descansos",
    },
    body: {
      en: "The set steps down noticeably {count} times (after positions {positions}). Each rest costs momentum.",
      es: "El set baja notoriamente {count} veces (después de las posiciones {positions}). Cada descanso cuesta impulso.",
    },
    recommendation: {
      en: "Keep one deliberate breather and smooth out the others so the floor never fully cools down.",
      es: "Dejá un solo respiro intencional y suavizá los demás para que la pista nunca se enfríe del todo.",
    },
  },
  set_too_short: {
    title: {
      en: "Short set",
      es: "Set corto",
    },
    body: {
      en: "At {trackCount} tracks (~{duration} min) the set runs shorter than a typical {minDuration}-minute club slot.",
      es: "Con {trackCount} tracks (~{duration} min) el set queda más corto que un slot típico de {minDuration} minutos.",
    },
    recommendation: {
      en: "Add tracks until you comfortably cover your slot — with room to read the floor and adjust live.",
      es: "Sumá tracks hasta cubrir tu slot con comodidad — con margen para leer la pista y ajustar en vivo.",
    },
  },
  set_too_long: {
    title: {
      en: "Long set",
      es: "Set largo",
    },
    body: {
      en: "At {trackCount} tracks (~{duration} min) the set runs past the ~{maxDuration}-minute mark most slots allow.",
      es: "Con {trackCount} tracks (~{duration} min) el set supera los ~{maxDuration} minutos que permiten la mayoría de los slots.",
    },
    recommendation: {
      en: "Trim the mid-section first — keep the opening ramp and the closing stretch intact.",
      es: "Recortá primero el tramo medio — mantené intactos la rampa de apertura y el cierre.",
    },
  },
  no_climax: {
    title: {
      en: "No climax",
      es: "Sin clímax",
    },
    body: {
      en: "The set never gets close to the peak energy (~{max}) expected for a {context} set — the highest point stays too low to release the tension it builds.",
      es: "El set nunca se acerca a la energía pico (~{max}) esperada para un set de {context} — el punto más alto queda demasiado bajo para descargar la tensión que acumula.",
    },
    recommendation: {
      en: "Add one or two higher-energy tracks around the last third so the set has a real peak to build toward.",
      es: "Sumá uno o dos tracks de mayor energía cerca del último tercio para que el set tenga un pico real hacia el cual construir.",
    },
  },
  good_breather: {
    title: {
      en: "Well-placed breather",
      es: "Respiro bien ubicado",
    },
    body: {
      en: "The step down after track {from} lands right after a sustained peak — a controlled release like this resets the floor without losing it.",
      es: "La bajada después del track {from} llega justo después de un pico sostenido — una descarga controlada así renueva la pista sin perderla.",
    },
    recommendation: {
      en: "Keep it: tension and release is what makes a peak feel earned.",
      es: "Mantenelo: la tensión y descarga es lo que hace que un pico se sienta merecido.",
    },
  },
  low_energy_confidence: {
    title: {
      en: "Limited energy data",
      es: "Datos de energía limitados",
    },
    body: {
      en: "These energies came from BPM alone, and your BPMs are very close together — from that data the engine can't tell how each track really moves the floor, so fine-grained checks (flat zones, missing climax) were skipped instead of guessed.",
      es: "Estas energías salieron solo del BPM, y tus BPMs son muy parecidos entre sí — con esos datos el motor no puede saber cómo mueve la pista cada track, así que las evaluaciones finas (zonas planas, clímax) se omitieron en vez de adivinarse.",
    },
    recommendation: {
      en: "Set each track's energy manually, or re-export with Mixed In Key energies in the comment field (\"Energy 7\") to unlock the real curve.",
      es: "Cargá la energía de cada track a mano, o re-exportá con las energías de Mixed In Key en el campo comentario (\"Energy 7\") para desbloquear la curva real.",
    },
  },
}

export const REORDER_RATIONALE: LocalizedLabel = {
  en: "Suggested order rearranges the same tracks to follow the ideal {context} curve: smoother transitions, a better-placed peak, and a stronger landing.",
  es: "El orden sugerido reacomoda los mismos tracks para seguir la curva ideal de {context}: transiciones más suaves, un pico mejor ubicado y un cierre más fuerte.",
}

export const REORDER_RATIONALE_HARMONIC: LocalizedLabel = {
  en: "Suggested order follows the ideal {context} curve while keeping {harmonic} of {known} transitions compatible on the Camelot wheel — smoother blends, key to key.",
  es: "El orden sugerido sigue la curva ideal de {context} manteniendo {harmonic} de {known} transiciones compatibles en la rueda de Camelot — mezclas más suaves, key a key.",
}

export const SEVERITY_LABELS: Record<
  "penalty" | "info" | "positive",
  LocalizedLabel
> = {
  penalty: { en: "Costs points", es: "Resta puntos" },
  info: { en: "Heads-up", es: "Atención" },
  positive: { en: "Working for you", es: "Suma a tu favor" },
}

/** Labels for the three V2 sub-scores shown in the score card breakdown. */
export const SUBSCORE_LABELS: Record<
  "shape" | "dynamics" | "ending",
  LocalizedLabel
> = {
  shape: { en: "Curve shape", es: "Forma de la curva" },
  dynamics: { en: "Energy dynamics", es: "Dinámica de energía" },
  ending: { en: "Ending", es: "Cierre" },
}

export const CONTEXT_DISPLAY_NAMES: Record<string, LocalizedLabel> = {
  opening: { en: "opening", es: "opening" },
  main: { en: "main time", es: "main time" },
  closing: { en: "closing", es: "closing" },
}

/**
 * Capitalized, standalone context labels (badges, "Best fit" line). DJ jargon
 * (opening / main time / closing) stays untranslated in ES on purpose, matching
 * CONTEXT_DISPLAY_NAMES — that's how the audience actually says it.
 */
export const CONTEXT_LABELS: Record<string, LocalizedLabel> = {
  opening: { en: "Opening", es: "Opening" },
  main: { en: "Main time", es: "Main time" },
  closing: { en: "Closing", es: "Closing" },
}

/**
 * Render-layer chrome for the analysis screen — page headings, chart labels,
 * card labels and empty states. The scoring engine (recommendations.ts) is
 * already localized; this covers the React/page strings that weren't. Slots
 * (`{min}`, `{score}`, …) are filled with formatTemplate at the call site.
 */
export const ANALYSIS_UI: Record<string, LocalizedLabel> = {
  // Page chrome
  metaTitle: { en: "Set analysis", es: "Análisis del set" },
  heading: { en: "Set analysis", es: "Análisis del set" },
  subtitle: {
    en: "Every number below is traceable: the energy of each track, the rules it breaks, and exactly what each one costs.",
    es: "Cada número de acá abajo es rastreable: la energía de cada track, las reglas que rompe y exactamente cuánto cuesta cada una.",
  },
  curveEyebrow: { en: "Energy curve", es: "Curva de energía" },
  curveTitle: {
    en: "How the set actually flows",
    es: "Cómo fluye realmente el set",
  },
  curveSubtitle: {
    en: "Hover the curve to inspect each track. The dashed line is the ideal curve for this context and genre — the score measures how closely your set follows it.",
    es: "Pasá el cursor por la curva para inspeccionar cada track. La línea punteada es la curva ideal para este contexto y género — el score mide qué tan de cerca la sigue tu set.",
  },
  issuesEyebrow: {
    en: "Recommendations",
    es: "Recomendaciones",
  },
  issuesTitle: { en: "What to fix, and how", es: "Qué corregir, y cómo" },
  reorderEyebrow: { en: "Suggested order", es: "Orden sugerido" },
  reorderTitle: {
    en: "A stronger version of the same set",
    es: "Una versión más fuerte del mismo set",
  },
  // Shown instead of the comparison when the engine finds no worthwhile
  // improvement — the section is always visible (V3 feedback).
  reorderOptimal: {
    en: "Your order already follows the ideal curve for this context — nothing worth reordering.",
    es: "Tu orden ya sigue la curva ideal para este contexto — no hay nada que valga la pena reordenar.",
  },
  suggestedNameSuffix: {
    en: "suggested order",
    es: "orden sugerido",
  },
  reorderManually: {
    en: "Reorder by hand in the playlist",
    es: "Reordenar a mano en la playlist",
  },
  notAnalyzableTooShort: {
    en: "This playlist needs at least {min} tracks before the flow can be analyzed. Add tracks or paste a full tracklist first.",
    es: "Esta playlist necesita al menos {min} tracks para poder analizar el flujo. Sumá tracks o pegá una tracklist completa primero.",
  },
  notAnalyzableNoGenre: {
    en: "This playlist has no genre or context set, so the engine has nothing to score against. Recreate it with both fields set.",
    es: "Esta playlist no tiene género ni contexto, así que el motor no tiene contra qué puntuar. Recreala con ambos campos definidos.",
  },

  // Energy curve chart
  chartAria: {
    en: "Energy curve of this playlist",
    es: "Curva de energía de esta playlist",
  },
  idealCurve: { en: "Ideal curve", es: "Curva ideal" },
  peak: { en: "Peak", es: "Pico" },
  track: { en: "Track", es: "Track" },
  energy: { en: "Energy", es: "Energía" },
  noBpm: { en: "no BPM", es: "sin BPM" },
  // Set phases (x-axis) — DJ jargon, kept in English in both locales.
  phaseOpening: { en: "Opening", es: "Opening" },
  phaseBuildup: { en: "Build-up", es: "Build-up" },
  phasePeak: { en: "Peak time", es: "Peak time" },
  phaseClosing: { en: "Closing", es: "Closing" },
  // Energy source labels
  sourceManual: { en: "manual", es: "manual" },
  sourceBpm: { en: "from BPM", es: "desde BPM" },
  sourceBpmLoudness: { en: "from BPM + loudness", es: "desde BPM + volumen" },
  sourceEstimated: { en: "estimated", es: "estimado" },

  // Order comparison
  currentOrder: { en: "Current order", es: "Orden actual" },
  suggestedOrder: { en: "Suggested order", es: "Orden sugerido" },

  // Issue list
  noIssues: {
    en: "No issues detected — the flow, context, and genre expectations all line up.",
    es: "No se detectaron problemas — el flujo, el contexto y las expectativas del género están alineados.",
  },
  points: { en: "pts", es: "pts" },
  trackSingular: { en: "Track", es: "Track" },
  trackPlural: { en: "Tracks", es: "Tracks" },

  // Set score card
  outOf10: { en: "Out of 10", es: "Sobre 10" },
  setScore: { en: "Set score", es: "Score del set" },
  scoreAria: {
    en: "Set score {score} out of 10",
    es: "Score del set {score} sobre 10",
  },
  clampedToMin: { en: "Clamped to minimum", es: "Ajustado al mínimo" },
  estimatedDuration: {
    en: "Estimated duration: ~{minutes} min",
    es: "Duración estimada: ~{minutes} min",
  },
  bestFit: { en: "Best fit:", es: "Mejor encaje:" },
  bestFitMatches: {
    en: "— matches this playlist's context.",
    es: "— coincide con el contexto de esta playlist.",
  },
  betterAsPrefix: {
    en: "This curve scores higher as",
    es: "Esta curva puntúa más alto como",
  },
  betterAsDetail: {
    en: "({score}/10 vs {setScore}/10 as {context}).",
    es: "({score}/10 vs {setScore}/10 como {context}).",
  },

  // Score header (redesign zone 1)
  scoreNow: { en: "Score now", es: "Score ahora" },
  canReach: { en: "You can reach", es: "Podés llegar a" },
  applyAllNote: {
    en: "if you apply the {count} fixes",
    es: "si aplicás los {count} arreglos",
  },
  applyRemainingNote: {
    en: "if you apply the {count} remaining",
    es: "si aplicás los {count} que faltan",
  },
  claudeOrderNote: {
    en: "Order generated with Claude",
    es: "Orden generado con Claude",
  },
  decidedCounter: {
    en: "{done} of {total} decided",
    es: "{done} de {total} decididos",
  },

  // Misc
  language: { en: "Language", es: "Idioma" },
}
