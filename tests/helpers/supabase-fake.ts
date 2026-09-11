/**
 * A small in-memory stand-in for the PostgREST query builder.
 *
 * It **applies the filters** rather than recording them. That distinction is the
 * whole point: a fake that only remembers which `.eq()` calls were made can be
 * satisfied by a function that filters on the wrong column, or that filters one
 * query and forgets the next. A fake that actually returns rows will hand a
 * forgotten filter straight back to the caller, and the assertion that a stranger
 * cannot read a playlist then means what it says.
 *
 * Scope is deliberately the subset `services/` uses. Anything outside it throws
 * loudly instead of quietly returning nothing, because a silent no-op here would
 * read as a passing test.
 */

export type Row = Record<string, unknown>
export type Tables = Record<string, Row[]>

export interface FakeSupabase {
  from: (table: string) => Builder
  /** Every statement that ran, in order. For asserting what did *not* happen. */
  readonly log: Statement[]
  /** Live view of the data, so a test can assert on what a write left behind. */
  readonly tables: Tables
  /** Forces the next statement against `table` to fail, to exercise error paths. */
  failNext: (table: string, message: string) => void
}

export interface Statement {
  table: string
  op: "select" | "insert" | "update" | "delete"
  filters: Array<[string, string, unknown]>
  rowsTouched: number
}

type Filter = [
  column: string,
  op: "eq" | "in" | "neq" | "is" | "gte" | "lte" | "lt" | "gt" | "not-is",
  value: unknown,
]

function matches(row: Row, filters: Filter[]): boolean {
  return filters.every(([column, op, value]) => {
    const actual = row[column]
    if (op === "eq") return actual === value
    if (op === "neq") return actual !== value
    if (op === "is") return actual === value
    if (op === "in") return (value as unknown[]).includes(actual)
    if (op === "gte") return (actual as number) >= (value as number)
    if (op === "lte") return (actual as number) <= (value as number)
    // Dates arrive as ISO strings, which compare correctly lexicographically —
    // which is the whole reason the retention sweep can filter on them at all.
    if (op === "lt") return (actual as number) < (value as number)
    if (op === "gt") return (actual as number) > (value as number)
    if (op === "not-is") return actual !== value
    return false
  })
}

class Builder implements PromiseLike<{ data: unknown; error: unknown }> {
  private filters: Filter[] = []
  private op: Statement["op"] = "select"
  private payload: Row | Row[] | null = null
  private single_ = false
  private maybe = false
  private wantsReturn = true
  private orderBy: { column: string; ascending: boolean } | null = null
  private limitTo: number | null = null
  private rangeFrom: number | null = null
  private rangeTo: number | null = null
  private headOnly = false

  constructor(
    private readonly table: string,
    private readonly db: Tables,
    private readonly log: Statement[],
    private readonly failures: Map<string, string>
  ) {}

  private get rows(): Row[] {
    this.db[this.table] ??= []
    return this.db[this.table]
  }

  select(_columns?: string, options?: { count?: string; head?: boolean }) {
    // A select() after insert/update/delete asks PostgREST to return the
    // affected rows; it does not turn the statement into a read.
    if (this.op === "select") this.op = "select"
    this.wantsReturn = true
    if (options?.head) this.headOnly = true
    return this
  }

  insert(payload: Row | Row[]) {
    this.op = "insert"
    this.payload = payload
    this.wantsReturn = false
    return this
  }

  update(payload: Row) {
    this.op = "update"
    this.payload = payload
    this.wantsReturn = false
    return this
  }

  delete() {
    this.op = "delete"
    this.wantsReturn = false
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push([column, "eq", value])
    return this
  }

  neq(column: string, value: unknown) {
    this.filters.push([column, "neq", value])
    return this
  }

  in(column: string, values: unknown[]) {
    this.filters.push([column, "in", values])
    return this
  }

  is(column: string, value: unknown) {
    this.filters.push([column, "is", value])
    return this
  }

  lt(column: string, value: unknown) {
    this.filters.push([column, "lt", value])
    return this
  }

  gt(column: string, value: unknown) {
    this.filters.push([column, "gt", value])
    return this
  }

  /**
   * PostgREST spells negation as `.not(column, operator, value)`. Only the
   * `is` form is used here — `.not("payload", "is", null)` means "has a
   * payload" — so that is the only one implemented, and anything else throws
   * rather than silently matching everything.
   */
  not(column: string, operator: string, value: unknown) {
    if (operator !== "is") {
      throw new Error(`supabase-fake: .not(…, "${operator}", …) is not implemented`)
    }

    this.filters.push([column, "not-is", value])
    return this
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderBy = { column, ascending: options?.ascending ?? true }
    return this
  }

  limit(count: number) {
    this.limitTo = count
    return this
  }

  maybeSingle() {
    this.maybe = true
    this.single_ = true
    return this
  }

  /**
   * Present because its absence made a test pass for the wrong reason: without
   * it, `.insert(…).select().single()` threw a TypeError, the caller's error
   * path swallowed it, and "the row was not written" looked like a refusal
   * rather than a crash. A fake that is merely incomplete reads as a green test.
   */
  single() {
    this.maybe = false
    this.single_ = true
    return this
  }

  range(from: number, to: number) {
    this.rangeFrom = from
    this.rangeTo = to
    return this
  }

  gte(column: string, value: unknown) {
    this.filters.push([column, "gte", value])
    return this
  }

  lte(column: string, value: unknown) {
    this.filters.push([column, "lte", value])
    return this
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  then<R1 = any, R2 = never>(
    resolve?: ((value: { data: unknown; error: unknown }) => R1 | PromiseLike<R1>) | null,
    reject?: ((reason: unknown) => R2 | PromiseLike<R2>) | null
  ): PromiseLike<R1 | R2> {
    return Promise.resolve(this.run()).then(resolve, reject)
  }

  private run(): { data: unknown; error: unknown; count?: number } {
    const forced = this.failures.get(this.table)
    if (forced) {
      this.failures.delete(this.table)
      this.record(0)
      return { data: null, error: { message: forced, code: "FORCED" } }
    }

    const selected = this.rows.filter((row) => matches(row, this.filters))

    if (this.op === "insert") {
      const incoming = Array.isArray(this.payload) ? this.payload : [this.payload as Row]
      const created = incoming.map((row, offset) => ({
        id: `generated-${this.rows.length + offset + 1}`,
        ...row,
      }))

      // Primary-key uniqueness, enforced rather than assumed. Postgres raises
      // 23505 here, and `claimBillingEvent` reads exactly that code to decide a
      // Stripe event is a repeat delivery. A fake that quietly appended a
      // second row would let the idempotency test pass against a service that
      // had none.
      const clash = created.find((row) =>
        this.rows.some((existing) => existing.id === row.id)
      )

      if (clash) {
        this.record(0)
        return {
          data: null,
          error: {
            code: "23505",
            message: `duplicate key value violates unique constraint on ${this.table}`,
          },
        }
      }

      this.rows.push(...created)
      this.record(created.length)
      return this.shape(created)
    }

    if (this.op === "update") {
      for (const row of selected) Object.assign(row, this.payload)
      this.record(selected.length)
      return this.shape(selected)
    }

    if (this.op === "delete") {
      this.db[this.table] = this.rows.filter((row) => !matches(row, this.filters))
      this.record(selected.length)
      return this.shape(selected)
    }

    let result = [...selected]

    if (this.orderBy) {
      const { column, ascending } = this.orderBy
      result.sort((a, b) => {
        const left = a[column] as number | string
        const right = b[column] as number | string
        if (left === right) return 0
        return (left < right ? -1 : 1) * (ascending ? 1 : -1)
      })
    }

    if (this.limitTo !== null) result = result.slice(0, this.limitTo)
    if (this.rangeFrom !== null && this.rangeTo !== null) {
      result = result.slice(this.rangeFrom, this.rangeTo + 1)
    }

    this.record(result.length)

    if (this.headOnly) return { data: null, error: null, count: result.length }

    return this.shape(result)
  }

  private shape(rows: Row[]) {
    if (this.single_) {
      if (rows.length === 0) {
        return this.maybe
          ? { data: null, error: null }
          : { data: null, error: { message: "No rows found", code: "PGRST116" } }
      }
      return { data: rows[0], error: null }
    }
    return { data: this.wantsReturn || this.op === "select" ? rows : null, error: null }
  }

  private record(rowsTouched: number) {
    this.log.push({
      table: this.table,
      op: this.op,
      filters: this.filters.map(([c, o, v]) => [c, o, v] as [string, string, unknown]),
      rowsTouched,
    })
  }
}

export function createFakeSupabase(seed: Tables = {}): FakeSupabase {
  const db: Tables = structuredClone(seed)
  const log: Statement[] = []
  const failures = new Map<string, string>()

  return {
    from: (table: string) => new Builder(table, db, log, failures),
    log,
    tables: db,
    failNext: (table, message) => failures.set(table, message),
  }
}

/** Rows the tenancy suite shares, so "the other DJ's set" means one thing. */
export const OWNER = "profile-owner"
export const STRANGER = "profile-stranger"

export function seedTwoOwners(): Tables {
  return {
    playlists: [
      {
        id: "playlist-owned",
        user_id: OWNER,
        name: "Warm-up",
        genre: "techno",
        context: "opening",
        custom_context: null,
        custom_genre: null,
      },
      {
        id: "playlist-foreign",
        user_id: STRANGER,
        name: "Someone else's night",
        genre: "techno",
        context: "main",
        custom_context: null,
        custom_genre: null,
      },
    ],
    // Two tracks in the owned playlist on purpose: `moveTrack` returns early
    // when the target index falls outside the list, so a single-track seed
    // would let it pass without ever reaching a write.
    tracks: [
      {
        id: "track-owned-1",
        playlist_id: "playlist-owned",
        position: 1,
        name: "Opener",
        artist: "X",
        bpm: 124,
        energy_score: 4,
      },
      {
        id: "track-owned-2",
        playlist_id: "playlist-owned",
        position: 2,
        name: "Second",
        artist: "X",
        bpm: 126,
        energy_score: 5,
      },
      {
        id: "track-foreign",
        playlist_id: "playlist-foreign",
        position: 1,
        name: "Theirs",
        artist: "Y",
        bpm: 130,
        energy_score: 7,
      },
    ],
  }
}
