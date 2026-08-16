/**
 * Wire format for smart ordering progress.
 *
 * Smart ordering is one long Anthropic call — everything around it (loading the
 * playlist, reading the quota, building the prompt) takes milliseconds. So the
 * only honest progress signal is how much of the ordered array the model has
 * emitted so far, which is what these events carry.
 *
 * Newline-delimited JSON rather than SSE: there is no reconnect story here (a
 * dropped stream just falls back to the heuristic), and NDJSON needs no
 * framing beyond `split("\n")`.
 */

export type SmartOrderEvent =
  /** Sent once, before the model call, so the client can size the bar. */
  | { type: "start"; total: number }
  /** `placed` track ids have been emitted so far. Monotonic. */
  | { type: "progress"; placed: number; total: number }
  /** Terminal. `source` mirrors the non-streaming response. */
  | { type: "done"; order: string[]; source: "claude" | "fallback" }
  /** Terminal. The client keeps whatever order it already had. */
  | { type: "error" }

export function encodeSmartOrderEvent(event: SmartOrderEvent): string {
  return `${JSON.stringify(event)}\n`
}

/**
 * Pulls whole events out of a growing buffer.
 *
 * Returns the events that were complete plus the unconsumed tail, because a
 * chunk boundary lands mid-line often enough that dropping the remainder would
 * silently lose the `done` event.
 */
export function decodeSmartOrderEvents(buffer: string): {
  events: SmartOrderEvent[]
  rest: string
} {
  const lines = buffer.split("\n")
  // The last element is either "" (buffer ended on a newline) or a partial line.
  const rest = lines.pop() ?? ""
  const events: SmartOrderEvent[] = []

  for (const line of lines) {
    if (!line.trim()) {
      continue
    }

    try {
      events.push(JSON.parse(line) as SmartOrderEvent)
    } catch {
      // A malformed line is not worth failing the whole order over: progress is
      // advisory, and the terminal event is validated by the caller anyway.
    }
  }

  return { events, rest }
}

/** A complete JSON string literal, escapes included. */
const STRING_LITERAL = /"(?:[^"\\]|\\.)*"/g

/**
 * Counts how many track ids the model has finished writing into `order`.
 *
 * Works off the whole accumulated text rather than the latest delta on purpose:
 * an id routinely arrives split across two deltas, and counting per-chunk would
 * both miss those and double-count ids that straddle a boundary.
 *
 * Only complete string literals count, so a half-written id never advances the
 * bar past what the model has actually committed to.
 */
export function countPlacedIds(text: string): number {
  const opening = text.match(/"order"\s*:\s*\[/)

  if (!opening?.index) {
    return 0
  }

  const from = opening.index + opening[0].length
  const closing = text.indexOf("]", from)
  const slice = text.slice(from, closing === -1 ? undefined : closing)

  return slice.match(STRING_LITERAL)?.length ?? 0
}
