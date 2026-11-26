/**
 * Wait for a streamed answer, but never longer than `ms` in total.
 *
 * The SDK's per-request `timeout` does not do this. It is armed around the
 * underlying `fetch` only, and `fetch` resolves as soon as the response headers
 * arrive — for a streamed call that is the first second, before the model has
 * written anything. From there on nothing bounds the body: a model that thinks
 * for 70s streams for 70s, the platform kills the function at its 60s ceiling,
 * and the DJ gets a stream that ends after `start` instead of the heuristic
 * order the route was holding all along.
 *
 * That went unseen for as long as the account had no credit, because an
 * unfunded call fails in the first second. It surfaced the day credit came back.
 *
 * Aborting the stream makes `finalMessage()` reject with the SDK's
 * `APIUserAbortError`, which `classifyFailure` reads as `timeout`.
 */
export async function finalMessageWithin<T>(
  stream: { finalMessage(): Promise<T>; abort(): void },
  ms: number
): Promise<T> {
  const deadline = setTimeout(() => stream.abort(), ms)

  try {
    return await stream.finalMessage()
  } finally {
    clearTimeout(deadline)
  }
}
