/**
 * Types for the functions `scripts/migration-status.mjs` exports for the
 * test suite. The script itself stays plain ESM: it is run with bare `node`,
 * against production among other places, and a build step between "I want to
 * know what is applied" and the answer is a step that gets skipped.
 */

export interface MigrationProbes {
  /** Tables created by the migration. */
  tables: string[]
  /** Columns added to a table that already exists. */
  columns: { table: string; column: string }[]
  indexes: string[]
  /** Enum types created with `create type … as enum`. */
  types: string[]
  /** Values added to an existing enum. */
  enumValues: { type: string; value: string }[]
  /** Tables this migration turns row level security on for. */
  rlsEnabled: string[]
  /** Columns this migration makes nullable. */
  nullable: { table: string; column: string }[]
  /**
   * Policies this migration removes. The one probe satisfied by an absence:
   * applied when the policy is gone.
   */
  policiesDropped: { policy: string; table: string }[]
  /** Constraints added with `add constraint` (lote 22). */
  constraints: { table: string; constraint: string }[]
  /** Functions created in `public` (lote 22). */
  functions: string[]
  /** Triggers created on a table (lote 22). */
  triggers: { table: string; trigger: string }[]
}

export interface Migration extends MigrationProbes {
  file: string
  number: number
}

/** Everything a migration creates that can later be looked for in a schema. */
export function deriveProbes(sql: string): MigrationProbes

/** The migration files, in the order they are meant to be applied. */
export function readMigrations(dir?: string): Migration[]

/** What a database has, as the sets `verdictFor` compares against. */
export interface SchemaSnapshot {
  tables: Set<string>
  columns: Set<string>
  indexes: Set<string>
  types: Set<string>
  enumValues: Set<string>
  rlsEnabled: Set<string>
  nullable: Set<string>
  policies: Set<string>
  constraints?: Set<string>
  functions?: Set<string>
  triggers?: Set<string>
}

export interface Verdict {
  status: "applied" | "missing" | "partial" | "unknown"
  present: string[]
  missing: string[]
}

/** One migration's probes against what the database has. */
export function verdictFor(migration: MigrationProbes, schema: SchemaSnapshot): Verdict

/** The same verdicts as one read-only `select` for the SQL Editor (lote 22). */
export function sqlReport(migrations: Migration[]): string
