import { FALLBACK_TRANSITION_SECONDS, MIX_OVERLAP_BARS, ROUGH_TRACKS_PER_HOUR } from "@/lib/engine/set-duration"
import { formatTemplate } from "@/lib/content/analysis-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import type { SetDuration } from "@/lib/engine/set-duration"
import type { SplitCriterion } from "@/lib/engine/set-split"

/**
 * The words of the split-into-sets flow, in both languages. Its own module
 * rather than a block in dashboard-copy.ts: the strings are used by one form,
 * one action and one page, and keeping them here keeps parallel branches from
 * colliding in the shared copy table (AGENTS.md, «Parallel PRs»).
 */

/** "45 min", "2 h 10 min": the same in both languages. */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`
  }

  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60

  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}

export const SPLIT_COPY = {
  eyebrow: { en: "Longer than an hour", es: "Más de una hora" },
  plays: { en: "This list plays about {time}.", es: "Esta lista suena unas {time}." },
  measured: {
    en: "Measured: the tracks' own lengths, minus {bars} bars of overlap at each of the {transitions} mixes, timed from their BPM.",
    es: "Medido: la duración de cada tema, menos {bars} compases de solape en cada una de las {transitions} mezclas, calculados con su BPM.",
  },
  measuredGuessed: {
    en: "{count} of those mixes had no BPM on either side and were counted as {seconds} s.",
    es: "{count} de esas mezclas no tenían BPM de ningún lado y se contaron como {seconds} s.",
  },
  rough: {
    en: "Rough estimate, not a measurement: fewer than 8 in 10 tracks carry their length, so this is {count} tracks at {perHour} an hour.",
    es: "Estimación gruesa, no una medición: menos de 8 de cada 10 temas traen su duración, así que son {count} temas a {perHour} por hora.",
  },
  question: {
    en: "Split it into sets of about an hour?",
    es: "¿La partimos en sets de alrededor de una hora?",
  },
  keepOne: { en: "No, keep one set", es: "No, un solo set" },
  countOption: {
    en: "{count} sets · about {each} each",
    es: "{count} sets · unos {each} cada uno",
  },
  criterionLegend: {
    en: "How should the tracks be shared out?",
    es: "¿Con qué criterio repartimos los temas?",
  },
  givesUp: { en: "Gives up", es: "Resigna" },
  harmonicDisabled: {
    en: "Not available: {missing} of {total} tracks have no key in the file, and a split computed on part of the keys would mix badly without saying why.",
    es: "No disponible: {missing} de {total} temas no traen tonalidad en el archivo, y repartir con parte de las tonalidades daría sets que se mezclan mal sin explicar por qué.",
  },
  proBadge: { en: "pro", es: "pro" },
  lockedBody: {
    en: "With PRO, this list is split into sets of about an hour, each in its own order and with its own curve, and you choose how the tracks are shared out. On your plan it imports as one set, as always.",
    es: "Con PRO, esta lista se parte en sets de alrededor de una hora, cada uno con su orden y su curva, y elegís con qué criterio se reparten los temas. En tu plan se importa como un solo set, como siempre.",
  },
  lockedCta: { en: "See plans", es: "Ver planes" },
  proOnly: {
    en: "Splitting a list into several sets is part of PRO. Nothing was created: import it as one set, or see the plans.",
    es: "Partir una lista en varios sets es de PRO. No se creó nada: importala como un solo set, o mirá los planes.",
  },
  orderNote: {
    en: "The tracks are shared out first and each set is then ordered on its own, so no set starts on another one's peak.",
    es: "Primero se reparten los temas y después cada set se ordena por su cuenta, así ningún set arranca en el pico de otro.",
  },
  setName: { en: "{name} · Set {number} of {total}", es: "{name} · Set {number} de {total}" },
  invalidChoice: {
    en: "That split is not available for this list any more. Check the file and choose again.",
    es: "Esa división ya no está disponible para esta lista. Revisá el archivo y elegí de nuevo.",
  },
  notEnoughRoom: {
    en: "Splitting creates {count} sets, and your plan has room for {room} more. Nothing was created.",
    es: "Partir crea {count} sets, y a tu plan le quedan {room}. No se creó nada.",
  },
  resultTitle: { en: "Your sets", es: "Tus sets" },
  resultIntro: {
    en: "{count} sets from one list, each ordered on its own. Play them in this order.",
    es: "{count} sets de una lista, cada uno ordenado por su cuenta. Se tocan en este orden.",
  },
  resultCriterion: { en: "Shared out by: {criterion}", es: "Repartidos por: {criterion}" },
  setLabel: { en: "Set {number} of {total}", es: "Set {number} de {total}" },
  tracks: { en: "{count} tracks", es: "{count} temas" },
  open: { en: "Open set", es: "Abrir el set" },
  durationMeasured: { en: "about {time}, measured", es: "unos {time}, medido" },
  durationRough: { en: "about {time}, rough estimate", es: "unos {time}, estimación gruesa" },
  missing: {
    en: "These sets are not in your library any more.",
    es: "Estos sets ya no están en tu librería.",
  },
} as const

export const CRITERION_COPY: Record<
  SplitCriterion,
  { name: Record<SiteLocale, string>; gives: Record<SiteLocale, string>; givesUp: Record<SiteLocale, string> }
> = {
  own_curve: {
    name: { en: "Own curve per set", es: "Curva propia por set" },
    gives: {
      en: "Every set gets quiet tracks for its intro and peak tracks for its climax. Each one stands alone.",
      es: "Cada set recibe temas tranquilos para la intro y temas de pico para el clímax. Cada uno se sostiene solo.",
    },
    givesUp: {
      en: "The night does not build from one set to the next: each starts low again.",
      es: "La noche no sube de un set al otro: cada uno vuelve a arrancar abajo.",
    },
  },
  continuous: {
    name: { en: "Continuous energy", es: "Energía continua" },
    gives: {
      en: "Set 1 keeps the calmest band, the next set the one above, and each curve picks up where the last one ended.",
      es: "El set 1 se queda con la banda más tranquila, el siguiente con la de arriba, y cada curva sigue donde terminó la anterior.",
    },
    givesUp: {
      en: "Set 1 has no real peak, and the last set has no quiet intro.",
      es: "El set 1 no tiene un pico de verdad, y el último no tiene una intro tranquila.",
    },
  },
  harmonic: {
    name: { en: "Harmonic compatibility", es: "Compatibilidad armónica" },
    gives: {
      en: "Neighbours on the Camelot wheel go together, so every set mixes clean.",
      es: "Los vecinos en la rueda Camelot van juntos, así cada set se mezcla limpio.",
    },
    givesUp: {
      en: "Energy falls where it falls: one set can come out mostly high or mostly low.",
      es: "La energía queda como caiga: un set puede salir casi todo arriba o casi todo abajo.",
    },
  },
}

/** The provenance line(s) under a duration: never a number without its source. */
export function durationSource(duration: SetDuration, trackCount: number, locale: SiteLocale): string[] {
  if (duration.method === "rough") {
    return [
      formatTemplate(SPLIT_COPY.rough[locale], {
        count: trackCount,
        perHour: ROUGH_TRACKS_PER_HOUR,
      }),
    ]
  }

  const lines = [
    formatTemplate(SPLIT_COPY.measured[locale], {
      bars: MIX_OVERLAP_BARS,
      transitions: duration.transitions,
    }),
  ]

  if (duration.estimatedTransitions > 0) {
    lines.push(
      formatTemplate(SPLIT_COPY.measuredGuessed[locale], {
        count: duration.estimatedTransitions,
        seconds: FALLBACK_TRANSITION_SECONDS,
      })
    )
  }

  return lines
}
