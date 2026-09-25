import { expect, type Page } from "@playwright/test"

import type { CreatedPlaylists } from "./cleanup"

/** The playlist ids the page currently links to. */
async function playlistIds(page: Page): Promise<string[]> {
  const hrefs = await page
    .locator('a[href*="/dashboard/playlists/"]')
    .evaluateAll((nodes) =>
      nodes.map((node) => (node as HTMLAnchorElement).getAttribute("href") ?? "")
    )

  return hrefs
    .map((href) => /\/dashboard\/playlists\/([0-9a-f-]{36})/.exec(href)?.[1])
    .filter((one): one is string => Boolean(one))
}

/**
 * What to say when no playlist appears: "the poll never became true" is a fact
 * about a loop, and this points at the two things that actually cause it.
 */
function importFailureMessage(): string {
  return (
    "No new playlist appeared after submitting the import. If the page shows " +
    "a save error, check the server log for `playlist.import_failed`: an " +
    "unapplied migration surfaces here as one — dev is missing " +
    "`0005_expand_genres.sql`, so seven of the twelve genres cannot be saved."
  )
}

/**
 * Imports one playlist and lands on its page.
 *
 * ## The bug this function exists to have exactly once
 *
 * Both authenticated specs used to submit the import form with
 * `page.locator('button[type="submit"]').first().click()`. The dashboard has
 * **two** submit buttons and the first one in the DOM is **Log out** — so every
 * import test signed itself out and then waited thirty seconds for a playlist
 * URL that could never arrive. Forty-three tests across three plans failed as
 * "Test timeout of 30000ms exceeded", which says nothing about the cause.
 *
 * Nobody had seen it because the specs had never been run: they were written in
 * one batch and skipped for want of credentials in the same batch. A spec that
 * has never executed is a draft, and this is what drafts look like.
 *
 * The form is located by the thing that makes it *this* form — it is the one
 * containing the file input — rather than by the button's label, which is
 * bilingual and has been reworded before. Two specs needed the same three
 * lines, and two copies of a selector is how one of them ends up fixed and the
 * other does not.
 */
export async function importPlaylist(
  page: Page,
  file: { name: string; mimeType: string; contents: string },
  created?: CreatedPlaylists
): Promise<string> {
  await page.goto("/dashboard/playlists")

  // Waited for, not assumed. The page is streamed, and while React is swapping
  // the resolved content in for its fallback **both trees are in the DOM** — so
  // `#import-file`, an id that is unique in the source and unique on a settled
  // page, briefly resolves to two elements. It showed up as an intermittent
  // strict-mode violation on an id, which is a contradiction until you know
  // that. The server log has the matching half: `The destination stream closed
  // early`, from navigating away mid-render.
  await page.waitForLoadState("networkidle")

  // By id. The dashboard carries more than one file input — the local-audio
  // importer has two of its own — and two attempts at a cleverer selector both
  // went ambiguous under load: "the only form with a file input" and "the input
  // that accepts .nml" each resolved to two elements once other panels had
  // mounted. `#import-file` is the element's own name and cannot drift into
  // matching a neighbour.
  const fileInput = page.locator("#import-file")
  const form = page.locator("form").filter({ has: fileInput })

  await expect(
    fileInput,
    "expected the playlist import input (#import-file) to be on the page"
  ).toHaveCount(1)

  await fileInput.setInputFiles({
    name: file.name,
    mimeType: file.mimeType,
    buffer: Buffer.from(file.contents, "utf8"),
  })

  // The file is parsed in the browser before the form is worth submitting, and
  // the page says so by naming it. Clicking Import before that produced a
  // submit that reached the server with nothing to save: no error on the page,
  // no navigation, and a timeout forty-five seconds later that named none of
  // it. Waiting for the file's own name is the page's own readiness signal.
  await expect(form.getByText(file.name, { exact: false })).toBeVisible()

  // Genre is chosen rather than left on auto-detect, and the reason is worth
  // writing down because it cost an afternoon.
  //
  // Auto-detect reads the genre out of the file and can land on any of the
  // twelve the product offers. Seven of those twelve do not exist in the dev
  // database's `playlist_genre` enum — they are added by
  // `0005_expand_genres.sql`, which has never been applied there. When
  // detection picked one, the insert failed with
  // `invalid input value for enum playlist_genre` and the page said "Something
  // went wrong while saving", so the spec sat waiting for a navigation that
  // could not come.
  //
  // That is a real environment defect and it is reported as one; it is not this
  // spec's subject. These tests are about reading a file and drawing a curve,
  // and a test that also depends on a detection heuristic *and* on the schema
  // being current fails for three reasons at once. `techno` is one of the five
  // genres present since `0001`.
  // Not `selectOption`: the control is `TaxonomySelect`, a custom listbox with
  // a hidden input behind it, so it is opened and picked like a person would.
  // The option name is anchored because five of the twelve labels contain
  // "Techno" or "House" as a substring.
  await form.locator("#import-genre").click()
  await page.getByRole("option", { name: "Techno", exact: true }).click()

  // The pick is confirmed against the hidden input the form actually submits,
  // not assumed from the click. `TaxonomySelect` commits asynchronously, and
  // when the submit beat the commit the form posted an empty genre, fell back
  // to auto-detect and sometimes chose one of the seven genres dev's schema
  // does not have — so the run failed on a later `waitForURL` with no hint that
  // a dropdown was the cause. Playwright retries this assertion, which turns
  // the race into a wait.
  await expect(form.locator('input[name="genre"]')).toHaveValue("techno")

  // Every playlist already listed, so the new one can be identified by
  // difference rather than by the redirect landing where it should.
  const linksBefore = await playlistIds(page)

  await form.locator('button[type="submit"]').click()

  // The import is complete when a playlist exists that did not before — which
  // is a claim about the product, and the redirect is not.
  //
  // They are separate on purpose: the redirect is **not reliable**. Watched
  // across several runs, the import sometimes creates the set and leaves the
  // browser on the list instead of opening it. Waiting only for the detail URL
  // turned that into "Timeout 45000ms exceeded" — and worse, the playlist it
  // had just created went unregistered and survived cleanup, which is where the
  // strays that later ate the FREE quota came from.
  // Polled, and the list is **reloaded** on each attempt.
  //
  // Two shapes were tried before this one and both were wrong in an
  // instructive way. Waiting only for the detail URL missed the runs where the
  // import succeeds and leaves the browser on the list — the redirect is not
  // reliable — and left the new playlist unregistered, which is where the
  // strays that later ate the FREE quota came from. Reading the list without
  // reloading could only ever report what was already rendered, so it reported
  // "nothing was created" while the sidebar showed the new set. And a single
  // `networkidle` right after the click returns before the action has even
  // fired, which took the failures from six to twenty-nine.
  let id: string | null = null

  await expect
    .poll(
      async () => {
        const fromUrl = /\/dashboard\/playlists\/([0-9a-f-]{36})/.exec(page.url())

        if (fromUrl) {
          id = fromUrl[1]
          return true
        }

        await page.goto("/dashboard/playlists")

        const now = await playlistIds(page)
        const fresh = now.find((one) => !linksBefore.includes(one))

        if (fresh) {
          id = fresh
          return true
        }

        return false
      },
      { timeout: 60_000, message: importFailureMessage() }
    )
    .toBe(true)

  // Registered the moment it is known, before anything else can fail.
  created?.add(id)

  if (!page.url().includes(id!)) {
    await page.goto(`/dashboard/playlists/${id}`)
  }

  await page.waitForLoadState("networkidle")

  return page.url()
}
