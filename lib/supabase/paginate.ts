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
