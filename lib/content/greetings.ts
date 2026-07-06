/**
 * Rotating dashboard greetings (pattern ported from StageLink's
 * DashboardWelcome): returning users get a different, DJ-flavored hello on
 * each visit instead of a static "Welcome back". The dashboard is
 * force-dynamic, so a per-request random pick is safe.
 */
export const DASHBOARD_GREETINGS = [
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
] as const

export function pickGreeting(name: string, index?: number): string {
  const safeIndex =
    index !== undefined
      ? Math.abs(Math.trunc(index)) % DASHBOARD_GREETINGS.length
      : Math.floor(Math.random() * DASHBOARD_GREETINGS.length)

  return DASHBOARD_GREETINGS[safeIndex].replace("{name}", name)
}
