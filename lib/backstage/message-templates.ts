/**
 * Default messages an admin can send from the Users table. Pure data +
 * greeting resolution so the modal can prefill and the texts stay
 * unit-tested; everything is editable before sending.
 */

export interface BackstageMessageTemplate {
  id: string
  label: string
  subject: string
  body: (greeting: string) => string
}

/** "Hi Name," when we know a name, "Hi," when we don't. */
export function messageGreeting(name: string | null): string {
  const trimmed = name?.trim()

  return trimmed ? `Hi ${trimmed},` : "Hi,"
}

export const BACKSTAGE_MESSAGE_TEMPLATES: BackstageMessageTemplate[] = [
  {
    id: "getting_started",
    label: "Getting started (never used)",
    subject: "Need a hand getting started with EnergyCurve?",
    body: (greeting) =>
      `${greeting}

I saw you created an EnergyCurve account but haven't analysed a set yet — did you run into any trouble?

The fastest way in: create a playlist, paste your tracklist (artist – title, BPM works too), and hit Analyse. You'll get the energy curve of the whole set with the rough spots flagged.

If something didn't work or wasn't clear, just reply to this email — I read every answer.

Robertino · EnergyCurve`,
  },
  {
    id: "check_in",
    label: "Check-in (active user)",
    subject: "How's EnergyCurve working for you?",
    body: (greeting) =>
      `${greeting}

You've been running set analyses on EnergyCurve — thank you! I'd love to know how it's going: is the energy curve matching what you hear in the booth? Anything missing?

Reply to this email with whatever comes to mind, even one line helps.

Robertino · EnergyCurve`,
  },
  {
    id: "custom",
    label: "Custom message",
    subject: "",
    body: (greeting) => `${greeting}

`,
  },
]
