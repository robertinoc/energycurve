import {
  type SmartOrderEvent,
  type SmartOrderFallbackReason,
} from "@/lib/smart-order/stream"

/**
 * The orchestration of one smart ordering, extracted from the route so its two
 * guarantees are testable without HTTP, Supabase, or the Anthropic SDK:
 *
 * 1. **Exactly one terminal event, always.** The production bug this exists
 *    for: the Claude call had no bound while it streamed, the platform killed
 *    the function at `maxDuration`, and the NDJSON stream ended with no `done`
 *    — the DJ paid for the attempt and received nothing, not even the
 *    heuristic order the route was built to fall back to.
 *
 * 2. **A real deadline over the whole call.** The SDK's `timeout` option only
 *    bounds the time to response *headers* (its timer is cleared in the
 *    `finally` of the fetch itself — see `fetchWithTimeout` in
 *    `@anthropic-ai/sdk/client.mjs`); once a stream is open, nothing bounds
 *    the generation. The deadline here races the whole call, aborts the
 *    upstream request the moment it expires (every second a doomed stream
 *    stays open is billed), and answers with the heuristic.
 */

export interface SmartOrderResult {
  order: string[]
  rationale: string
  breathers: string[]
  source: "claude" | "fallback"
  /** Why the heuristic was used, when it was. */
  reason?: SmartOrderFallbackReason
}

export type ClaudeCallOutcome =
  | { ok: true; value: Omit<SmartOrderResult, "source" | "reason"> }
  | { ok: false; reason: SmartOrderFallbackReason }

export interface SmartOrderRunDeps {
  total: number
  /** Wall-clock budget for the whole Claude call, stream included. */
  deadlineMs: number
  /**
   * The Claude call. Must observe `signal` (passed to the SDK) so an expired
   * deadline stops the upstream generation — but the deadline does NOT depend
   * on it: the race below answers on time even against a promise that never
   * settles.
   */
  callClaude: (
    signal: AbortSignal,
    onPlaced: (placed: number) => void
  ) => Promise<ClaudeCallOutcome>
  /** The local order used when the model doesn't answer. Must be fast. */
  heuristic: () => Pick<SmartOrderResult, "order" | "rationale" | "breathers">
  classify: (error: unknown) => SmartOrderFallbackReason
  /**
   * Quota, run record, cache, logs — everything that happens after the result
   * is decided and before `done` goes out. A throw in here must never eat the
   * terminal event, so it runs guarded.
   */
  afterResult?: (result: SmartOrderResult) => Promise<void>
  onTimeout?: (deadlineMs: number) => void
  onFailure?: (error: unknown, reason: SmartOrderFallbackReason) => void
  /** A bug in our own plumbing (heuristic threw, say) — the one case that
   * answers `{type:"error"}` instead of an order. */
  onUnexpected?: (error: unknown) => void
}

/** The deadline as a value, so the race can tell it apart from any outcome. */
const DEADLINE = Symbol("smart-order-deadline")

/**
 * Runs one smart ordering and emits its events. Settles only after the
 * terminal event (`done` or `error`) has been emitted — the route just wires
 * `emit` to the response stream and closes it afterwards.
 */
export async function runSmartOrder(
  deps: SmartOrderRunDeps,
  emit: (event: SmartOrderEvent) => void
): Promise<void> {
  try {
    emit({ type: "start", total: deps.total })

    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined

    const deadline = new Promise<typeof DEADLINE>((resolve) => {
      timer = setTimeout(() => resolve(DEADLINE), deps.deadlineMs)
    })

    let result: SmartOrderResult

    try {
      const claudePromise = deps.callClaude(controller.signal, (placed) =>
        emit({ type: "progress", placed, total: deps.total })
      )
      // A rejection that loses the race (or lands after it) must not become an
      // unhandled rejection: the deadline branch already answered for it.
      claudePromise.catch(() => {})

      const outcome = await Promise.race([claudePromise, deadline])

      if (outcome === DEADLINE) {
        // Stop the upstream generation NOW: an abandoned stream keeps
        // generating — and billing — until it finishes on its own.
        controller.abort()
        deps.onTimeout?.(deps.deadlineMs)
        result = { ...deps.heuristic(), source: "fallback", reason: "timeout" }
      } else if (outcome.ok) {
        result = { ...outcome.value, source: "claude" }
      } else {
        result = {
          ...deps.heuristic(),
          source: "fallback",
          reason: outcome.reason,
        }
      }
    } catch (error) {
      // Only a rejection that beat the deadline lands here: the deadline's own
      // abort can't — resolving the race locks it in before the abort runs, so
      // the aborted call's rejection drains into the no-op catch above. (And if
      // an abort-shaped error ever did arrive, `classify` already reads
      // APIUserAbortError as "timeout".)
      const reason = deps.classify(error)

      deps.onFailure?.(error, reason)

      result = { ...deps.heuristic(), source: "fallback", reason }
    } finally {
      clearTimeout(timer)
    }

    if (deps.afterResult) {
      try {
        await deps.afterResult(result)
      } catch (error) {
        // Monitoring and quota writes must not cost the DJ the order that is
        // already in hand.
        deps.onUnexpected?.(error)
      }
    }

    emit({
      type: "done",
      order: result.order,
      source: result.source,
      reason: result.reason,
    })
  } catch (error) {
    // The heuristic itself threw, or something equally unexpected. The stream
    // still ends with a terminal event: the client keeps the order it had and
    // can say the attempt was interrupted instead of hanging on a cut stream.
    deps.onUnexpected?.(error)

    try {
      emit({ type: "error" })
    } catch {
      // The response stream is already gone (client disconnected) — nothing
      // left to answer to.
    }
  }
}
