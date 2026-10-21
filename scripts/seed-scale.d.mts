/**
 * Types for what `scripts/seed-scale.mjs` exports to the test suite. The script
 * stays plain ESM for the same reason `migration-status.mjs` does: it is run
 * with bare `node`, and a build step in front of it is a step that gets skipped.
 */

export const DEV_REF: string
export const PRODUCTION_REF: string
export const MARKER: { workosPrefix: string; emailDomain: string; descriptionPrefix: string }
export const GENRE_BPM: Record<string, [number, number]>
export const GENRES: string[]
export const CONTEXTS: string[]
export const CAMELOT: string[]

export function rng(seed: number): () => number
export function stableUuid(seed: number, label: string): string

type Row = Record<string, string | number | null>

export function generate(options: {
  seed: number
  users: number
  playlists: number
  tracks: number
  owners?: string[]
}): { profiles: Row[]; playlists: Row[]; tracks: Row[] }

export function fingerprint(rows: Row[]): string
export function assertDevTarget(url: string | undefined): void
export function schemaFromOpenApi(openapi: unknown): {
  tables: Set<string>
  columns: Set<string>
  types: Set<string>
  enumValues: Set<string>
}
export function restVerdicts(
  migrations: unknown[],
  schema: ReturnType<typeof schemaFromOpenApi>
): { results: { file: string; status: string; missing: string[] }[]; unseen: string[] }
export function parseArgs(argv: string[]): {
  command: string
  owners: string[]
  seed?: number
  users?: number
  playlists?: number
  tracks?: number
}
/** The `like` pattern for one seed's generated users, underscores escaped; all of them without a seed. */
export function seedProfilePattern(seed?: number): string
/** The `like` pattern for one seed's playlists; all of them without a seed. */
export function seedPlaylistPattern(seed?: number): string

/** Lote 20: the acquisition scenario for the backstage panel. */
export const ACQUISITION_EPOCH: number
export const ACQUISITION_WEEKS: number
export const ACQUISITION_USERS: number

export interface AcquisitionExpected {
  users: number
  perWeek: Record<string, number>
  bySource: Record<string, number>
  analysed: number
  never: number
  neverUsed: number
  importedOnly: number
  medianHoursToFirstAnalysis: number
  paid: number
  medianDaysToPay: number
  paidWithoutCheckout: number
  landedOnEnergyCurve: number
}

export function generateAcquisition(options: { seed: number; withFirstTouch: boolean }): {
  profiles: Row[]
  playlists: Array<{ id: string; user_id: string } & Row>
  analyses: Array<{ id: string; user_id: string; created_at: string } & Row>
  billingEvents: Array<{ id: string; profile_id: string; processed_at: string } & Row>
  expected: AcquisitionExpected
}
