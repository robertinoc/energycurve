import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * The paste-ready 0034 (lote 21).
 *
 * docs/runbooks/aplicar-migracion-0034.md carries the SQL Robertino pastes into
 * the production SQL Editor. A copy in a document drifts from the file it
 * copies; this keeps them the same text, and keeps the migration a no-op on a
 * database that already has it — which was checked against a real Postgres 16
 * (the constraint kept its oid across a second paste).
 */

const root = process.cwd()
const migration = readFileSync(
  join(root, "supabase/migrations/0034_profile_first_touch.sql"),
  "utf8"
)
const runbook = readFileSync(join(root, "docs/runbooks/aplicar-migracion-0034.md"), "utf8")

/** Every ```sql block in the runbook, in order. */
const sqlBlocks = [...runbook.matchAll(/```sql\n([\s\S]*?)```/g)].map((m) => m[1])

describe("the 0034 runbook", () => {
  it("pastes exactly the migration file, inside one transaction", () => {
    const paste = sqlBlocks[0]
    expect(paste.startsWith("begin;\n\n")).toBe(true)
    expect(paste.trimEnd().endsWith("commit;")).toBe(true)
    expect(paste).toContain(migration.trimEnd())
  })

  it("leaves a database that already has 0034 untouched", () => {
    // drop + add re-ran without error but rebuilt the constraint and re-checked
    // every profile on each paste. Added only when missing, instead.
    expect(migration).not.toMatch(/drop\s+constraint/i)
    expect(migration).toMatch(/if not exists \(\s*select 1 from pg_constraint/)
    expect(migration.match(/add column if not exists/g)).toHaveLength(7)
  })

  it("verifies all seven columns and the constraint, with one answer", () => {
    const verify = sqlBlocks[1]
    for (const column of [...migration.matchAll(/add column if not exists (\w+)/g)].map(
      (m) => m[1]
    )) {
      expect(verify, column).toContain(`'${column}'`)
    }
    expect(verify).toContain(") = 7")
    expect(verify).toContain("profiles_first_touch_format_check")
    expect(verify).toMatch(/'ESTÁ — 0034 aplicada/)
    expect(verify).toMatch(/'NO ESTÁ — /)
  })

  it("never carries a credential", () => {
    expect(runbook).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/) // a JWT, like a service role key
    expect(runbook).not.toMatch(/postgres(ql)?:\/\/[^'…\s]*:[^@'\s]+@/) // a URL with a password
  })
})
