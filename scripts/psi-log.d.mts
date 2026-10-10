/**
 * Types for what `scripts/psi-log.mjs` exports to the test suite. Plain ESM for
 * the same reason as the other scripts: the workflow runs it with bare `node`.
 */

type PsiResponse = Record<string, unknown>
type FetchLike = (url: string, init?: unknown) => Promise<{
  ok: boolean
  status: number
  statusText: string
  json(): Promise<unknown>
}>

export const LOG_PATH: string
export const KEY_ENV: string
export const URLS: string[]
export const LOG_HEADER: string

export function scrub(text: unknown, key: string | undefined): string
export function formatCell(response: PsiResponse): string
export function tableHeader(): string
export function formatRow(date: string, responses: PsiResponse[]): string
export function appendRow(existing: string, row: string): string
export function measure(path: string, key: string, fetchImpl?: FetchLike): Promise<PsiResponse>
export function run(options?: {
  env?: Record<string, string | undefined>
  fetchImpl?: FetchLike
  dryRun?: boolean
  now?: Date
}): Promise<number>
