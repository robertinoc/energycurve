import { describe, expect, it, vi } from "vitest"

import { fetchAllRows } from "@/lib/supabase/paginate"

/** A fake table of `total` rows that answers range requests like PostgREST. */
function table(total: number, pageSize: number) {
  const calls: [number, number][] = []

  const fetchPage = vi.fn(async (from: number, to: number) => {
    calls.push([from, to])
    const slice = Array.from(
      { length: Math.max(0, Math.min(to, total - 1) - from + 1) },
      (_, i) => from + i
    )
    return { data: slice, error: null }
  })

  return { fetchPage, calls, pageSize }
}

describe("fetchAllRows", () => {
  it("returns every row when the table spans several pages", async () => {
    const t = table(2500, 1000)
    const result = await fetchAllRows(t.fetchPage, { pageSize: 1000 })

    expect(result.rows).toHaveLength(2500)
    expect(result.truncated).toBe(false)
    expect(result.error).toBeNull()
  })

  it("stops on the first short page instead of asking forever", async () => {
    const t = table(2500, 1000)
    await fetchAllRows(t.fetchPage, { pageSize: 1000 })

    // 0-999, 1000-1999, 2000-2999 (short, 500 rows) — and then it stops.
    expect(t.calls).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ])
  })

  it("asks only once when everything fits in one page", async () => {
    const t = table(40, 1000)
    const result = await fetchAllRows(t.fetchPage, { pageSize: 1000 })

    expect(result.rows).toHaveLength(40)
    expect(t.fetchPage).toHaveBeenCalledTimes(1)
  })

  it("handles an empty table without a second request", async () => {
    const t = table(0, 1000)
    const result = await fetchAllRows(t.fetchPage, { pageSize: 1000 })

    expect(result.rows).toEqual([])
    expect(result.truncated).toBe(false)
    expect(t.fetchPage).toHaveBeenCalledTimes(1)
  })

  it("reports truncated when it stops at the ceiling on a full page", async () => {
    // The whole point of the module: a short answer must announce itself.
    const t = table(10_000, 100)
    const result = await fetchAllRows(t.fetchPage, {
      pageSize: 100,
      maxRows: 300,
    })

    expect(result.rows).toHaveLength(300)
    expect(result.truncated).toBe(true)
  })

  it("does not report truncated when the table ends exactly at the ceiling boundary", async () => {
    // 250 rows with a 300 ceiling: the third page comes back short, so we know
    // we reached the end rather than ran out of budget.
    const t = table(250, 100)
    const result = await fetchAllRows(t.fetchPage, {
      pageSize: 100,
      maxRows: 300,
    })

    expect(result.rows).toHaveLength(250)
    expect(result.truncated).toBe(false)
  })

  it("returns the rows it already read alongside an error", async () => {
    // Half a library can still be worth showing; the caller decides, and it
    // can only decide if we hand it both the rows and the failure.
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ data: Array.from({ length: 100 }), error: null })
      .mockResolvedValueOnce({ data: null, error: new Error("boom") })

    const result = await fetchAllRows(fetchPage, { pageSize: 100 })

    expect(result.rows).toHaveLength(100)
    expect(result.error).toBeInstanceOf(Error)
    expect(result.truncated).toBe(false)
  })

  it("treats a null page as the end rather than throwing", async () => {
    const fetchPage = vi.fn(async () => ({ data: null, error: null }))
    const result = await fetchAllRows(fetchPage, { pageSize: 100 })

    expect(result.rows).toEqual([])
    expect(result.error).toBeNull()
  })
})
