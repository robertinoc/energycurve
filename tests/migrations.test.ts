import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Conventions the migration set has to hold, checked without a database.
 *
 * This exists because the schema's own rules have been broken three times and
 * nothing noticed until someone went looking. `docs/decisions.md` (decision 22)
 * says every table ships with RLS enabled and zero policies — default-deny for
 * `anon` and `authenticated` — and `billing_events`, `playlist_versions` and
 * `curve_templates` all shipped without it. Migration `0020` exists only to
 * backfill what a test like this would have caught at review time.
 *
 * These are static checks on the SQL text. They cannot tell you a migration was
 * *applied* — that needs a live database, and the fact that nothing in this
 * repo can tell you either is itself a finding (the 0021 migration is missing
 * from dev right now). What they can do is stop the next omission reaching a
 * file at all.
 */

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations")

interface Migration {
  file: string
  number: number
  sql: string
  /** Lowercased and stripped of `--` comments, for pattern checks. */
  code: string
}

const migrations: Migration[] = readdirSync(MIGRATIONS_DIR)
  .filter((file) => file.endsWith(".sql"))
  .sort()
  .map((file) => {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8")

    return {
      file,
      number: Number(file.slice(0, 4)),
      sql,
      // Comments are where the *reasoning* lives in this repo, and several
      // migrations discuss `drop table` in prose while doing nothing of the
      // kind. Reading prose as code is a false positive that teaches people to
      // ignore the test.
      code: sql
        .replace(/^\s*--.*$/gm, "")
        .toLowerCase(),
    }
  })

/** Tables created by a given migration. */
function tablesCreatedIn(migration: Migration): string[] {
  const matches = migration.code.matchAll(
    /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-z_]+)/g
  )

  return [...matches].map((match) => match[1])
}

describe("the set is coherent", () => {
  it("finds the migrations", () => {
    // A path change that matched nothing would make every assertion below pass
    // vacuously, which is the failure mode of any test that walks a directory.
    expect(migrations.length).toBeGreaterThan(20)
  })

  it("numbers every migration uniquely", () => {
    // Two people writing `0025_` in the same week is the ordinary way this
    // breaks, and the loser's migration is silently skipped by anyone applying
    // them in sorted order.
    const numbers = migrations.map((migration) => migration.number)
    const duplicates = numbers.filter(
      (number, index) => numbers.indexOf(number) !== index
    )

    expect(duplicates).toEqual([])
  })

  it("leaves no gaps in the sequence", () => {
    // A gap means a migration was deleted after being written, and anyone who
    // already applied it now has a schema nobody else has.
    const numbers = migrations.map((migration) => migration.number).sort((a, b) => a - b)

    for (const [index, number] of numbers.entries()) {
      expect(number, `gap before ${migrations[index].file}`).toBe(index + 1)
    }
  })

  it("names every file <number>_<description>.sql", () => {
    for (const migration of migrations) {
      expect(migration.file, migration.file).toMatch(/^\d{4}_[a-z0-9_]+\.sql$/)
    }
  })
})

describe("every new table gets the default-deny posture", () => {
  it("enables row level security in the same migration that creates it", () => {
    // Decision 22: RLS on, zero policies. Every query runs through the
    // service-role client, which bypasses RLS by design — so this is the guard
    // for the day a browser client or an anon key is introduced, and the only
    // moment to add it is when the table is born.
    //
    // Three tables shipped without it and needed migration 0020 to backfill.
    const missing: string[] = []

    for (const migration of migrations) {
      for (const table of tablesCreatedIn(migration)) {
        const enabled = new RegExp(
          `alter\\s+table\\s+(?:public\\.)?${table}\\s+enable\\s+row\\s+level\\s+security`
        ).test(migration.code)

        // 0020 is the backfill itself: it enables RLS on tables created
        // earlier, which is the exception that proves the rule.
        const backfilledElsewhere = migrations.some(
          (other) =>
            other.number > migration.number &&
            new RegExp(
              `alter\\s+table\\s+(?:public\\.)?${table}\\s+enable\\s+row\\s+level\\s+security`
            ).test(other.code)
        )

        if (!enabled && !backfilledElsewhere) {
          missing.push(`${table} (${migration.file})`)
        }
      }
    }

    expect(
      missing,
      "these tables ship without RLS — see decision 22 in docs/decisions.md"
    ).toEqual([])
  })
})

describe("migrations are safe to apply by hand", () => {
  it("is idempotent, because they are run manually and get re-run", () => {
    // Nobody tracks which migrations have been applied to which environment.
    // Someone will paste the same file twice, and the only defence is that
    // doing so is harmless.
    const notIdempotent: string[] = []

    for (const migration of migrations) {
      const creates = migration.code.match(/create\s+(table|index|type|unique\s+index)/g) ?? []
      const guarded = migration.code.match(/create\s+(?:unique\s+)?(?:table|index|type)\s+if\s+not\s+exists/g) ?? []
      const adds = migration.code.match(/add\s+column(?!\s+if\s+not\s+exists)/g) ?? []

      // `create type` has no `if not exists`; it is wrapped in a do-block
      // instead, which this counts as guarded.
      const wrapped = migration.code.includes("do $$") || migration.code.includes("do $")

      if ((creates.length > guarded.length && !wrapped) || adds.length > 0) {
        notIdempotent.push(migration.file)
      }
    }

    expect(
      notIdempotent,
      "re-running these would error; use `if not exists` or a do-block"
    ).toEqual([])
  })

  it("never drops or truncates anything", () => {
    // A rollback reverts the code and not the schema (see
    // docs/runbooks/deploy-and-rollback.md). A migration that dropped a column
    // would leave the previous release running against a schema it cannot use,
    // and there is nothing to roll the schema back with.
    const destructive: string[] = []

    for (const migration of migrations) {
      if (/\b(drop\s+table|drop\s+column|truncate)\b/.test(migration.code)) {
        destructive.push(migration.file)
      }
    }

    expect(
      destructive,
      "additive only — a rollback reverts code, never schema"
    ).toEqual([])
  })

  it("does not read a `drop table` written in a comment as one", () => {
    // The stripper earns its place: several migrations discuss what they are
    // *not* doing, and a check that reads prose as code is a check people learn
    // to argue with.
    const sample = migrations.find((migration) =>
      /--.*drop/i.test(migration.sql)
    )

    if (sample) {
      expect(/\b(drop\s+table|drop\s+column)\b/.test(sample.code)).toBe(false)
    }
  })
})

describe("what this cannot tell you", () => {
  it("says nothing about whether a migration was applied", () => {
    // Written as a test so the limitation is read rather than assumed. There is
    // no migrations table, no runner, and no record of what any environment
    // has. On 2026-09-11 migration 0021 was verified absent from dev — the
    // spectral features it adds were simply not being persisted, and nothing
    // failed loudly.
    //
    // Closing that gap needs a live check, which is the "Bootstrap reproducible
    // de la base de datos de dev" task, not this file.
    const hasRunner =
      readdirSync(join(process.cwd(), "supabase")).includes("config.toml")

    expect(hasRunner).toBe(false)
  })
})
