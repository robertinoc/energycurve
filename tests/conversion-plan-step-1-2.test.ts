import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * docs/conversion-plan.md is the source of truth two Claude accounts read, so
 * what it says about step 1.2 has to be what the code does. A plan that names
 * an event nobody emits, or a query over a column that does not exist, fails
 * the same way H-17 did: quietly, and looking like someone else's problem.
 */

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8")

const plan = read("docs/conversion-plan.md")
const section = plan.slice(plan.indexOf("## 6. Del import al análisis"))

describe("step 1.2 in the conversion plan", () => {
  it("is in the status table", () => {
    const row = plan.split("\n").find((line) => line.startsWith("| 1.2 |"))

    expect(row, "the 1.2 row").toBeTruthy()
    expect(row).toMatch(/Hecho en el código/)
  })

  it("records the baseline it was built against", () => {
    expect(section).toMatch(/105\s+playlists creadas/)
    expect(section).toMatch(/49 análisis\s+corridos/)
    expect(section).toContain("10/11/2026")
  })

  it("names the event the browser really sends, with its real properties", () => {
    const source = read("lib/analytics/analyze-cta-events.ts")
    const event = /capture\(\s*"([a-z_]+)"/.exec(source)?.[1]

    expect(event).toBeTruthy()
    expect(section).toContain(`\`${event}\``)

    const placements = [...source.matchAll(/"(header|next_step|import_summary)"/g)].map(
      (match) => match[1]
    )

    expect(new Set(placements).size).toBe(3)
    for (const placement of placements) {
      expect(section).toContain(`\`${placement}\``)
    }
  })

  it("names the two backstage events the baseline is counted from", () => {
    const reporting = read("lib/backstage/posthog-reporting.ts")

    for (const event of ["playlist_created", "analysis_completed"]) {
      expect(reporting).toContain(`'${event}'`)
      expect(section).toContain(`\`${event}\``)
    }
  })

  it("asks the database for columns it has", () => {
    const sql = section.slice(section.indexOf("```sql"), section.indexOf("```", section.indexOf("```sql") + 6))
    const analyses = read("supabase/migrations/0003_analyses.sql")

    expect(sql).toContain("from analyses a where a.playlist_id = p.id")
    expect(analyses).toMatch(/playlist_id uuid not null references public\.playlists/)
    expect(analyses).toMatch(/created_at timestamptz/)
    expect(sql).toContain("from playlists p")
    // Read-only: nothing in it writes.
    expect(sql).not.toMatch(/\b(insert|update|delete|alter|drop|truncate)\b/i)
  })
})
