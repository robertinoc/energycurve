import { expect, test } from "@playwright/test"

import { asCsv, syntheticPlaylist } from "../tests/fixtures/playlists"
import { accountFor, skipReason, storageStatePath } from "./helpers/accounts"
import { registryFor } from "./helpers/cleanup"
import { DEV_DB_SKIP_REASON, devDb, devDbConfigured } from "./helpers/dev-db"
import { importPlaylist } from "./helpers/import-playlist"

/**
 * Banco UX.4: access revoked while the other DJ is looking.
 *
 * Two sessions at once. The PRO+ account owns a set and shares it (sharing is
 * gated on the owner's plan, `b2b_sets`); the PRO account opens it and stays on
 * the page. The owner revokes from their own page, through the same control a
 * person uses, and then the collaborator — still holding a page rendered while
 * they had access — tries to write.
 *
 * What has to hold, in the order it matters:
 *
 * 1. **Nothing lands.** The suggestion sent from the stale page is refused by
 *    the server and no row is written. This is the security half and the one
 *    that may never regress.
 * 2. **The page does not break.** The collaborator gets a message, not an
 *    error boundary or a blank screen.
 * 3. **The next load says the set is gone**: the dashboard's own 404 ("That set isn't here"), like any set that
 *    does not exist (on purpose — see `getSharedPlaylist`), and it leaves the
 *    "shared with me" list.
 *
 * The *wording* of the message in (2) is not asserted. Today a revoked
 * collaborator is told "Something went wrong while saving. Please try again."
 * — `addSuggestionAction` maps `no_access` to the generic error — which is
 * honest that nothing was saved and wrong that trying again could help. That
 * is written down as a finding (docs/qa/automatizacion-banco-2026-10.md) and
 * the text B saw is attached to this test's report, so whoever reads it can
 * see the gap without re-running anything.
 */

const owner = accountFor("proPlus")
const collaborator = accountFor("pro")

test("UX.4 · a share revoked while the collaborator watches: nothing lands, the page holds, the set is gone", async ({
  page,
  browser,
}, testInfo) => {
  test.skip(testInfo.project.name !== "auth-proPlus", "Runs once, as the PRO+ owner.")
  test.skip(!owner, skipReason("proPlus"))
  test.skip(!collaborator, skipReason("pro"))
  test.skip(!devDbConfigured(), DEV_DB_SKIP_REASON)

  const created = registryFor("proPlus", owner!.email)
  const setName = "ux4-revoke"
  const guest = await browser.newContext({ storageState: storageStatePath("pro") })

  try {
    const ownerUrl = await importPlaylist(
      page,
      {
        name: `${setName}.csv`,
        mimeType: "text/csv",
        contents: asCsv(syntheticPlaylist({ length: 10 })),
      },
      created
    )
    const playlistId = /\/dashboard\/playlists\/([0-9a-f-]{36})/.exec(ownerUrl)![1]

    // A shares with B, through the panel on the owner's page.
    const invite = page.getByRole("textbox", { name: /^(Shared with|Compartido con)$/ })
    await invite.fill(collaborator!.email)
    await page.getByRole("button", { name: /^(Share|Compartir)$/ }).click()
    const removeB = page.getByRole("button", {
      name: new RegExp(`^(Remove|Quitar) ${collaborator!.email.replace(/[.+]/g, "\\$&")}$`, "i"),
    })
    await expect(removeB, "the collaborator is listed after the invite").toBeVisible()

    // B opens it and stays on it.
    const guestPage = await guest.newPage()
    await guestPage.goto(`/dashboard/shared/${playlistId}`)
    await guestPage.waitForLoadState("networkidle")
    const heading = guestPage.getByRole("heading", { level: 1 })
    await expect(heading, "B reads the shared set").not.toHaveText(/That set isn't here|Ese set no está acá/)
    await expect(guestPage.getByText(owner!.email, { exact: false }).first()).toBeVisible()

    // A revokes while B is looking.
    await removeB.click()
    await expect(removeB, "the collaborator left the owner's list").toHaveCount(0)

    const { count: grants } = await devDb()
      .from("set_collaborators")
      .select("id", { count: "exact", head: true })
      .eq("playlist_id", playlistId)
    expect(grants, "the grant is gone from the database").toBe(0)

    // B, on the page rendered before the revocation, tries to write.
    const thread = guestPage.locator("section").filter({
      has: guestPage.getByRole("textbox", { name: /^(Suggestions|Sugerencias)$/ }),
    })
    await thread.getByRole("textbox").fill("UX.4: written after the revocation")
    await thread.getByRole("button", { name: /^(Send|Enviar)$/ }).click()

    // Not getByRole("alert"): Next's route announcer carries that role too (§5).
    const message = thread.locator('p[role="alert"]')
    await expect(message, "B is told something, rather than nothing").toBeVisible({ timeout: 15_000 })
    await testInfo.attach("message B saw after the revocation", {
      body: await message.innerText(),
      contentType: "text/plain",
    })
    await expect(heading, "the page did not break under B").toBeVisible()

    const { count: written } = await devDb()
      .from("set_suggestions")
      .select("id", { count: "exact", head: true })
      .eq("playlist_id", playlistId)
    expect(written, "nothing B sent after the revocation was saved").toBe(0)

    // The next load: the set is gone, the same way a set that never existed is.
    // The page, not the status code: the dashboard streams, and a streamed
    // notFound() can arrive after a 200 has gone out. The status is attached.
    const reload = await guestPage.goto(`/dashboard/shared/${playlistId}`)
    await testInfo.attach("status of the reload after the revocation", {
      body: String(reload?.status()),
      contentType: "text/plain",
    })
    await expect(
      guestPage.getByRole("heading", { level: 1 }),
      "a revoked set answers like a nonexistent one"
    ).toContainText(/That set isn't here|Ese set no está acá/)

    await guestPage.goto("/dashboard/shared")
    await guestPage.waitForLoadState("networkidle")
    await expect(
      guestPage.locator(`a[href*="${playlistId}"]`),
      "the set left B's shared-with-me list"
    ).toHaveCount(0)
  } finally {
    await guest.close()
    // Cascades to set_collaborators and set_suggestions.
    await created.deleteAll()
  }
})
