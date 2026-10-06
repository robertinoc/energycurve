import { describe, expect, it, vi } from "vitest"

import {
  chunkIds,
  countRowsIn,
  fetchAllRows,
  fetchAllRowsIn,
  IN_FILTER_CHUNK,
} from "@/lib/supabase/paginate"

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

describe("splitting an in() list (lote 17)", () => {
  it("drops repeated ids before splitting, so chunk counts can be summed", () => {
    expect(chunkIds(["a", "b", "a", "c"], 2)).toEqual([["a", "b"], ["c"]])
  })

  it("refuses a chunk size that would loop forever or split nothing", () => {
    expect(() => chunkIds(["a"], 0)).toThrow()
    expect(() => chunkIds(["a"], 1.5)).toThrow()
  })

  it("asks once per chunk and returns every row, in chunk order", async () => {
    const ids = Array.from({ length: IN_FILTER_CHUNK * 2 + 1 }, (_, index) => index)
    const fetchPage = vi.fn(async (chunk: number[], from: number) => ({
      data: from === 0 ? chunk.map((id) => ({ id })) : [],
      error: null,
    }))

    const result = await fetchAllRowsIn(ids, fetchPage, { pageSize: 1000 })

    expect(fetchPage.mock.calls.map(([chunk]) => chunk.length)).toEqual([
      IN_FILTER_CHUNK,
      IN_FILTER_CHUNK,
      1,
    ])
    expect(result.rows.map((row) => row.id)).toEqual(ids)
    expect(result).toMatchObject({ truncated: false, error: null })
  })

  it("holds the ceiling across chunks, not per chunk", async () => {
    // Splitting the list must not multiply what one call may read: three
    // chunks of 100 under a ceiling of 150 stop at 150 and say so.
    const ids = Array.from({ length: 300 }, (_, index) => index)
    const fetchPage = vi.fn(async (chunk: number[], from: number, to: number) => ({
      data: chunk.slice(from, to + 1).map((id) => ({ id })),
      error: null,
    }))

    const result = await fetchAllRowsIn(ids, fetchPage, {
      chunkSize: 100,
      pageSize: 50,
      maxRows: 150,
    })

    expect(result.rows).toHaveLength(150)
    expect(result.truncated).toBe(true)
  })

  it("stops at the first error and hands it back with the rows so far", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ data: [{ id: 1 }], error: null })
      .mockResolvedValueOnce({ data: null, error: new Error("boom") })

    const result = await fetchAllRowsIn([1, 2], fetchPage, { chunkSize: 1 })

    expect(result.rows).toEqual([{ id: 1 }])
    expect(result.error).toBeInstanceOf(Error)
  })
})

describe("counting over a split in() list (lote 17)", () => {
  it("sums the chunks", async () => {
    const result = await countRowsIn(
      Array.from({ length: 701 }, (_, index) => index),
      async (chunk) => ({ count: chunk.length * 2, error: null })
    )

    expect(result).toEqual({ count: 1402, error: null })
  })

  it("treats a missing count as an error, never as zero", async () => {
    const result = await countRowsIn([1, 2], async () => ({ count: null, error: null }), {
      chunkSize: 1,
    })

    expect(result.error).toBeInstanceOf(Error)
  })
})
