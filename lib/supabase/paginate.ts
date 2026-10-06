/**
 * Reading every row of a query, rather than however many the server felt like
 * returning.
 *
 * PostgREST caps a response at its own row limit — 1000 by default. A `select()`
 * with no `range()` does not fail when it hits that ceiling: it returns the
 * first page and nothing else, with no flag and no error. An alpha user asking
 * whether he could manage 30,000 tracks is what surfaced this: at that size the
 * global library would have answered with the first 1000 and looked complete,
 * which is worse than an error, because a plausible wrong answer is the kind a
 * DJ acts on.
 */

/** One page. Matches PostgREST's own default so a full page means "ask again". */
export const PAGE_SIZE = 1000

/**
 * The point at which we stop and say so.
 *
 * Not a guess at what a library holds — a bound on what one request will spend.
 * Fifty pages is far past any real DJ library (the alpha user's 30,000 fits
 * with room to spare) and still bounds a runaway loop to something a request
 * can survive.
 */
export const MAX_ROWS = 50_000

export interface PageResult<T> {
  data: T[] | null
  error: unknown
}

export interface PaginatedResult<T> {
  rows: T[]
  /**
   * True when the ceiling was reached and the last page was still full — so
   * there may be more rows we did not read. The caller has to surface this;
   * silently returning a short answer is the bug this module exists for.
   */
  truncated: boolean
  error: unknown
}

/**
 * Pages through `fetchPage` until it returns a short page.
 *
 * A short page is the only reliable "that was the end" signal: PostgREST does
 * not tell us the total unless the query asks for a count, and asking for one
 * costs a second scan on every read.
 */
export async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
  options: { pageSize?: number; maxRows?: number } = {}
): Promise<PaginatedResult<T>> {
  const pageSize = options.pageSize ?? PAGE_SIZE
  const maxRows = options.maxRows ?? MAX_ROWS

  const rows: T[] = []

  while (rows.length < maxRows) {
    const from = rows.length
    const { data, error } = await fetchPage(from, from + pageSize - 1)

    if (error) {
      // Partial rows are returned alongside the error rather than discarded:
      // the caller decides whether half a library beats none, and it has more
      // context than we do to decide that.
      return { rows, truncated: false, error }
    }

    const page = data ?? []
    rows.push(...page)

    // Short page means the table is exhausted — there is nothing after it.
    if (page.length < pageSize) {
      return { rows, truncated: false, error: null }
    }
  }

  // Stopped at the ceiling on a full page, so there is probably more. "Probably"
  // is the honest word: a table holding exactly maxRows reports truncated too,
  // and over-warning is the cheaper mistake.
  return { rows, truncated: true, error: null }
}

/**
 * How many ids one `in()` filter may carry.
 *
 * PostgREST puts an `in()` list in the URL of a GET, and a uuid is 36
 * characters before encoding. Probed against dev on 02/10/2026
 * (`tests/perf/scale.perf.ts`, docs/qa/carga-2026-10.md): 350 ids pass, 400 fail
 * with `fetch failed`, 800 with `Bad Request`. Every `in()` over a list the user
 * controls the length of — their playlists — broke at the same place: the
 * dashboard threw, the playlist list threw, and the data export delivered zero
 * tracks under a "your data" label. 300 leaves room under the measured edge
 * without asking for more round trips than it has to.
 */
export const IN_FILTER_CHUNK = 300

/** Splits `ids` into lists `in()` can carry, dropping repeats first. */
export function chunkIds<T>(ids: readonly T[], size = IN_FILTER_CHUNK): T[][] {
  if (!Number.isInteger(size) || size < 1) {
    throw new Error(`chunk size must be a positive integer, got ${size}`)
  }

  const unique = [...new Set(ids)]
  const chunks: T[][] = []

  for (let start = 0; start < unique.length; start += size) {
    chunks.push(unique.slice(start, start + size))
  }

  return chunks
}

/**
 * `fetchAllRows` for a query filtered by `in(column, ids)`, with the list split
 * so no request carries more than `IN_FILTER_CHUNK` ids.
 *
 * The ceiling is the whole result's, not each chunk's: splitting the list must
 * not quietly multiply what one call may read. The first error stops it and
 * comes back with the rows read so far, the same contract as `fetchAllRows` —
 * and the same duty on the caller to look at it.
 *
 * Chunks run one after another. They are only many when the user has hundreds
 * of playlists, and running them together would trade a slower read for a burst
 * the database pays for.
 */
export async function fetchAllRowsIn<T, Id>(
  ids: readonly Id[],
  fetchPage: (chunk: Id[], from: number, to: number) => PromiseLike<PageResult<T>>,
  options: { pageSize?: number; maxRows?: number; chunkSize?: number } = {}
): Promise<PaginatedResult<T>> {
  const maxRows = options.maxRows ?? MAX_ROWS
  const rows: T[] = []

  for (const chunk of chunkIds(ids, options.chunkSize)) {
    const result = await fetchAllRows((from, to) => fetchPage(chunk, from, to), {
      pageSize: options.pageSize,
      maxRows: maxRows - rows.length,
    })

    rows.push(...result.rows)

    if (result.error) {
      return { rows, truncated: false, error: result.error }
    }

    if (result.truncated) {
      return { rows, truncated: true, error: null }
    }
  }

  return { rows, truncated: false, error: null }
}

export interface CountResult {
  count: number
  error: unknown
}

/**
 * A row count over `in(column, ids)`, asked chunk by chunk and summed.
 *
 * `countChunk` should be a `count: "exact", head: true` query, so no rows cross
 * the wire. Summing is correct because the chunks are disjoint — `chunkIds`
 * drops repeated ids before splitting. A null count is treated as an error, not
 * as zero: zero is a claim, and a missing number is not evidence for it.
 */
export async function countRowsIn<Id>(
  ids: readonly Id[],
  countChunk: (chunk: Id[]) => PromiseLike<{ count: number | null; error: unknown }>,
  options: { chunkSize?: number } = {}
): Promise<CountResult> {
  const results = await Promise.all(
    chunkIds(ids, options.chunkSize).map((chunk) => countChunk(chunk))
  )

  let count = 0

  for (const result of results) {
    if (result.error) {
      return { count, error: result.error }
    }

    if (result.count === null) {
      return { count, error: new Error("count was not returned") }
    }

    count += result.count
  }

  return { count, error: null }
}
