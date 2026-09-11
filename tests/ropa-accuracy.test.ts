import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Makes the RoPA keep the promise it makes about itself.
 *
 * `docs/compliance/ropa.md` closes by saying it can be run against the database
 * to confirm no column holding personal data is missing from it — "la forma de
 * mantenerlo honesto es esa". Nothing was running it, and it had already
 * drifted: the verbatim library entry a track was imported from was stored in
 * three columns none of which the document named.
 *
 * A compliance document that nobody checks decays into the most expensive kind
 * of wrong — the kind that reads as authoritative in a due-diligence data room.
 * So the check is a test, and adding a column to one of these tables now forces
 * a decision: name it in the RoPA, or declare here that it isn't personal data.
 */

const ROPA = readFileSync(
  join(process.cwd(), "docs/compliance/ropa.md"),
  "utf8"
)

const MIGRATIONS = join(process.cwd(), "supabase/migrations")

/** Tables whose rows belong to an identifiable person. */
const PERSONAL_TABLES = ["profiles", "playlists", "tracks"] as const

/**
 * Columns that exist on those tables but hold no personal data — structural
 * keys, timestamps, and musical facts about a recording.
 *
 * Listed one by one rather than matched by pattern on purpose: a pattern would
 * quietly absorb the next column someone adds, which is the failure this test
 * exists to prevent. `source_uri` and `source_payload` are deliberately NOT
 * here — a Traktor LOCATION carries the DJ's own filesystem path, and a home
 * directory usually carries their name.
 */
const NOT_PERSONAL_DATA = new Set([
  // Keys and plumbing
  "id",
  "user_id",
  "playlist_id",
  "position",
  "created_at",
  "updated_at",
  "custom_context_id",
  "custom_genre_id",
  "target_template_id",
  // Facts about a recording, not about a person
  "artist",
  "name",
  "bpm",
  "musical_key",
  "energy_score",
  "duration_seconds",
  "perceived_db",
  "audio_features",
  "source_payload_format",
])

function columnsOf(table: string): Set<string> {
  const columns = new Set<string>()

  for (const file of readdirSync(MIGRATIONS).sort()) {
    const sql = readFileSync(join(MIGRATIONS, file), "utf8")

    const created = new RegExp(
      `create table if not exists public\\.${table}\\s*\\(([\\s\\S]*?)\\n\\);`,
      "i"
    ).exec(sql)

    if (created) {
      for (const line of created[1].split("\n")) {
        const name = /^\s*(\w+)\s+/.exec(line)?.[1]
        if (
          name &&
          !["primary", "unique", "constraint", "foreign", "check"].includes(
            name.toLowerCase()
          )
        ) {
          columns.add(name)
        }
      }
    }

    const altered = new RegExp(
      `alter table (?:if exists )?public\\.${table}([\\s\\S]*?);`,
      "gi"
    )

    for (const match of sql.matchAll(altered)) {
      for (const added of match[1].matchAll(/add column if not exists (\w+)/gi)) {
        columns.add(added[1])
      }
    }
  }

  return columns
}

describe("the RoPA names every column that holds personal data", () => {
  it.each(PERSONAL_TABLES)("%s", (table) => {
    const columns = columnsOf(table)

    // A table the regex can't read would pass vacuously, which is the one
    // outcome worse than failing.
    expect(columns.size).toBeGreaterThan(3)

    const undeclared = [...columns]
      .filter((column) => !NOT_PERSONAL_DATA.has(column))
      .filter((column) => !ROPA.includes(column))

    expect(
      undeclared,
      `These columns of "${table}" hold personal data but are not named in ` +
        `docs/compliance/ropa.md. Either add them to the relevant treatment, ` +
        `or add them to NOT_PERSONAL_DATA in this test with a reason. ` +
        `The RoPA says it can be verified against the schema; this is that check.`
    ).toEqual([])
  })
})

describe("the RoPA's gap list stays current", () => {
  /**
   * Asserts a gap is marked closed, NOT that its wording disappeared.
   *
   * The first version of this test banned the phrase outright and failed on the
   * correction itself: striking a gap through and marking it CERRADA keeps the
   * sentence on the page, and that is the right way to write a compliance
   * document — a reader who was told about a gap should be able to find what
   * happened to it rather than watch it vanish. A test that forbids the words
   * pushes the author to delete the history instead of dating it.
   */
  /**
   * Scoped to the numbered list under "Brechas", because the same wording also
   * appears inside the treatment tables above it — and reading the first match
   * anywhere in the file answered a question about T5 while claiming to answer
   * one about the gap list.
   */
  const GAP_LIST = ROPA.slice(ROPA.lastIndexOf("## Brechas"))

  function gapIsClosed(gap: string): boolean {
    const entry = GAP_LIST.split(/\n(?=\d+\. )/).find((line) =>
      line.includes(gap)
    )

    return Boolean(entry && /CERRADA/.test(entry) && entry.includes("~~"))
  }

  it("records the data export as closed rather than still missing", () => {
    // Shipped 11 Sep: GET /api/account/export. A gap list that still reports a
    // closed gap is how a compliance document loses the reader's trust in the
    // gaps that ARE still open.
    expect(gapIsClosed("Sin export de datos")).toBe(true)
  })

  it("records the consent banner as closed rather than still missing", () => {
    // Shipped 11 Sep in PR #182, with the reject-as-easy-as-accept test.
    expect(gapIsClosed("Sin banner de consentimiento")).toBe(true)
  })

  it("still reports the gaps that really are open", () => {
    // The other side of the same coin: a gap list nobody prunes is useless, and
    // a gap list that prunes too eagerly is dishonest. Self-serve deletion has
    // NOT shipped, so it must still read as open.
    expect(gapIsClosed("Sin borrado de cuenta self-serve")).toBe(false)
  })
})
