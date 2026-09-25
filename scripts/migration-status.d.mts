/**
 * Types for the two functions `scripts/migration-status.mjs` exports for the
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
}

export interface Migration extends MigrationProbes {
  file: string
  number: number
}

/** Everything a migration creates that can later be looked for in a schema. */
export function deriveProbes(sql: string): MigrationProbes

/** The migration files, in the order they are meant to be applied. */
export function readMigrations(dir?: string): Migration[]
