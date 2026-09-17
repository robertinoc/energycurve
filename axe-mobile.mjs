import { chromium, devices } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"

const WCAG_AA = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]
const PAGES = [
  ["camelot wheel", "/tools/camelot-wheel"],
  ["camelot wheel (es)", "/es/herramientas/rueda-camelot"],
  ["energy curve tool", "/tools/energy-curve"],
  ["energy curve tool (es)", "/es/herramientas/curva-de-energia"],
  ["key and BPM checker", "/tools/key-bpm-compatibility"],
  ["key and BPM checker (es)", "/es/herramientas/compatibilidad-tonalidad-bpm"],
  ["tools hub", "/tools"],
  ["tools hub (es)", "/es/herramientas"],
]

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
})
// mobile-safari's viewport is what made the table scroll. The engine is not
// what matters here — the width is.
const context = await browser.newContext({ ...devices["iPhone 13"] , isMobile: false, hasTouch: false})
let total = 0

for (const [name, path] of PAGES) {
  const page = await context.newPage()
  await page.goto("http://127.0.0.1:3010" + path)
  await page.waitForLoadState("networkidle")
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_AA).analyze()
  total += violations.length
  console.log(`${name.padEnd(26)} violaciones:${violations.length}`)
  for (const v of violations) {
    console.log(`     [${v.impact}] ${v.id} — ${v.help} @ ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)
  }
  await page.close()
}
console.log(`\nTOTAL a 390px: ${total}`)
await browser.close()
