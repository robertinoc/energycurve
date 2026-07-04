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
}

export const REORDER_RATIONALE: LocalizedLabel = {
  en: "Suggested order sorts tracks from lowest to highest energy: it removes every abrupt drop and finishes strong.",
  es: "El orden sugerido acomoda los tracks de menor a mayor energía: elimina todas las caídas bruscas y cierra fuerte.",
}

export const SEVERITY_LABELS: Record<"penalty" | "info", LocalizedLabel> = {
  penalty: { en: "Costs points", es: "Resta puntos" },
  info: { en: "Heads-up", es: "Atención" },
}

export const CONTEXT_DISPLAY_NAMES: Record<string, LocalizedLabel> = {
  opening: { en: "opening", es: "opening" },
  main: { en: "main time", es: "main time" },
  closing: { en: "closing", es: "closing" },
}
