import { expect, test, type Page } from "@playwright/test"

/**
 * The free energy-curve tool, in both languages, without a session.
 *
 * Every test here runs as an anonymous visitor on purpose: the page's whole
 * claim is that it works with no account, and a suite that signed in first would
 * pass for a page that had quietly stopped being free.
 */

/** A small Rekordbox export, written here rather than imported: the browser
 *  needs bytes, and the fixture generator is a Node module. */
const TRACKS = [
  ["First Light", "Nite Fleit", 122, "8A"],
  ["Slow Burn", "Or:la", 124, "8A"],
  ["Pressure Drop", "Anetha", 128, "9A"],
  ["Ceiling", "Amelie Lens", 136, "9A"],
  ["Breather", "Skee Mask", 126, "4A"],
  ["Come Down", "Maceo Plex", 128, "11A"],
] as const

const REKORDBOX_XML = `<?xml version="1.0" encoding="UTF-8"?>
<DJ_PLAYLISTS Version="1.0.0">
  <PRODUCT Name="rekordbox" Version="6.7.7" Company="AlphaTheta"/>
  <COLLECTION Entries="${TRACKS.length}">
${TRACKS.map(
  ([name, artist, bpm, key], index) =>
    `    <TRACK TrackID="${index + 1}" Name="${name}" Artist="${artist}" AverageBpm="${bpm}.00" Tonality="${key}" TotalTime="360"/>`
).join("\n")}
  </COLLECTION>
  <PLAYLISTS>
    <NODE Type="0" Name="ROOT" Count="1">
      <NODE Name="E2E Set" Type="1" KeyType="0" Entries="${TRACKS.length}">
${TRACKS.map((_, index) => `        <TRACK Key="${index + 1}"/>`).join("\n")}
      </NODE>
    </NODE>
  </PLAYLISTS>
</DJ_PLAYLISTS>`

const PASTED = TRACKS.map(([name, artist]) => `${artist} - ${name}`).join("\n")

const PAGES = [
  { locale: "es", path: "/es/herramientas/curva-de-energia" },
  { locale: "en", path: "/tools/energy-curve" },
] as const

async function loadFile(page: Page) {
  await page.setInputFiles('[data-testid="tool-file-input"]', {
    name: "collection.xml",
    mimeType: "text/xml",
    buffer: Buffer.from(REKORDBOX_XML, "utf8"),
  })
}

/** The result panel, whichever way the set got in. */
async function expectResult(page: Page) {
  await expect(page.getByTestId("tool-result")).toBeVisible()
  await expect(page.getByTestId("tool-curve").locator("svg")).toBeVisible()

  const score = await page.getByTestId("tool-score").textContent()
  expect(Number(score)).toBeGreaterThanOrEqual(1)
  expect(Number(score)).toBeLessThanOrEqual(10)
}

for (const { locale, path } of PAGES) {
  test.describe(`energy curve tool (${locale})`, () => {
    test("analyses a Rekordbox export and shows the curve and score", async ({
      page,
    }) => {
      await page.goto(path)
      await loadFile(page)
      await expectResult(page)
    })

    test("analyses a pasted tracklist", async ({ page }) => {
      await page.goto(path)
      await page.getByTestId("tool-paste").fill(PASTED)
      await page.getByTestId("tool-analyze-paste").click()
      await expectResult(page)
    })

    test("the example set works without a file", async ({ page }) => {
      await page.goto(path)
      await page.getByTestId("tool-example").click()
      await expectResult(page)
    })

    test("the fix is locked behind a signup link", async ({ page }) => {
      await page.goto(path)
      await page.getByTestId("tool-example").click()
      await expectResult(page)

      const cta = page.locator('a[href="/signup"]')
      await expect(cta).toBeVisible()

      await cta.click()
      await expect(page).toHaveURL(/\/signup/)
    })

    test("needs no session: the page never bounces to login", async ({
      page,
    }) => {
      const response = await page.goto(path)

      expect(response?.status()).toBe(200)
      await expect(page).toHaveURL(new RegExp(`${path}$`))
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    })
  })
}

test.describe("nothing from the file goes over the network", () => {
  /**
   * The page's central promise, asserted rather than documented.
   *
   * Every request the tab makes from the moment the file is chosen is inspected
   * for a track title and an artist name. A server action, a stray fetch, or an
   * analytics event that got too detailed would all put one of those strings in
   * a request body or URL, and all three are the same bug to the DJ whose
   * unreleased tracklist it is.
   */
  test("no request carries a track title or an artist", async ({ page }) => {
    const leaks: string[] = []
    const needles = [
      ...TRACKS.map(([name]) => name),
      ...TRACKS.map(([, artist]) => artist),
      "E2E Set",
    ]

    page.on("request", (request) => {
      const haystack = `${request.url()} ${request.postData() ?? ""}`

      for (const needle of needles) {
        if (haystack.includes(needle) || haystack.includes(encodeURIComponent(needle))) {
          leaks.push(`${needle} in ${request.method()} ${request.url()}`)
        }
      }
    })

    await page.goto("/tools/energy-curve")
    await loadFile(page)
    await expectResult(page)

    // A beat for anything fired after render — an analytics event, a late
    // prefetch — to have been made.
    await page.waitForTimeout(1000)

    expect(leaks).toEqual([])
  })
})

test.describe("tools hub", () => {
  test("lists the tool in both languages", async ({ page }) => {
    for (const [hub, tool] of [
      ["/tools", "/tools/energy-curve"],
      ["/es/herramientas", "/es/herramientas/curva-de-energia"],
    ] as const) {
      await page.goto(hub)
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
      await expect(page.locator(`a[href="${tool}"]`).first()).toBeVisible()
    }
  })
})
