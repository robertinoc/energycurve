#!/usr/bin/env node
/**
 * SEO-E31: the weekly Core Web Vitals log, automated (lote 19).
 *
 * The plan asked for six URLs against the PageSpeed Insights API every week,
 * written to docs/seo/cwv-log.md. It was an "external" task, and it never ran:
 * a weekly manual task nobody does is a line in a plan. This script is the run,
 * and `.github/workflows/cwv-log.yml` is the week.
 *
 *   PAGESPEED_API_KEY=… node scripts/psi-log.mjs            # appends one row
 *   PAGESPEED_API_KEY=… node scripts/psi-log.mjs --dry-run  # prints it instead
 *
 * Three rules, and why:
 *
 * - **No key, no row.** Without `PAGESPEED_API_KEY` it exits 1 and says what is
 *   missing. A log with blank rows is worse than a short log: it reads as
 *   "measured, nothing to report".
 * - **Nothing invented.** Every number is the API's. A URL the API fails on gets
 *   a cell that says so, with the API's own status and message. A URL with no
 *   field data says "sin datos de campo" rather than leaving the column empty.
 * - **All six failed means the run failed.** That is a key or quota problem, not
 *   a measurement, so nothing is written and the exit code is 1 — the workflow
 *   goes red, which is the point.
 *
 * The key never reaches the output: it is only ever placed in the request URL,
 * that URL is never printed, and every error message is scrubbed of it before
 * it is written anywhere.
 *
 * Plain ESM with no dependencies, like the other scripts here: it runs with
 * bare `node` on the workflow runner without an `npm ci` in front of it.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
export const LOG_PATH = join(ROOT, "docs/seo/cwv-log.md")
export const KEY_ENV = "PAGESPEED_API_KEY"
const ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"
const ORIGIN = "https://energycurve.app"

/**
 * The six. The first four are the pages Lighthouse CI already budgets
 * (lighthouserc.json), so the lab numbers here and there describe the same
 * pages; the last two are the free tool in each language, the one page a
 * stranger can use without an account.
 */
export const URLS = [
  "/",
  "/es",
  "/pricing",
  "/es/blog/antes-de-tocar-no-despues",
  "/tools/energy-curve",
  "/es/herramientas/curva-de-energia",
]

export const LOG_HEADER = `# Registro de Core Web Vitals — SEO-E31

Una fila por corrida, escrita por \`scripts/psi-log.mjs\` desde
\`.github/workflows/cwv-log.yml\` (lunes, semanal). **No se edita a mano.**

Cada celda es una URL, medida en **mobile** por la API de PageSpeed Insights:

- **Laboratorio** (Lighthouse en los servidores de Google, una corrida):
  LCP · CLS · TBT · puntaje de rendimiento sobre 100. Una sola corrida varía;
  mirá la tendencia de varias filas, no una.
- **Campo** (Chrome UX Report, usuarios reales, percentil 75 de 28 días):
  LCP · INP · CLS. «sin datos de campo» quiere decir que Chrome no tiene
  tráfico suficiente de esa URL ni del origen; «(origen)» quiere decir que el
  dato es del sitio entero, no de esa página.
- **error** es la respuesta de la API para esa URL, tal cual. No hay números
  inventados: lo que la API no devolvió, la celda no lo tiene.

`

/** Seconds with one decimal, from milliseconds. */
const seconds = (ms) => `${(ms / 1000).toFixed(1)} s`

/** Replace every occurrence of the key in a string. */
export function scrub(text, key) {
  return key ? String(text).split(key).join("***") : String(text)
}

/** One API response as a cell. Pure, so the format is testable without a key. */
export function formatCell(response) {
  if (response.error) {
    return `error ${response.error.code ?? "?"}: ${String(response.error.message ?? "sin mensaje").replace(/\|/g, "/").replace(/\s+/g, " ").slice(0, 120)}`
  }

  const audits = response.lighthouseResult?.audits ?? {}
  const value = (id) => audits[id]?.numericValue
  const lcp = value("largest-contentful-paint")
  const cls = value("cumulative-layout-shift")
  const tbt = value("total-blocking-time")
  const score = response.lighthouseResult?.categories?.performance?.score

  const lab = [
    lcp === undefined ? "LCP —" : `LCP ${seconds(lcp)}`,
    cls === undefined ? "CLS —" : `CLS ${cls.toFixed(2)}`,
    tbt === undefined ? "TBT —" : `TBT ${Math.round(tbt)} ms`,
    score === undefined || score === null ? "— /100" : `${Math.round(score * 100)}/100`,
  ].join(" · ")

  const field = response.loadingExperience
  const metrics = field?.metrics ?? {}
  const p75 = (id) => metrics[id]?.percentile
  const fLcp = p75("LARGEST_CONTENTFUL_PAINT_MS")
  const fInp = p75("INTERACTION_TO_NEXT_PAINT")
  const fCls = p75("CUMULATIVE_LAYOUT_SHIFT_SCORE")

  let fieldText = "sin datos de campo"
  if (fLcp !== undefined || fInp !== undefined || fCls !== undefined) {
    fieldText = [
      fLcp === undefined ? "LCP —" : `LCP ${seconds(fLcp)}`,
      fInp === undefined ? "INP —" : `INP ${fInp} ms`,
      // CrUX reports CLS multiplied by 100.
      fCls === undefined ? "CLS —" : `CLS ${(fCls / 100).toFixed(2)}`,
    ].join(" · ")
    if (field.origin_fallback) fieldText += " (origen)"
  }

  return `${lab}<br>campo: ${fieldText}`
}

/** The table header, with one column per URL. */
export function tableHeader() {
  return [
    `| Fecha (UTC) | Lighthouse | ${URLS.map((path) => `\`${path}\``).join(" | ")} |`,
    `|---|---|${URLS.map(() => "---").join("|")}|`,
  ].join("\n")
}

/** One run as one row. */
export function formatRow(date, responses) {
  const version =
    responses.find((r) => r.lighthouseResult?.lighthouseVersion)?.lighthouseResult
      .lighthouseVersion ?? "—"
  return `| ${date} | ${version} | ${responses.map(formatCell).join(" | ")} |`
}

/** The log with this row appended, creating the file's header if needed. */
export function appendRow(existing, row) {
  const base = existing && existing.trim() ? existing : `${LOG_HEADER}${tableHeader()}\n`
  return `${base.replace(/\n*$/, "\n")}${row}\n`
}

/** Asks the API about one URL. Errors come back as `{ error }`, never thrown. */
export async function measure(path, key, fetchImpl = fetch) {
  const params = new URLSearchParams({
    url: `${ORIGIN}${path}`,
    strategy: "mobile",
    category: "performance",
    key,
  })

  try {
    const response = await fetchImpl(`${ENDPOINT}?${params}`, {
      signal: AbortSignal.timeout(120_000),
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok || body.error) {
      return {
        error: {
          code: body.error?.code ?? response.status,
          message: scrub(body.error?.message ?? response.statusText, key),
        },
      }
    }
    return body
  } catch (error) {
    return { error: { code: "red", message: scrub(error?.message ?? error, key) } }
  }
}

export async function run({ env = process.env, fetchImpl = fetch, dryRun = false, now = new Date() } = {}) {
  const key = env[KEY_ENV]
  if (!key) {
    console.error(
      `Falta ${KEY_ENV}. Es la API key de PageSpeed Insights (Google Cloud → APIs y servicios → Credenciales). ` +
        `En GitHub va como secret del repo con ese mismo nombre. No se escribió ninguna fila.`
    )
    return 1
  }

  const responses = []
  for (const path of URLS) {
    responses.push(await measure(path, key, fetchImpl))
  }

  const failed = responses.filter((r) => r.error)
  if (failed.length === URLS.length) {
    console.error(
      `Las ${URLS.length} URLs fallaron; no se escribe la fila. Primer error: ${formatCell(failed[0])}`
    )
    return 1
  }

  const row = formatRow(now.toISOString().slice(0, 10), responses)
  if (dryRun) {
    console.log(row)
  } else {
    const existing = existsSync(LOG_PATH) ? readFileSync(LOG_PATH, "utf8") : ""
    writeFileSync(LOG_PATH, appendRow(existing, row))
    console.log(`Fila agregada a docs/seo/cwv-log.md (${URLS.length - failed.length} de ${URLS.length} URLs medidas).`)
  }
  return 0
}

if (process.argv[1] && process.argv[1].endsWith("psi-log.mjs")) {
  process.exitCode = await run({ dryRun: process.argv.includes("--dry-run") })
}
