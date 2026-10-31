import { REORDER_MAX_TRACKS } from "@/lib/engine/reorder"
import { formatTemplate } from "@/lib/content/analysis-copy"
import type { SiteLocale } from "@/lib/content/site-copy"

/**
 * The longest list any import accepts: the optimizer's own bound.
 *
 * Not a number picked for the import. Past `REORDER_MAX_TRACKS` the engine
 * gives a set no reorder suggestion at all (see `lib/engine/reorder.ts` for the
 * timings that set it), and splitting a long list into sets happens *before*
 * that ordering — so a list longer than this could not be split into ordered
 * sets either. Rejecting it at the door says so up front, instead of importing
 * a set the product can analyse but never order.
 *
 * Every create path enforces it on the server: the file import, the audio-file
 * import and the pasted tracklist. The forms check it too, to say it before
 * anything is sent.
 */
export const IMPORT_MAX_TRACKS = REORDER_MAX_TRACKS

const TOO_MANY = {
  en: "This list has {count} tracks, and the limit is {max}: that is the longest list the order optimizer can work on, not a number we picked for the import. Export a shorter list, or split this one in your DJ software.",
  es: "Esta lista tiene {count} temas y el límite es {max}: es la lista más larga que el optimizador de orden puede trabajar, no un número elegido para el import. Exportá una lista más corta, o partila en tu software de DJ.",
} as const

export function isOverImportLimit(trackCount: number): boolean {
  return trackCount > IMPORT_MAX_TRACKS
}

export function tooManyTracksMessage(trackCount: number, locale: SiteLocale): string {
  return formatTemplate(TOO_MANY[locale], { count: trackCount, max: IMPORT_MAX_TRACKS })
}
