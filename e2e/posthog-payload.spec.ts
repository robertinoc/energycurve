import { readFileSync } from "node:fs"
import path from "node:path"
import { gunzipSync } from "node:zlib"

import { expect, test, type Page } from "@playwright/test"
import ts from "typescript"

/**
 * H-17, checked where it matters: in the request the PostHog SDK actually sends.
 *
 * The finding existed because the code and the SDK disagreed. `ip: false` read
 * like a guarantee and `posthog-js` ignored it. So this does not read our code
 * and infer the payload — it runs the real SDK bundle (`dist/array.full.js`, the
 * one the site ships), hands it our real `before_send`, answers its requests from
 * a fake host so nothing reaches PostHog, and reads the body it wrote.
 *
 * What this cannot see, and the comment in `lib/analytics/posthog-privacy.ts`
 * says why: the IP on the *connection*. A test can only prove the IP is not in
 * the event. Whether PostHog keeps the one it sees on the wire is a project
 * setting, and whether it sees one at all would need a proxy.
 */

const ROOT = process.cwd()
const FAKE_IP = "203.0.113.7" // RFC 5737 documentation range: never a real visitor.
const POSTHOG = "https://posthog.test.invalid"
const HARNESS = "https://harness.test.invalid/"

/** Our hook, compiled from the source file the app imports — not a copy of it. */
function privacyModuleAsScript(): string {
  const source = readFileSync(path.join(ROOT, "lib/analytics/posthog-privacy.ts"), "utf8")
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  })

  return `var exports = {}; ${outputText}; window.__privacy = exports;`
}

function decode(body: Buffer | null): string {
  if (!body) return ""
  // posthog-js sends gzip by default; fall back to its base64 form.
  if (body[0] === 0x1f && body[1] === 0x8b) return gunzipSync(body).toString("utf8")
  const text = body.toString("utf8")
  try {
    return Buffer.from(decodeURIComponent(text.replace(/^data=/, "")), "base64").toString("utf8")
  } catch {
    return text
  }
}

async function sendOneEvent(
  page: Page,
  options: { withHook: boolean; registerIp: boolean }
): Promise<string[]> {
  const bodies: string[] = []

  await page.route(`${POSTHOG}/**`, async (route) => {
    const request = route.request()
    if (request.method() === "POST" && /\/(e|i\/v0\/e|batch)\//.test(request.url())) {
      bodies.push(decode(request.postDataBuffer()))
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: '{"status":1}',
    })
  })
  await page.route(`${HARNESS}**`, (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>h</title>" })
  )

  await page.goto(HARNESS)
  await page.addScriptTag({ path: path.join(ROOT, "node_modules/posthog-js/dist/array.full.js") })
  await page.addScriptTag({ content: privacyModuleAsScript() })

  await page.evaluate(
    ({ withHook, registerIp, host, ip }) => {
      type Harness = Window & {
        posthog: {
          init: (key: string, config: Record<string, unknown>) => void
          register: (props: Record<string, unknown>) => void
          capture: (event: string, props: Record<string, unknown>) => void
        }
        __privacy: { stripClientIp: unknown }
      }
      const w = window as unknown as Harness

      w.posthog.init("phc_harness", {
        api_host: host,
        // Harness only. The SDK drops automated browsers by default — right for
        // the product, and it would leave this check with nothing to read.
        opt_out_useragent_filter: true,
        capture_pageview: false,
        autocapture: false,
        disable_session_recording: true,
        advanced_disable_flags: true,
        persistence: "memory",
        request_batching: false,
        ...(withHook ? { before_send: w.__privacy.stripClientIp } : {}),
      })

      // The leak path the hook exists for: something registering $ip as a
      // super property, which the SDK would then copy into every event.
      if (registerIp) w.posthog.register({ $ip: ip })

      w.posthog.capture("tool_result_shown", { locale: "es", trackCount: 12 })
    },
    { ...options, host: POSTHOG, ip: FAKE_IP }
  )

  await expect.poll(() => bodies.length, { timeout: 10_000 }).toBeGreaterThan(0)

  return bodies
}

test.describe("what PostHog receives about where a visitor connected from (H-17)", () => {
  // The SDK and the hook are the same code in every engine; one is enough, and
  // the other three would only repeat the network round trip.
  test.skip(({ browserName }) => browserName !== "chromium", "chromium only")

  test("the SDK on its own puts no $ip in the event", async ({ page }) => {
    const [body] = await sendOneEvent(page, { withHook: false, registerIp: false })

    expect(body).toContain("tool_result_shown")
    expect(body).not.toContain('"$ip"')
  })

  test("with our before_send, an $ip that got registered does not leave the browser", async ({
    page,
  }) => {
    const bodies = await sendOneEvent(page, { withHook: true, registerIp: true })

    expect(bodies.join("\n")).not.toContain(FAKE_IP)
    expect(bodies.join("\n")).not.toContain('"$ip"')
  })

  test("control: without the hook, the same registered $ip does reach the request", async ({
    page,
  }) => {
    // Without this, the test above could pass because the harness never wrote
    // the IP anywhere — the failure mode of every check this finding is about.
    const bodies = await sendOneEvent(page, { withHook: false, registerIp: true })

    expect(bodies.join("\n")).toContain(FAKE_IP)
  })
})
