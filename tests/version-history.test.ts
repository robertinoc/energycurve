import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

// The panel imports a server action, which drags `server-only` into a plain node
// render. Stubbed rather than restructuring the component: the action is a
// dependency of the button, not of the markup under test.
vi.mock("@/app/dashboard/playlists/actions", () => ({
  restoreVersionAction: vi.fn(),
}))

const { VersionHistory } = await import(
  "@/components/playlists/version-history"
)

const version = (
  overrides: Partial<Parameters<typeof VersionHistory>[0]["versions"][number]> = {}
) => ({
  id: "1",
  kind: "curated" as const,
  trackCount: 14,
  setScore: 7.4,
  createdAt: "2026-08-14T01:12:00Z",
  isCurrent: false,
  ...overrides,
})

const render = (props: Partial<Parameters<typeof VersionHistory>[0]> = {}) =>
  renderToStaticMarkup(
    VersionHistory({
      playlistId: "p1",
      versions: [version()],
      entitled: true,
      canMarkPlayed: true,
      locale: "en",
      ...props,
    })
  )

describe("VersionHistory", () => {
  it("never renders an undefined copy key, in either locale", () => {
    for (const locale of ["en", "es"] as const) {
      expect(render({ locale }), locale).not.toContain("undefined")
    }
  })

  it("labels each kind with its own name", () => {
    const html = render({
      versions: [
        version({ id: "a", kind: "imported" }),
        version({ id: "b", kind: "curated" }),
        version({ id: "c", kind: "ai" }),
        version({ id: "d", kind: "played" }),
      ],
    })

    expect(html).toContain("As imported")
    expect(html).toContain("Curated")
    expect(html).toContain("AI order")
    expect(html).toContain("As played")
  })

  it("offers no restore on the order the set is already in", () => {
    // Restoring where you already are does nothing, and offering it invites the
    // user to test whether we know what state their set is in.
    expect(render({ versions: [version({ isCurrent: true })] })).not.toContain(
      "Restore"
    )
    expect(render({ versions: [version({ isCurrent: false })] })).toContain(
      "Restore"
    )
  })

  it("marks the best score only when there is something to compare", () => {
    const single = render({ versions: [version({ setScore: 7.4 })] })
    const several = render({
      versions: [
        version({ id: "a", setScore: 6.8 }),
        version({ id: "b", setScore: 7.9 }),
      ],
    })

    // One version is not a comparison — "best score" on a list of one is noise.
    expect(single).not.toContain("Best score")
    expect(several).toContain("Best score")
  })

  it("says a version isn't scored rather than printing a bare zero", () => {
    const html = render({ versions: [version({ setScore: null })] })

    expect(html).toContain("not scored")
    expect(html).not.toContain(">0.0<")
  })

  it("shows the plan wall instead of the list when the reader isn't entitled", () => {
    const html = render({ entitled: false, versions: [version()] })

    expect(html).toContain("PRO")
    expect(html).toContain("/pricing")
    // And crucially, no version data leaks into the locked view.
    expect(html).not.toContain("Curated")
  })

  it("explains the empty state instead of showing a bare heading", () => {
    const html = render({ versions: [] })

    expect(html).toContain("Nothing here yet")
  })
})
