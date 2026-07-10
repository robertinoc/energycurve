import type { SiteLocale } from "@/lib/content/site-copy"

/**
 * Rotating dashboard greetings (pattern ported from StageLink's
 * DashboardWelcome): returning users get a different, DJ-flavored hello on
 * each visit instead of a static "Welcome back". The dashboard is
 * force-dynamic, so a per-request random pick is safe. Both locales keep the
 * same slot count so an index test covers them symmetrically.
 */
export const DASHBOARD_GREETINGS: Record<SiteLocale, readonly string[]> = {
  en: [
    "Welcome back, {name}",
    "The decks are warm, {name}",
    "{name} in the booth — let's read the floor",
    "Back for another set, {name}?",
    "The curve missed you, {name}",
    "Line check done, {name} — your move",
    "Peak time starts now, {name}",
    "{name}, the floor is listening",
    "Fresh ears, {name} — let's shape tonight's arc",
    "No requests tonight, {name}. Just flow",
    "Cue up, {name} — the room fills at your pace",
    "Energy check, {name}: where do we take it?",
  ],
  es: [
    "Bienvenido de nuevo, {name}",
    "Las bandejas están calientes, {name}",
    "{name} en la cabina — leamos la pista",
    "¿Volvés por otro set, {name}?",
    "La curva te extrañaba, {name}",
    "Line check listo, {name} — tu turno",
    "El peak time empieza ahora, {name}",
    "{name}, la pista está escuchando",
    "Oídos frescos, {name} — demos forma al arco de esta noche",
    "Sin requests esta noche, {name}. Puro flow",
    "Dale al cue, {name} — la sala se llena a tu ritmo",
    "Chequeo de energía, {name}: ¿a dónde la llevamos?",
  ],
} as const

export function pickGreeting(
  name: string,
  locale: SiteLocale = "en",
  index?: number
): string {
  const greetings = DASHBOARD_GREETINGS[locale] ?? DASHBOARD_GREETINGS.en
  const safeIndex =
    index !== undefined
      ? Math.abs(Math.trunc(index)) % greetings.length
      : Math.floor(Math.random() * greetings.length)

  return greetings[safeIndex].replace("{name}", name)
}
