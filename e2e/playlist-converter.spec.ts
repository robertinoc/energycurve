import { expect, test, type Page } from "@playwright/test"

/**
 * The Traktor ↔ Rekordbox converter, in both languages, without a session.
 *
 * Anonymous on purpose, like the other tool suites: the page's claim is that it
 * works with no account, and a suite that signed in first would pass for a page
 * that had quietly stopped being free.
 *
 * The fixtures are the ones the converter's unit tests use — the same two
 * tracks, so a leak check can look for the same names.
 */

const PAGES = [
  { locale: "es", path: "/es/herramientas/conversor-traktor-rekordbox" },
  { locale: "en", path: "/tools/traktor-rekordbox-converter" },
] as const

const TRACKS = [
  ["Deep Blue", "Ocean Drive", "deep_blue.mp3", 312],
  ["Solar Wind", "Star Atlas", "solar_wind.mp3", 428],
] as const

const PLAYLIST_NAME = "E2E Set"

const NML = `<?xml version="1.0" encoding="UTF-8" standalone="no" ?>
<NML VERSION="19">
  <HEAD COMPANY="www.native-instruments.com" PROGRAM="Traktor"></HEAD>
  <MUSICFOLDERS></MUSICFOLDERS>
  <COLLECTION ENTRIES="${TRACKS.length}">
${TRACKS.map(
  ([title, artist, file, playtime]) =>
    `    <ENTRY TITLE="${title}" ARTIST="${artist}">
      <LOCATION DIR="/:Music/:Sets/:" FILE="${file}" VOLUME="MUSIC HD" VOLUMEID="MUSIC HD"></LOCATION>
      <INFO PLAYTIME="${playtime}"></INFO>
    </ENTRY>`
).join("\n")}
  </COLLECTION>
  <PLAYLISTS>
    <NODE TYPE="FOLDER" NAME="$ROOT">
      <SUBNODES COUNT="1">
        <NODE TYPE="PLAYLIST" NAME="${PLAYLIST_NAME}">
          <PLAYLIST ENTRIES="${TRACKS.length}" TYPE="LIST" UUID="aabbccdd11223344aabbccdd11223344">
${TRACKS.map(
  ([, , file]) =>
    `            <ENTRY><PRIMARYKEY TYPE="TRACK" KEY="MUSIC HD/:Music/:Sets/:${file}"></PRIMARYKEY></ENTRY>`
).join("\n")}
          </PLAYLIST>
        </NODE>
      </SUBNODES>
    </NODE>
  </PLAYLISTS>
</NML>
`

const M3U8 = `#EXTM3U
${TRACKS.map(
  ([title, artist, file, playtime]) =>
    `#EXTINF:${playtime},${artist} - ${title}\n/Volumes/MUSIC HD/Music/Sets/${file}`
).join("\n")}
`

async function dropFile(page: Page, name: string, contents: string) {
  await page.setInputFiles('[data-testid="converter-file-input"]', {
    name,
    mimeType: "application/octet-stream",
    buffer: Buffer.from(contents, "utf8"),
  })
}

/** Clicks the first download button and returns what the browser was handed. */
async function firstDownload(page: Page) {
  const downloadPromise = page.waitForEvent("download")
  await page.getByTestId("converter-download").first().click()
  const download = await downloadPromise
  const stream = await download.createReadStream()
  const chunks: Buffer[] = []

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  return {
    filename: download.suggestedFilename(),
    body: Buffer.concat(chunks).toString("utf8"),
  }
}

for (const { locale, path } of PAGES) {
  test.describe(`playlist converter (${locale})`, () => {
    test("turns a Traktor .nml into a downloadable .m3u8", async ({ page }) => {
      await page.goto(path)
      await dropFile(page, "set.nml", NML)

      await expect(page.getByTestId("converter-result")).toBeVisible()
      // One playlist, so one file, named after it.
      await expect(page.getByTestId("converter-files").locator("li")).toHaveCount(1)
      await expect(page.getByTestId("converter-files")).toContainText(
        `${PLAYLIST_NAME}.m3u8`
      )

      const { filename, body } = await firstDownload(page)
      expect(filename).toBe(`${PLAYLIST_NAME}.m3u8`)
      expect(body.startsWith("#EXTM3U")).toBe(true)
      expect(body).toContain("/Volumes/MUSIC HD/Music/Sets/deep_blue.mp3")
      expect(body).toContain("#EXTINF:312,Ocean Drive - Deep Blue")
    })

    test("turns a Rekordbox .m3u8 into a downloadable .nml", async ({ page }) => {
      await page.goto(path)
      await dropFile(page, "friday.m3u8", M3U8)

      await expect(page.getByTestId("converter-result")).toBeVisible()
      await expect(page.getByTestId("converter-files")).toContainText("friday.nml")

      const { filename, body } = await firstDownload(page)
      expect(filename).toBe("friday.nml")
      expect(body).toContain("<NML")
      expect(body).toContain('<NODE TYPE="PLAYLIST" NAME="friday">')
      expect(body).toContain('VOLUME="MUSIC HD"')
      expect(body).toContain('DIR="/:Music/:Sets/:"')
    })

    test("says why when the file is not one it converts", async ({ page }) => {
      await page.goto(path)
      await dropFile(page, "collection.xml", "<DJ_PLAYLISTS/>")

      await expect(page.getByTestId("converter-error")).toBeVisible()
      await expect(page.getByTestId("converter-result")).toHaveCount(0)
    })

    test("says why when the .nml has no playlists", async ({ page }) => {
      await page.goto(path)
      await dropFile(
        page,
        "empty.nml",
        `<NML VERSION="19"><COLLECTION ENTRIES="0"></COLLECTION><PLAYLISTS></PLAYLISTS></NML>`
      )

      await expect(page.getByTestId("converter-error")).toBeVisible()
    })

    test("can convert another file after the first", async ({ page }) => {
      await page.goto(path)
      await dropFile(page, "set.nml", NML)
      await expect(page.getByTestId("converter-result")).toBeVisible()

      await page.getByTestId("converter-reset").click()
      await expect(page.getByTestId("converter-result")).toHaveCount(0)
      await expect(page.getByTestId("converter-file-input")).toBeAttached()
    })

    test("the article and FAQ are in the server's HTML", async ({ page }) => {
      // Fetched, not rendered: the text under the tool has to arrive in the
      // document for the page to be worth landing on.
      const response = await page.request.get(path)
      const html = await response.text()

      expect(response.status()).toBe(200)
      expect(html).toContain("TraktorBox")
      expect(html).toContain('"@type":"FAQPage"')
      expect(html).toContain('"@type":"WebApplication"')
    })

    test("needs no session", async ({ page }) => {
      const response = await page.goto(path)

      expect(response?.status()).toBe(200)
      await expect(page).toHaveURL(new RegExp(`${path}$`))
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    })
  })
}

test.describe("nothing from the file goes over the network", () => {
  /**
   * The page's central promise, asserted rather than documented — and the one
   * thing that changed from TraktorBox, which posted the file to a server.
   */
  test("no request carries a track, an artist or the playlist's name", async ({
    page,
  }) => {
    const leaks: string[] = []
    const needles = [
      ...TRACKS.map(([title]) => title),
      ...TRACKS.map(([, artist]) => artist),
      ...TRACKS.map(([, , file]) => file),
      PLAYLIST_NAME,
    ]

    page.on("request", (request) => {
      const haystack = `${request.url()} ${request.postData() ?? ""}`

      for (const needle of needles) {
        if (
          haystack.includes(needle) ||
          haystack.includes(encodeURIComponent(needle))
        ) {
          leaks.push(`${needle} in ${request.method()} ${request.url()}`)
        }
      }
    })

    await page.goto("/tools/traktor-rekordbox-converter")
    await dropFile(page, "set.nml", NML)
    await expect(page.getByTestId("converter-result")).toBeVisible()

    // A beat for anything fired after render — an analytics event, a late
    // prefetch — to have been made.
    await page.waitForTimeout(1000)

    expect(leaks).toEqual([])
  })
})

test.describe("the converter is reachable", () => {
  test("from the tools hub in both languages", async ({ page }) => {
    for (const [hub, tool] of [
      ["/tools", "/tools/traktor-rekordbox-converter"],
      ["/es/herramientas", "/es/herramientas/conversor-traktor-rekordbox"],
    ] as const) {
      await page.goto(hub)
      await expect(page.locator(`a[href="${tool}"]`).first()).toBeVisible()
    }
  })

  test("from the landing's Resources menu", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("button", { name: /resources/i }).first().click()

    await expect(
      page.locator('a[href="/tools/traktor-rekordbox-converter"]').first()
    ).toBeVisible()
  })
})
