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

describe("every migration can be checked against a live database", () => {
  /**
   * The property that keeps `scripts/migration-status.mjs` able to answer.
   *
   * There is no migrations table, so the script infers applied-ness from the
   * schema: it reads each file for what it creates and asks the database
   * whether those things are there. A migration that creates nothing
   * detectable — a pure backfill, a changed default — cannot be probed, and the
   * script reports it `unknown`.
   *
   * `unknown` is the dangerous verdict. It is the one a reader rounds up to
   * "fine", which is exactly the reflex that let 0018, 0019 and 0021 sit
   * unapplied. Four migrations were unprobeable when the script was first
   * written and each one taught it a new probe (enum types, enum values, an RLS
   * backfill, a dropped not-null). All 31 are answerable now, and this test is
   * what stops the 32nd quietly giving that up.
   *
   * If it fails on a migration you are adding: that is the review conversation,
   * not a test to relax. Either the migration can carry something checkable, or
   * `deriveProbes` needs to learn the construct — the way it learned the other
   * four.
   */
  it("creates something the status script can look for", async () => {
    const { deriveProbes } = await import("../scripts/migration-status.mjs")

    const unprobeable = migrations
      .filter((migration) => {
        const probes = deriveProbes(migration.sql)

        return (
          probes.tables.length === 0 &&
          probes.columns.length === 0 &&
          probes.indexes.length === 0 &&
          probes.types.length === 0 &&
          probes.enumValues.length === 0 &&
          probes.rlsEnabled.length === 0 &&
          probes.nullable.length === 0
        )
      })
      .map((migration) => migration.file)

    expect(
      unprobeable,
      "these would report `unknown`, which reads as `fine` — see scripts/migration-status.mjs"
    ).toEqual([])
  })

  it("reads the constructs this repo actually uses", async () => {
    // Guards the extractor itself rather than its output. A regex that silently
    // stops matching turns every migration into `unknown` at once, and the
    // suite above would still pass if the *reason* were that nothing parses.
    const { deriveProbes } = await import("../scripts/migration-status.mjs")

    const byFile = (name: string) =>
      deriveProbes(migrations.find((m) => m.file.startsWith(name))!.sql)

    // A column added across two source lines — the shape that made a
    // single-line pattern find nothing while looking like it worked.
    expect(byFile("0018").columns).toEqual([
      { table: "profiles", column: "preferred_locale" },
    ])
    expect(byFile("0021").columns).toEqual([
      { table: "tracks", column: "audio_features" },
    ])
    expect(byFile("0019").tables).toContain("curve_templates")
    expect(byFile("0002").types).toContain("playlist_context")
    expect(byFile("0005").enumValues).toContainEqual({
      type: "playlist_genre",
      value: "trance",
    })
    expect(byFile("0020").rlsEnabled).toContain("billing_events")
    expect(byFile("0028").nullable).toContainEqual({
      table: "analyses",
      column: "curve",
    })
  })

  it("has the CLI config the runner needs", () => {
    // This assertion used to read `expect(hasRunner).toBe(false)` and was
    // correct: there was no config, no seed and no runner, and it was written
    // as a test so the gap would be read rather than assumed. It is inverted
    // rather than deleted so the history stays legible — the absence was the
    // finding, and the presence is the fix.
    const files = readdirSync(join(process.cwd(), "supabase"))

    expect(files).toContain("config.toml")
    expect(files).toContain("seed.sql")
  })
})

describe("the seed is safe to hand to anyone", () => {
  /**
   * Comments stripped before anything is counted.
   *
   * This file already learned the lesson once — `tablesCreatedIn` strips them
   * because migrations discuss `drop table` in prose — and the first version of
   * these three tests forgot it and failed on its own documentation: the header
   * says "every insert" and contains an apostrophe, so the insert count was one
   * too high and the email scan matched a sentence between two apostrophes.
   */
  const seed = readFileSync(join(process.cwd(), "supabase", "seed.sql"), "utf8")
    .replace(/^\s*--.*$/gm, "")

  it("can be run twice", () => {
    // It gets pasted by hand, like the migrations, so someone will paste it
    // twice. Every insert has to say what happens then.
    const inserts = (seed.match(/insert\s+into/gi) ?? []).length
    const guards = (seed.match(/on\s+conflict/gi) ?? []).length

    expect(inserts).toBeGreaterThan(0)
    expect(guards, "every insert needs an on-conflict clause").toBe(inserts)
  })

  it("invents its people instead of borrowing them", () => {
    // `example.com` is reserved by RFC 2606 and cannot route anywhere. A real
    // address in a fixture is a real inbox that eventually receives something.
    const emails = [...seed.matchAll(/'([^']*@[^']*)'/g)].map((m) => m[1])

    expect(emails.length).toBeGreaterThan(0)
    for (const email of emails) {
      expect(email, email).toMatch(/@example\.com$/)
    }
  })

  it("covers the case the product is most likely to get wrong", () => {
    // Not decoration. The rule that separates this product from a chart library
    // is that it says which part of a curve is data and which part is a guess,
    // and a seed with only fully-tagged tracks can never exercise it.
    //
    // Asserted on the shape of the insert, not on the presence of `null, null`
    // somewhere in the file. The first version checked for two adjacent nulls
    // and stayed green when the fully-untagged track was given tags, because a
    // *partially* tagged row a hundred lines away still had two — it was
    // matching the file, not the claim.
    const trackInserts = [
      ...seed.matchAll(/insert\s+into\s+public\.tracks\s*([\s\S]*?)\bvalues\b/gi),
    ].map((match) => match[1])

    expect(trackInserts.length).toBeGreaterThan(1)

    // One whole playlist whose tracks carry no tag columns at all.
    expect(
      trackInserts.some((columns) => !/\bbpm\b/.test(columns)),
      "no fully untagged playlist: the curve-is-a-guess path is unseeded"
    ).toBe(true)

    // And, separately, a row inside a tagged insert that is missing them —
    // the mixture, which is what a real import looks like.
    expect(
      /'Nothing Known',\s*null,\s*null,\s*null/.test(seed),
      "no partially tagged row: the mixed case is unseeded"
    ).toBe(true)
  })
})
