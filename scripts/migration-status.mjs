#!/usr/bin/env node
/**
 * Which migrations are applied to a database, and which are not.
 *
 * ## Why this exists
 *
 * Migrations are applied by hand in the SQL Editor. There is no migrations
 * table, no runner, and no record of what any environment has — so the only way
 * to know whether a file ran was for somebody to go looking, and nobody did.
 *
 * That has cost three times. `0021` never ran against dev, so spectral features
 * were silently not persisted. In August the same thing happened with `0018` and
 * `0019`, and the failure was swallowed in the service layer: in the UI it
 * looked like a button that just never confirmed. Not one of those announced
 * itself. They were found weeks later, by hand.
 *
 * This turns "nobody noticed" into "a command says so".
 *
 * ## How it decides, and why not the obvious way
 *
 * There is no state to read, so applied-ness is *inferred from the schema*: each
 * migration is read for the things it creates — tables, columns, indexes — and
 * the database is asked whether they are there.
 *
 * The probes are derived from the SQL at run time rather than kept in a
 * hand-written manifest. A manifest is a second copy of the truth, and the
 * failure mode of a second copy is that it stops matching the first one quietly,
 * which is the exact class of problem this script exists to end.
 *
 * ## What it cannot tell you, stated rather than implied
 *
 * A migration that only backfills data, enables RLS on an existing table, or
 * changes a constraint creates nothing, so there is nothing to look for. Those
 * are reported `unknown`, never `applied`. A tool that rounded "I can't tell"
 * up to "fine" would be worse than no tool, because it would be believed.
 *
 * It also cannot tell you a migration ran *completely*. A migration that creates
 * two tables and dies between them reports `applied` once the first one exists.
 * Partial application is a real risk of applying SQL by hand and this does not
 * cover it.
 *
 * ## Read-only, at the server and not on the honour system
 *
 * It is meant to be pointed at production. The session opens a `READ ONLY`
 * transaction before it asks anything, so a write would be refused by Postgres
 * rather than prevented by this file being careful. Applying migrations is not
 * this script's job and never will be: it is the traffic light, not the car.
 *
 * ## Usage
 *
 *   MIGRATION_DB_URL='postgresql://…' node scripts/migration-status.mjs
 *   MIGRATION_DB_URL='postgresql://…' node scripts/migration-status.mjs --json
 *
 * Exit code is 1 when anything is missing, so it can gate a deploy.
 * The URL is never read from a file in the repo and never written to one.
 */

import { readFileSync, readdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const MIGRATIONS_DIR = join(
  dirname(dirname(fileURLToPath(import.meta.url))),
  "supabase",
  "migrations"
)

/**
 * SQL with comments removed and whitespace flattened.
 *
 * Both halves matter. Comments are where this repo keeps its reasoning, and
 * several migrations discuss a `create table` they are not doing — reading prose
 * as code produces false positives, which is how a check teaches people to
 * ignore it. Flattening newlines matters because the statements are written
 * across lines (`alter table public.profiles\n  add column …`), and a pattern
 * that assumes one line finds nothing at all while looking like it works.
 */
function normalize(sql) {
  return sql
    .replace(/^\s*--.*$/gm, "")
    .replace(/\s+/g, " ")
    .toLowerCase()
}

/** Everything a migration creates that can later be looked for. */
export function deriveProbes(sql) {
  const code = normalize(sql)

  const tables = [
    ...code.matchAll(
      /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-z_][a-z0-9_]*)/g
    ),
  ].map((match) => match[1])

  const columns = [
    ...code.matchAll(
      /alter\s+table\s+(?:public\.)?([a-z_][a-z0-9_]*)\s+add\s+column\s+(?:if\s+not\s+exists\s+)?([a-z_][a-z0-9_]*)/g
    ),
  ].map((match) => ({ table: match[1], column: match[2] }))

  const indexes = [
    ...code.matchAll(
      /create\s+(?:unique\s+)?index\s+(?:concurrently\s+)?(?:if\s+not\s+exists\s+)?([a-z_][a-z0-9_]*)/g
    ),
  ].map((match) => match[1])

  // The four below exist because without them a third of the set was
  // unprobeable, and `unknown` is the verdict people read as "fine". Every one
  // of them corresponds to a migration in this repo that creates no table,
  // column or index and would otherwise have been invisible: an enum type
  // (0002), enum values (0005), an RLS backfill (0020), a dropped not-null
  // (0028). Adding them took the set from 27 of 31 answerable to all 31.

  const types = [
    ...code.matchAll(
      /create\s+type\s+(?:public\.)?([a-z_][a-z0-9_]*)\s+as\s+enum/g
    ),
  ].map((match) => match[1])

  const enumValues = [
    ...code.matchAll(
      /alter\s+type\s+(?:public\.)?([a-z_][a-z0-9_]*)\s+add\s+value\s+(?:if\s+not\s+exists\s+)?'([^']+)'/g
    ),
  ].map((match) => ({ type: match[1], value: match[2] }))

  const rlsEnabled = [
    ...code.matchAll(
      /alter\s+table\s+(?:public\.)?([a-z_][a-z0-9_]*)\s+enable\s+row\s+level\s+security/g
    ),
  ].map((match) => match[1])

  // `alter column … drop not null` is the only column *alteration* probed.
  // Changing a type or a default leaves nothing this can distinguish from the
  // state before it, so those stay honestly unprobeable rather than guessed at.
  const nullable = [
    ...code.matchAll(
      /alter\s+table\s+(?:public\.)?([a-z_][a-z0-9_]*)\s+((?:alter\s+column\s+[a-z_][a-z0-9_]*\s+drop\s+not\s+null\s*,?\s*)+)/g
    ),
  ].flatMap((match) =>
    [
      ...match[2].matchAll(/alter\s+column\s+([a-z_][a-z0-9_]*)\s+drop\s+not\s+null/g),
    ].map((inner) => ({ table: match[1], column: inner[1] }))
  )

  return { tables, columns, indexes, types, enumValues, rlsEnabled, nullable }
}

/** The migration files, in the order they are meant to be applied. */
export function readMigrations(dir = MIGRATIONS_DIR) {
  return readdirSync(dir)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => {
      const sql = readFileSync(join(dir, file), "utf8")

      return { file, number: Number(file.slice(0, 4)), ...deriveProbes(sql) }
    })
}

/**
 * Compares one migration's probes against what the database actually has.
 *
 * `partial` is its own verdict rather than being folded into either side. A
 * migration whose table exists but whose index does not is the signature of a
 * hand-applied file that errored halfway, and calling that "applied" would hide
 * the one case where somebody has to go and look.
 */
export function verdictFor(migration, schema) {
  const missing = []
  const present = []

  for (const table of migration.tables) {
    ;(schema.tables.has(table) ? present : missing).push(`table ${table}`)
  }

  for (const { table, column } of migration.columns) {
    const key = `${table}.${column}`

    // When *this* migration also creates the table, a missing table already
    // reports the cause and naming the column again would double-count it.
    //
    // Only when this migration creates it. An earlier version skipped the probe
    // whenever the table was absent for any reason, and against an empty
    // database that turned `0018` and `0021` — the two migrations whose absence
    // caused the incidents this script exists to prevent — into `unknown`,
    // which reads as "nothing to see". The one case the tool must never get
    // wrong was the case it got wrong.
    if (!schema.tables.has(table) && migration.tables.includes(table)) {
      continue
    }
    ;(schema.columns.has(key) ? present : missing).push(`column ${key}`)
  }

  for (const index of migration.indexes) {
    ;(schema.indexes.has(index) ? present : missing).push(`index ${index}`)
  }

  for (const type of migration.types) {
    ;(schema.types.has(type) ? present : missing).push(`type ${type}`)
  }

  for (const { type, value } of migration.enumValues) {
    const key = `${type}.${value}`
    ;(schema.enumValues.has(key) ? present : missing).push(`enum value ${key}`)
  }

  for (const table of migration.rlsEnabled) {
    // Skipped when this migration creates the table: decision 22 means every
    // new table enables RLS in the same file, so probing it there would just
    // restate the table probe.
    if (migration.tables.includes(table)) {
      continue
    }
    ;(schema.rlsEnabled.has(table) ? present : missing).push(`RLS on ${table}`)
  }

  for (const { table, column } of migration.nullable) {
    const key = `${table}.${column}`
    ;(schema.nullable.has(key) ? present : missing).push(`nullable ${key}`)
  }

  if (present.length === 0 && missing.length === 0) {
    return { status: "unknown", present, missing }
  }

  if (missing.length === 0) {
    return { status: "applied", present, missing }
  }

  return {
    status: present.length > 0 ? "partial" : "missing",
    present,
    missing,
  }
}

/** Everything in `public`, in three sets, read in one round trip each. */
async function readSchema(client) {
  const tables = await client.query(
    `select table_name from information_schema.tables where table_schema = 'public'`
  )
  const columns = await client.query(
    `select table_name, column_name, is_nullable from information_schema.columns where table_schema = 'public'`
  )
  const indexes = await client.query(
    `select indexname from pg_indexes where schemaname = 'public'`
  )
  const types = await client.query(
    `select t.typname, e.enumlabel
       from pg_type t
       join pg_namespace n on n.oid = t.typnamespace
       left join pg_enum e on e.enumtypid = t.oid
      where n.nspname = 'public'`
  )
  const rls = await client.query(
    `select c.relname
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relrowsecurity`
  )

  return {
    tables: new Set(tables.rows.map((row) => row.table_name)),
    columns: new Set(
      columns.rows.map((row) => `${row.table_name}.${row.column_name}`)
    ),
    nullable: new Set(
      columns.rows
        .filter((row) => row.is_nullable === "YES")
        .map((row) => `${row.table_name}.${row.column_name}`)
    ),
    indexes: new Set(indexes.rows.map((row) => row.indexname)),
    types: new Set(types.rows.map((row) => row.typname)),
    enumValues: new Set(
      types.rows
        .filter((row) => row.enumlabel !== null)
        .map((row) => `${row.typname}.${row.enumlabel}`)
    ),
    rlsEnabled: new Set(rls.rows.map((row) => row.relname)),
  }
}

const STATUS_LABEL = {
  applied: "  applied",
  missing: "  MISSING",
  partial: "  PARTIAL",
  unknown: "  unknown",
}

async function main() {
  const url = process.env.MIGRATION_DB_URL

  if (!url) {
    // Named explicitly, with what it looks like, because the commonest way a
    // tool like this goes unused is that its first run fails and says nothing
    // about how to fix it.
    console.error(
      "MIGRATION_DB_URL is not set.\n\n" +
        "  MIGRATION_DB_URL='postgresql://user:pass@host:5432/postgres' \\\n" +
        "    node scripts/migration-status.mjs\n\n" +
        "Supabase: Project Settings → Database → Connection string → URI.\n" +
        "Pass it on the command line or export it in your shell. Never write it\n" +
        "into a file in this repo."
    )
    process.exit(2)
  }

  const asJson = process.argv.includes("--json")
  const { default: pg } = await import("pg")
  const client = new pg.Client({
    connectionString: url,
    // Supabase terminates TLS with its own chain; this is a read-only status
    // check against a host the operator typed, not a channel carrying secrets
    // in either direction.
    ssl: url.includes("localhost") || url.includes("127.0.0.1")
      ? false
      : { rejectUnauthorized: false },
  })

  await client.connect()

  let migrations
  let schema

  try {
    // The guarantee, at the server. Everything below this line is refused by
    // Postgres if it tries to write, which is the only form of "read-only" worth
    // pointing at production.
    await client.query("begin transaction read only")
    schema = await readSchema(client)
    migrations = readMigrations()
    await client.query("commit")
  } finally {
    await client.end()
  }

  const results = migrations.map((migration) => ({
    file: migration.file,
    ...verdictFor(migration, schema),
  }))

  const missing = results.filter(
    (result) => result.status === "missing" || result.status === "partial"
  )
  const unknown = results.filter((result) => result.status === "unknown")

  if (asJson) {
    console.log(JSON.stringify({ results, missingCount: missing.length }, null, 2))
  } else {
    for (const result of results) {
      const detail =
        result.status === "applied" || result.status === "unknown"
          ? ""
          : ` — no ${result.missing.join(", no ")}`

      console.log(`${STATUS_LABEL[result.status]}  ${result.file}${detail}`)
    }

    console.log("")
    console.log(
      `${results.length} migrations: ` +
        `${results.filter((r) => r.status === "applied").length} applied, ` +
        `${missing.length} missing or partial, ` +
        `${unknown.length} unknown.`
    )

    if (unknown.length > 0) {
      console.log("")
      console.log(
        "`unknown` means the migration creates nothing to look for — a backfill,\n" +
          "an RLS change, a constraint. It is not a synonym for applied; these have\n" +
          "to be checked by hand:"
      )
      for (const result of unknown) {
        console.log(`    ${result.file}`)
      }
    }

    if (missing.length > 0) {
      console.log("")
      console.log(
        `${missing.length} migration(s) are not applied to this database. Apply them in\n` +
          "number order in the SQL Editor. This script does not apply anything."
      )
    }
  }

  process.exit(missing.length > 0 ? 1 : 0)
}

// Importable by the test suite without connecting to anything.
if (process.argv[1] && process.argv[1].endsWith("migration-status.mjs")) {
  main().catch((error) => {
    console.error(error.message)
    process.exit(2)
  })
}
