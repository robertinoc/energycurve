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
  /**
   * The declared-slot pair. Fires instead of set_too_short / set_too_long, which
   * compare against a generic 45–150 minute guideline: once the DJ has told us the
   * slot they actually play, comparing against a typical one is a worse answer.
   */
  set_short_for_slot: {
    title: {
      en: "Not enough music for your slot",
      es: "No alcanza la música para tu slot",
    },
    body: {
      en: "{trackCount} tracks add up to about {duration} min of music, and your slot runs {slotMinutes} min — roughly {gap} short.",
      es: "{trackCount} tracks suman unos {duration} min de música, y tu slot dura {slotMinutes} min — te faltan unos {gap}.",
    },
    recommendation: {
      en: "Bring more than you need. Stretching what you have with long mixes and loops works, but it decides the set for you before you can read the floor.",
      es: "Llevá más de lo que necesitás. Estirar lo que tenés con mezclas largas y loops funciona, pero te decide el set antes de poder leer la pista.",
    },
  },
  set_over_slot: {
    title: {
      en: "More music than slot",
      es: "Más música que slot",
    },
    body: {
      en: "{trackCount} tracks add up to about {duration} min of music for a {slotMinutes} min slot — about {gap} more than you can play.",
      es: "{trackCount} tracks suman unos {duration} min de música para un slot de {slotMinutes} min — unos {gap} más de lo que vas a poder tocar.",
    },
    recommendation: {
      en: "Not a problem in itself — spare tracks are how you react to a room. Just know which ones you'd drop, because deciding at 02:40 means dropping the ending you planned.",
      es: "No es un problema en sí — los tracks de sobra son con lo que reaccionás a una sala. Pero tené decidido cuáles sacarías, porque decidirlo a las 02:40 significa perder el cierre que planeaste.",
    },
  },
  peak_too_early_for_slot: {
    title: {
      en: "Peak lands early for your slot",
      es: "El pico cae temprano para tu franja",
    },
    body: {
      // The numbers are what make this land: "early" is arguable, "01:24 with
      // 1h36 still to play" is not.
      en: "Your highest-energy track lands around {peakClock}, with {remaining} of your slot still to play.",
      es: "Tu track de mayor energía cae alrededor de las {peakClock}, y todavía te queda {remaining} de franja por tocar.",
    },
    recommendation: {
      en: "Hold the peak back, or accept it and plan a second build — the risk is a long stretch after the high point.",
      es: "Guardate el pico para más adelante, o aceptalo y planificá una segunda subida — el riesgo es un tramo largo después del punto alto.",
    },
  },
  peak_too_late_for_slot: {
    title: {
      en: "Peak lands with no room to land the set",
      es: "El pico cae sin margen para cerrar",
    },
    body: {
      en: "Your highest-energy track lands around {peakClock}, leaving only {remaining} before your slot ends.",
      es: "Tu track de mayor energía cae alrededor de las {peakClock}, y sólo quedan {remaining} antes de que termine tu franja.",
    },
    recommendation: {
      en: "Move the peak earlier so the closing stretch has somewhere to go.",
      es: "Adelantá el pico para que el cierre tenga a dónde ir.",
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
  energy_data_missing: {
    title: {
      en: "Part of this curve is our guess, not your music",
      es: "Parte de esta curva es nuestra estimación, no tu música",
    },
    body: {
      en: "{inventedCount} of {trackCount} tracks have no energy tag, no BPM and no audio analysis. For those we drew a value from where the track sits in the set — so the score partly grades a curve we generated, not your ordering.",
      es: "{inventedCount} de {trackCount} tracks no tienen etiqueta de energía, ni BPM, ni análisis de audio. Para esos dibujamos un valor según dónde cae el track en el set — así que el score califica en parte una curva que generamos nosotros, no tu orden.",
    },
    recommendation: {
      en: "Run the audio analysis, or import a version of the playlist that carries BPMs. Until then read the score as a sanity check on the shape you asked for, not as a verdict on your set.",
      es: "Corré el análisis de audio, o importá una versión de la playlist que traiga BPMs. Hasta entonces leé el score como un chequeo de la forma que pediste, no como un veredicto sobre tu set.",
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
// `satisfies` instead of a `Record<string, …>` annotation ON PURPOSE: the
// annotation made EVERY key name type-check, so deleting one still compiled
// and only blew up at runtime as `undefined[locale]`. That is exactly how
// `language` was dropped and took the dashboard down (it is read by the
// locale toggle, which renders inside the dashboard layout). With
// `satisfies` the literal key set is preserved, so a missing key is a
// compile error while the value shape is still checked.
export const ANALYSIS_UI = {
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
  // "from the audio", not "from AI" or "measured": it says where the number came
  // from without implying more certainty than a measurement carries.
  sourceAudio: { en: "from the audio", es: "desde el audio" },
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

  // Fix map + panel (redesign zone 2)
  fixCounter: { en: "Fix {index} of {total}", es: "Arreglo {index} de {total}" },
  prevFixAria: { en: "Previous fix", es: "Arreglo anterior" },
  nextFixAria: { en: "Next fix", es: "Arreglo siguiente" },
  recoverable: { en: "recoverable score", es: "de score recuperables" },
  theFixLabel: { en: "The fix", es: "El arreglo" },
  beforeLabel: { en: "Before", es: "Antes" },
  afterLabel: { en: "After", es: "Después" },
  applyCta: { en: "Apply this fix", es: "Aplicar este arreglo" },
  appliedCta: { en: "Applied — undo", es: "Aplicado — deshacer" },
  discardCta: { en: "It's fine — leave it", es: "Así está bien, dejalo" },
  discardedCta: {
    en: "Discarded — reconsider",
    es: "Descartado — reconsiderar",
  },
  positiveNothing: {
    en: "This is already working — nothing to touch.",
    es: "Esto ya está funcionando — nada que tocar.",
  },
  noFixesCoach: {
    en: "The set already follows the curve. Nothing to correct.",
    es: "El set ya sigue la curva. Nada que corregir.",
  },

  // Live tracklist (redesign zone 3)
  liveOrderEyebrow: { en: "Live tracklist", es: "Tracklist en vivo" },
  liveOrderTitle: {
    en: "Your set, as it stands now",
    es: "Tu set, como queda ahora",
  },
  movedSubtitle: {
    en: "{moved} of {total} tracks moved",
    es: "{moved} tracks movidos de {total}",
  },
  unmovedSubtitle: {
    en: "Original order, no changes",
    es: "Orden original, sin cambios",
  },
  fromChip: { en: "from {n}", es: "de {n}" },
  backToOriginal: { en: "Back to original", es: "Volver al original" },
  saveOrderCta: {
    en: "Write this order to the playlist",
    es: "Escribir este orden en la playlist",
  },
  savingOrder: { en: "Writing…", es: "Escribiendo…" },
  savedOrderNote: {
    en: "Order written to the playlist.",
    es: "Orden escrito en la playlist.",
  },
  revertSavedCta: {
    en: "Revert to the previous order",
    es: "Revertir al orden anterior",
  },
  saveOrderError: {
    en: "The order couldn't be written. Try again.",
    es: "No se pudo escribir el orden. Probá de nuevo.",
  },

  // Smart ordering (redesign zone 4)
  smartOrderCta: { en: "Smart ordering", es: "Ordenación inteligente" },
  smartOrderThinking: { en: "Thinking the order…", es: "Pensando el orden…" },
  smartOrderDone: { en: "Reordered with Claude", es: "Reordenado con Claude" },
  smartThinkingBanner: {
    en: "Claude is testing orders against the ideal {context} curve and the Camelot wheel…",
    es: "Claude está probando órdenes contra la curva ideal de {context} y la rueda de Camelot…",
  },
  /**
   * Shown once the model starts committing track ids, which is the only part
   * of the wait we can actually measure. Deliberately not a rotation of
   * invented steps: everything before this point takes milliseconds, so
   * "reading metadata…" would be describing work that finished long ago.
   */
  smartPlacingBanner: {
    en: "Placing tracks: {placed} of {total}",
    es: "Ubicando temas: {placed} de {total}",
  },
  smartDoneBanner: {
    en: "New order ready: score goes from {from} to {to}. The shape now follows the {context} curve — and you can keep editing by hand.",
    es: "Orden nuevo listo: el score pasa de {from} a {to}. La forma ahora sigue la curva de {context} — y podés seguir editando a mano.",
  },
  smartDoneBannerFlat: {
    en: "New order ready. The shape now follows the {context} curve — and you can keep editing by hand.",
    es: "Orden nuevo listo. La forma ahora sigue la curva de {context} — y podés seguir editando a mano.",
  },
  smartFallbackBanner: {
    en: "Claude didn't answer in time, so the automatic order was used: ascending energy with two deliberate breathers. You can keep editing by hand.",
    es: "Claude no respondió a tiempo, así que se usó el orden automático: energía ascendente con dos respiros intencionales. Podés seguir editando a mano.",
  },
  /**
   * Sits against the score itself, not in the issue list. An `info` issue below a
   * 46-pixel "9.2" is information the reader never reaches, and the whole point of
   * this caveat is that the number above it means less than it looks like.
   */
  /**
   * Reemplaza los dos números cuando la curva es mayormente inventada. Es la
   * misma información que antes iba de aviso al lado del 9,2 — sólo que ahora
   * ocupa el lugar del número, porque un titular y su desmentida no pesan igual.
   */
  scoreUnavailable: {
    en: "Not enough data to score this set",
    es: "No hay datos suficientes para puntuar este set",
  },
  scoreUnavailableBody: {
    en: "{count} of {total} tracks have no energy tag, no BPM and no audio analysis, so the curve below is drawn from where each track sits in the list — not from your music. A score on top of that would be grading our own drawing.",
    es: "{count} de {total} tracks no tienen etiqueta de energía, ni BPM, ni análisis de audio, así que la curva de abajo sale de dónde cae cada track en la lista — no de tu música. Un score encima de eso sería calificar nuestro propio dibujo.",
  },
  scoreUnavailableFix: {
    en: "The reordering tools below still work — they just can't be scored yet.",
    es: "Las herramientas de reordenamiento de abajo siguen funcionando — sólo que todavía no se pueden puntuar.",
  },
  /**
   * The link this state was missing.
   *
   * It used to say "run the audio analysis on this playlist" as prose — advice the
   * product couldn't take, since measuring only ever happened while *creating* a
   * playlist from files. Now it can, and the sentence is a link to it: naming a fix
   * on the screen that reports the problem, without a way to reach it, is how a
   * fix goes untaken.
   */
  scoreUnavailableCta: {
    en: "Measure the audio for this set",
    es: "Medir el audio de este set",
  },
  coverageInventedAll: {
    en: "No BPM or audio data — this curve is drawn from track positions, so the score reflects the shape you asked for, not your set.",
    es: "Sin BPM ni datos de audio — esta curva sale de la posición de los tracks, así que el score refleja la forma que pediste, no tu set.",
  },
  coverageInventedSome: {
    en: "{count} of {total} tracks have no BPM or audio data, so part of this curve is our estimate.",
    es: "{count} de {total} tracks no tienen BPM ni datos de audio, así que parte de esta curva es nuestra estimación.",
  },
  smartOrderError: {
    en: "Smart ordering is unavailable right now. Try again in a minute.",
    es: "La ordenación inteligente no está disponible ahora. Probá de nuevo en un minuto.",
  },

  /**
   * Residency vs the current order. Worded as an observation, not a verdict: the
   * optimiser is right about the curve and the DJ is right about the room, and
   * neither of those facts settles the other.
   */
  residencyPromotedTitle: {
    en: "This order moves tracks the room heard recently",
    es: "Este orden adelanta tracks que la sala escuchó hace poco",
  },
  residencyPromotedRow: {
    en: "{artist} — {name}: now #{to}, was #{from} · played here {when}",
    es: "{artist} — {name}: ahora #{to}, estaba en #{from} · tocado acá {when}",
  },
  residencyLastDate: { en: "last date", es: "la fecha pasada" },
  residencyDatesAgo: { en: "{n} dates ago", es: "hace {n} fechas" },
  residencyPromotedNote: {
    en: "Said rather than fixed: sometimes that track is exactly what the curve needs, and only you know whether this room would notice. Move it back by hand if it would.",
    es: "Se avisa, no se corrige: a veces ese track es justo lo que la curva necesita, y sólo vos sabés si esta sala lo va a notar. Si lo va a notar, movelo a mano.",
  },

  // Misc — read by the locale toggle, which renders in the dashboard shell.
  // Deleting this key crashes every /dashboard route, not just the analysis
  // screen. See the `satisfies` note above.
  language: { en: "Language", es: "Idioma" },
} satisfies Record<string, LocalizedLabel>

/** Short Space Mono labels next to each curve marker (zone 2). */
export const MARKER_LABELS: Record<string, LocalizedLabel> = {
  abrupt_drop: { en: "DROP {delta}", es: "CAÍDA {delta}" },
  abrupt_spike: { en: "SPIKE +{delta}", es: "SUBIDA +{delta}" },
  flat_zone: { en: "FLAT ZONE", es: "ZONA PLANA" },
  early_peak: { en: "PEAK AT {n}", es: "PICO EN EL {n}" },
  context_high_peak: { en: "PEAK AT {n}", es: "PICO EN EL {n}" },
  weak_ending: { en: "WEAK CLOSE", es: "CIERRE FLOJO" },
  context_range: { en: "OUT OF RANGE", es: "FUERA DE RANGO" },
  no_progression: { en: "NO CLIMB", es: "SIN PROGRESIÓN" },
  too_many_rests: { en: "RESTS", es: "DESCANSOS" },
  no_climax: { en: "NO CLIMAX", es: "SIN CLÍMAX" },
  good_breather: { en: "BREATHER", es: "RESPIRO" },
  low_energy_confidence: { en: "THIN DATA", es: "POCOS DATOS" },
  energy_data_missing: { en: "GUESSED DATA", es: "DATO ESTIMADO" },
  set_too_short: { en: "SHORT SET", es: "SET CORTO" },
  set_too_long: { en: "LONG SET", es: "SET LARGO" },
  set_short_for_slot: { en: "SHORT FOR SLOT", es: "FALTA MÚSICA" },
  set_over_slot: { en: "OVER SLOT", es: "SOBRA MÚSICA" },
  peak_too_early_for_slot: { en: "EARLY FOR SLOT", es: "TEMPRANO" },
  peak_too_late_for_slot: { en: "LATE FOR SLOT", es: "TARDE" },
}

interface FixActionCopy {
  action: LocalizedLabel
  why: LocalizedLabel
}

/**
 * One-sentence action + one grey line of why, per actionable issue type
 * (zone 2 panel). Slots: {bridge} {track} = track names, {from} {to} = 1-based
 * positions, {delta} = energy delta, {count} = involved tracks. Advice-only
 * types are not listed — the panel falls back to ISSUE_COPY.recommendation.
 */
export const FIX_COPY: Record<string, FixActionCopy> = {
  abrupt_drop: {
    action: {
      en: "Move “{bridge}” between {from} and {to} as a bridge.",
      es: "Mové «{bridge}» entre el {from} y el {to} como puente.",
    },
    why: {
      en: "A sudden {delta}-point drop empties the floor; a step in between makes it feel intentional.",
      es: "Una caída de {delta} puntos de golpe vacía la pista; un escalón en el medio la vuelve intencional.",
    },
  },
  abrupt_spike: {
    action: {
      en: "Slot “{bridge}” in before {to} to stage the climb.",
      es: "Meté «{bridge}» antes del {to} para escalonar la subida.",
    },
    why: {
      en: "A +{delta} jump lands better with a step in the middle.",
      es: "Un salto de +{delta} se siente ganado con un paso en el medio.",
    },
  },
  weak_ending: {
    action: {
      en: "Close with “{track}” — move it to the end.",
      es: "Cerrá con «{track}» — movelo al final.",
    },
    why: {
      en: "Sets are remembered by how they end; your strongest track is buried mid-set.",
      es: "Los sets se recuerdan por cómo terminan; tu track más fuerte está quedando enterrado.",
    },
  },
  early_peak: {
    action: {
      en: "Move “{track}” to the final stretch (position {to}).",
      es: "Mové «{track}» al tramo final (posición {to}).",
    },
    why: {
      en: "Peaking this early leaves nowhere to go afterwards.",
      es: "Un pico tan temprano no deja a dónde ir después.",
    },
  },
  context_high_peak: {
    action: {
      en: "Move “{track}” to the final stretch (position {to}).",
      es: "Mové «{track}» al tramo final (posición {to}).",
    },
    why: {
      en: "This context should hold the room, not burn it early.",
      es: "Este contexto pide sostener la sala, no quemarla antes de tiempo.",
    },
  },
  flat_zone: {
    action: {
      en: "Drop “{track}” into the middle of the zone to vary the energy.",
      es: "Meté «{track}» en el medio de la zona para variar la energía.",
    },
    why: {
      en: "{count} tracks in a row at the same energy kill the momentum.",
      es: "{count} tracks seguidos en la misma energía apagan el impulso.",
    },
  },
  too_many_rests: {
    action: {
      en: "Bridge the rest after {from} with “{bridge}”.",
      es: "Puenteá el descanso después del {from} con «{bridge}».",
    },
    why: {
      en: "One breather is healthy; several cool the floor down.",
      es: "Un respiro es sano; varios seguidos enfrían la pista.",
    },
  },
  context_range: {
    action: {
      en: "Reseat these {count} tracks where the curve asks for their energy.",
      es: "Reacomodá estos {count} tracks donde la curva pide su energía.",
    },
    why: {
      en: "Where they sit now, they fall outside the context's range.",
      es: "Donde están ahora quedan fuera del rango del contexto.",
    },
  },
  no_progression: {
    action: {
      en: "Send your 2 strongest tracks to the final stretch.",
      es: "Mandá tus 2 tracks más fuertes al tramo final.",
    },
    why: {
      en: "The last third doesn't top the first — the journey stays flat.",
      es: "El último tercio no supera al primero — el viaje queda plano.",
    },
  },
}
