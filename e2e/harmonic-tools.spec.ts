import { expect, test, type Page } from "@playwright/test"

/**
 * The Camelot wheel and the key/BPM checker, in both languages, with no session.
 *
 * Both pages are free and account-less by design, so every test here runs
 * anonymous — a suite that signed in first would pass for a page that had
 * quietly stopped being free.
 */

const WHEEL = [
  { locale: "es", path: "/es/herramientas/rueda-camelot" },
  { locale: "en", path: "/tools/camelot-wheel" },
] as const

const CHECKER = [
  { locale: "es", path: "/es/herramientas/compatibilidad-tonalidad-bpm" },
  { locale: "en", path: "/tools/key-bpm-compatibility" },
] as const

/** The selected key on the wheel, read off the radio that is checked. */
function selectedKey(page: Page) {
  return page.locator('[role="radio"][aria-checked="true"]')
}

for (const { locale, path } of WHEEL) {
  test.describe(`camelot wheel (${locale})`, () => {
    test("shows compatible keys when one is selected", async ({ page }) => {
      await page.goto(path)

      await expect(selectedKey(page)).toHaveAttribute("data-key", "8A")

      const matches = page.getByTestId("wheel-matches").locator("li")
      await expect(matches.first()).toBeVisible()
      // The table gives every key several moves; a single one would mean the
      // lookup silently returned nothing but the key itself.
      expect(await matches.count()).toBeGreaterThan(3)

      // 5A is 8A's energy boost in the engine's table, so it must be offered.
      await expect(
        page.getByTestId("wheel-matches").getByRole("button", { name: "5A", exact: true })
      ).toBeVisible()
    })

    test("selecting another key changes the list", async ({ page }) => {
      await page.goto(path)

      const before = await page.getByTestId("wheel-matches").textContent()
      await page.locator('[role="radio"][data-key="3B"]').click()

      await expect(selectedKey(page)).toHaveAttribute("data-key", "3B")
      expect(await page.getByTestId("wheel-matches").textContent()).not.toBe(
        before
      )
    })

    test("is navigable with the keyboard alone", async ({ page }) => {
      await page.goto(path)

      // Focus the selected key directly — the roving tabindex means it is the
      // wheel's only tab stop, and this asserts the arrows, not the tab order.
      await page.locator('[role="radio"][data-key="8A"]').focus()

      await page.keyboard.press("ArrowRight")
      await expect(selectedKey(page)).toHaveAttribute("data-key", "9A")

      await page.keyboard.press("ArrowLeft")
      await page.keyboard.press("ArrowLeft")
      await expect(selectedKey(page)).toHaveAttribute("data-key", "7A")

      // Up and down cross the rings at the same number.
      await page.keyboard.press("ArrowUp")
      await expect(selectedKey(page)).toHaveAttribute("data-key", "7B")
    })

    test("the equivalence table is in the server's HTML", async ({ page }) => {
      // Fetched, not rendered: this asserts the 24 rows arrive in the document
      // rather than being drawn by JavaScript afterwards.
      const response = await page.request.get(path)
      const html = await response.text()

      expect(response.status()).toBe(200)
      for (const camelot of ["1A", "8A", "12B", "5B"]) {
        expect(html).toContain(`>${camelot}<`)
      }
      // The spoken name, in the page's own language.
      expect(html).toContain(locale === "es" ? "La menor" : "A minor")
    })

    test("the table filters", async ({ page }) => {
      await page.goto(path)

      const rows = page.getByTestId("key-table-body").locator("tr")
      await expect(rows).toHaveCount(24)

      await page.getByTestId("key-filter").fill("8A")
      await expect(rows).toHaveCount(1)
    })
  })
}

for (const { locale, path } of CHECKER) {
  test.describe(`key and bpm checker (${locale})`, () => {
    test("reports harmony, tempo and the pitched key", async ({ page }) => {
      await page.goto(path)

      await page.getByTestId("track-b-key").fill("5A")
      await page.getByTestId("track-b-bpm").fill("136")

      const result = page.getByTestId("checker-result")
      await expect(result).toBeVisible()
      // 128 → 136 is 6.25%, and without key lock that is about a semitone down.
      await expect(result).toContainText("6.3%")
      await expect(result).toContainText("st)")
    })

    test("keeps both fields when they are filled in either order", async ({
      page,
    }) => {
      // The regression this is named for: the two inputs of one track share a
      // state object, and writing them with a stale copy made the second entry
      // wipe the first. Both orders, because only one of them was broken.
      await page.goto(path)

      await page.getByTestId("track-b-bpm").fill("136")
      await page.getByTestId("track-b-key").fill("5A")
      await expect(page.getByTestId("checker-result")).toContainText("st)")

      await page.reload()
      await page.getByTestId("track-b-key").fill("5A")
      await page.getByTestId("track-b-bpm").fill("136")
      await expect(page.getByTestId("checker-result")).toContainText("st)")
    })

    test("half-time is a matched tempo, not a jump", async ({ page }) => {
      await page.goto(path)

      await page.getByTestId("track-a-bpm").fill("174")
      await page.getByTestId("track-b-key").fill("8A")
      await page.getByTestId("track-b-bpm").fill("87")

      await expect(page.getByTestId("checker-result")).toContainText(
        locale === "es" ? "Half-time" : "Half-time"
      )
      await expect(page.getByTestId("checker-result")).toContainText("0.0%")
    })

    test("key lock holds the key", async ({ page }) => {
      await page.goto(path)

      await page.getByTestId("track-b-key").fill("8A")
      await page.getByTestId("track-b-bpm").fill("136")
      await page.getByTestId("key-lock").check()

      await expect(page.getByTestId("checker-result")).toContainText(
        locale === "es" ? "key lock" : "Key lock"
      )
    })

    test("accepts any notation for a key", async ({ page }) => {
      await page.goto(path)

      // Open Key for A minor is 1m; the page must not require Camelot.
      await page.getByTestId("track-a-key").fill("1m")
      await page.getByTestId("track-b-key").fill("Am")

      await expect(page.getByTestId("checker-result")).toContainText(
        locale === "es" ? "Match perfecto" : "Perfect match"
      )
    })

    test("needs no session", async ({ page }) => {
      const response = await page.goto(path)

      expect(response?.status()).toBe(200)
      await expect(page).toHaveURL(new RegExp(`${path}$`))
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    })
  })
}

test.describe("the hub lists all three tools", () => {
  for (const [hub, paths] of [
    ["/tools", ["/tools/energy-curve", "/tools/camelot-wheel", "/tools/key-bpm-compatibility"]],
    [
      "/es/herramientas",
      [
        "/es/herramientas/curva-de-energia",
        "/es/herramientas/rueda-camelot",
        "/es/herramientas/compatibilidad-tonalidad-bpm",
      ],
    ],
  ] as const) {
    test(`${hub}`, async ({ page }) => {
      await page.goto(hub)

      for (const target of paths) {
        await expect(page.locator(`a[href="${target}"]`).first()).toBeVisible()
      }
    })
  }
})
