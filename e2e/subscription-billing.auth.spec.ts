import { execFileSync } from "node:child_process"

import { expect, test, type Page } from "@playwright/test"

import { accountFor, skipReason } from "./helpers/accounts"
import { billingSkipReason, refuseLiveMode, stripeMode } from "./helpers/stripe"

/**
 * F3 — the money path: subscribing, being billed, stepping down, and stopping.
 *
 * This is the last row of the F3 board and the only one that was still being
 * checked by hand. It is also the one row where a silent failure costs a
 * customer rather than a page view, because entitlement here is not granted by
 * the app at all: `app/api/billing/checkout/route.ts` says it outright —
 * "Entitlement is granted only by the webhook, never here". A checkout can
 * succeed at Stripe, the customer's card can be charged, and the account can
 * stay on FREE, and nothing in the app would raise its voice.
 *
 * So this spec follows one account through the whole arc and asserts what the
 * *account page* says at each step, which is the sentence the person actually
 * reads.
 *
 * ## What it covers, and in which direction
 *
 * | paso | acción | lo que la tarjeta de plan dice |
 * | --- | --- | --- |
 * | alta | checkout PRO monthly with a test card | `PRO is active` |
 * | facturación | Stripe issues the first invoice; the app offers the portal | `Manage billing` opens `billing.stripe.com` |
 * | baja | cancel at period end | `PRO ends on {date}` |
 * | cancelación | the subscription actually ends | `Your PRO subscription ended` |
 *
 * Those four are four distinct states in `planNotice`, not one state seen four
 * times, and the two cancellations are genuinely different products: one keeps
 * access until the date and can be undone, the other is over.
 *
 * ## Three things it deliberately does not do
 *
 * **It does not touch billing code.** Not a line. This is a test of the
 * behaviour that already ships.
 *
 * **It does not drive the Stripe portal's own controls.** The handoff is
 * asserted — the button appears, it opens a portal session for this customer —
 * and the state changes are then made through the Stripe API. Clicking through
 * somebody else's hosted UI would make this spec fail on the day Stripe moves a
 * button, and that failure would say "billing is broken" about a product that
 * is fine. The part that is ours is the part that is asserted.
 *
 * **It does not cover a tier-to-tier downgrade** (PRO+ → PRO). Doing it
 * honestly needs a second live subscription on a shared account and a portal
 * configuration that permits plan switching (`STRIPE_PORTAL_CONFIGURATION_ID`,
 * which is optional and unset here). Cancellation is the downgrade that every
 * subscriber can reach, so that is the one covered. Named rather than skipped
 * quietly.
 *
 * ## Why the starting state is a set and not a value
 *
 * The webhook's `customer.subscription.deleted` branch writes
 * `canceledSubscription(purchased)` — the row keeps `plan: "pro"` with
 * `status: "canceled"` rather than reverting to `free`. That is correct for a
 * real person, who should be told their subscription ended rather than being
 * quietly reset, and it means this spec leaves the account in `ended` rather
 * than in `free`. Entitlement is unaffected: `effectivePlan("pro", "canceled")`
 * is `free`, which is why the other FREE specs and the 3-playlist cap keep
 * behaving the same.
 *
 * So the first assertion accepts either sentence. A test that only passes the
 * first time it is run is a worse instrument than no test, because the second
 * run's red says nothing about the product.
 */

test.describe.configure({ mode: "serial" })

const PORT = process.env.E2E_PORT ?? "3010"

/** The card Stripe documents for a successful test payment. */
const TEST_CARD = {
  number: "4242 4242 4242 4242",
  expiry: "12 / 34",
  cvc: "123",
  name: "EnergyCurve E2E",
  postal: "42424",
}

/** No paid entitlement — whichever of the two ways the account got there. */
const NOT_SUBSCRIBED = /You're on FREE|Your PRO subscription ended/

interface StripeSubscription {
  readonly id: string
  readonly status: string
}

/**
 * Runs a Stripe CLI command and parses its JSON.
 *
 * The CLI's own logged-in test key is used, so no secret is read, passed or
 * logged by this file. `refuseLiveMode` upstream is what guarantees the app
 * under test is pointed at the same test account.
 */
function stripeJson<T>(args: readonly string[]): T {
  const out = execFileSync("stripe", [...args], { encoding: "utf8" })

  // Destructive commands print a "This command will be executed on the account
  // ... Mode: Test" banner **to stdout**, ahead of the JSON. Parsing the whole
  // string throws on that banner, and the throw arrives from inside a cleanup
  // handler where it reads as a broken test rather than as a chatty CLI.
  const start = out.indexOf("{")

  return JSON.parse(start > 0 ? out.slice(start) : out) as T
}

/**
 * Cancels a subscription.
 *
 * `--confirm` is the whole point: without it the CLI asks "Enter 'yes' to
 * confirm" on stdin, gets EOF from a test process, and exits without doing
 * anything. That is how the first run of this spec left a live $9.99
 * subscription on the FREE account while its cleanup reported success.
 */
function cancelSubscription(id: string): void {
  execFileSync("stripe", ["subscriptions", "cancel", id, "--confirm"], {
    stdio: "ignore",
  })
}

function customerIdFor(email: string): string | null {
  const list = stripeJson<{ data: { id: string }[] }>([
    "customers",
    "list",
    "--email",
    email,
    "--limit",
    "10",
  ])

  return list.data[0]?.id ?? null
}

function subscriptionsFor(customerId: string): StripeSubscription[] {
  return stripeJson<{ data: StripeSubscription[] }>([
    "subscriptions",
    "list",
    "--customer",
    customerId,
    "--status",
    "all",
    "--limit",
    "20",
  ]).data
}

/** The subscriptions that still grant something and therefore still cost money. */
function liveSubscriptions(customerId: string): StripeSubscription[] {
  return subscriptionsFor(customerId).filter(
    (subscription) => !["canceled", "incomplete_expired"].includes(subscription.status)
  )
}

/**
 * Skips with a stated reason unless everything this needs is present.
 *
 * Called per test rather than once, because Playwright reports a skip per test
 * and a single `beforeAll` skip would leave the others looking like they ran.
 */
function requireBilling(projectName: string): string {
  // Skipped, not failed, on the other two: `testMatch: /\.auth\.spec\.ts/`
  // hands every auth project this file, and a subscription arc run three times
  // over would buy three subscriptions to assert one. The FREE account is the
  // one that starts without a subscription, so it is the one that can be taken
  // through the whole thing.
  test.skip(
    projectName !== "auth-free",
    `Subscription billing runs once, on the FREE account — ${projectName} would buy a second subscription to assert the same arc. Skipped, not passed.`
  )

  const account = accountFor("free")

  test.skip(account === null, skipReason("free"))

  // Throws rather than skips: a live key here would charge a real card.
  refuseLiveMode()

  const reason = billingSkipReason(PORT)

  test.skip(reason !== null, reason ?? "")

  return account!.email
}

/**
 * The plan card, located by its own section label.
 *
 * Not "the first h2 on the page", which is what this reached for first and
 * which resolves to "Details" — the account page opens with the profile form,
 * and the plan card is the third section down. Not the second h2 either: that
 * is an ordinal, and an ordinal is a bet on the page never gaining a section.
 *
 * Filtering on the *heading* rather than on the words "Your plan", which was
 * the second attempt and was also wrong: `hasText` matches a case-insensitive
 * substring, and the data-export section's prose ends "...your own shapes and
 * labels, and your plan." So three sections matched and the last one was the
 * export card. The `Plan` heading is exact and belongs to one section.
 */
function planCard(page: Page) {
  return page.locator("section").filter({
    has: page.getByRole("heading", { level: 2, name: "Plan", exact: true }),
  })
}

/**
 * Waits for the webhook to land.
 *
 * Polling with a reload rather than a fixed sleep: the round trip is Stripe →
 * CLI → our webhook → Supabase → the next render, and every one of those hops
 * has a different bad day. A sleep long enough to be safe would be long enough
 * to hide a real regression in how long entitlement takes to arrive.
 */
async function expectPlanHeading(page: Page, expected: RegExp, what: string) {
  await expect
    .poll(
      async () => {
        await page.goto("/dashboard/account")
        return (await planCard(page).innerText()) ?? ""
      },
      {
        message: `The account page never said ${what}. Entitlement is granted only by the webhook, so the usual cause is that the forwarded event never arrived — check the \`stripe listen\` terminal for a non-2xx on /api/billing/webhook.`,
        timeout: 60_000,
        intervals: [1_000, 2_000, 3_000, 5_000],
      }
    )
    .toMatch(expected)
}

test.describe("subscription, payment and cancellation", () => {
  let email = ""

  /**
   * Clears anything a previous run left behind, before asserting anything.
   *
   * This started as an assertion — "the account begins without a subscription"
   * — and an assertion was the wrong tool. A run that dies partway through, or
   * a cancellation that happens while the app is unreachable, leaves a live
   * subscription behind; the next run then fails on its first step, reports
   * that billing is broken, and never reaches the cleanup that would have
   * fixed it. The suite would be self-poisoning: red forever after one bad day,
   * for a reason that has nothing to do with the product.
   *
   * So the precondition is established rather than hoped for. It only removes
   * leftovers, so the assertion in the first test still means something: it
   * says the *app* agrees that this account has nothing to manage.
   */
  test.beforeAll(async () => {
    const account = accountFor("free")

    if (account === null || billingSkipReason(PORT) !== null || stripeMode() !== "test") {
      return
    }

    const customerId = customerIdFor(account.email)

    if (!customerId) {
      return
    }

    for (const subscription of liveSubscriptions(customerId)) {
      cancelSubscription(subscription.id)
    }
  })

  test.afterAll(async () => {
    // Unconditional, and tolerant of every way the run can end: a failure
    // halfway through the arc is exactly when a live subscription gets left
    // behind on a shared account.
    if (!email) {
      return
    }

    const customerId = customerIdFor(email)

    if (!customerId) {
      return
    }

    for (const subscription of liveSubscriptions(customerId)) {
      try {
        cancelSubscription(subscription.id)
      } catch {
        // Reported by the assertion below rather than swallowed: a cleanup that
        // fails silently is how the next run starts from a state nobody chose.
      }
    }

    expect(
      liveSubscriptions(customerId),
      "A subscription was left active on the FREE test account. Cancel it in the Stripe test dashboard before the next run."
    ).toHaveLength(0)
  })

  test("a FREE account is offered plans and has nothing to manage", async ({
    page,
  }, testInfo) => {
    email = requireBilling(testInfo.project.name)

    await page.goto("/dashboard/account")

    await expect(planCard(page)).toContainText(NOT_SUBSCRIBED)
    await expect(page.getByRole("link", { name: /see plans/i })).toBeVisible()
  })

  test("paying with a test card grants PRO, and the webhook is what grants it", async ({
    page,
  }, testInfo) => {
    email = requireBilling(testInfo.project.name)

    await page.goto("/pricing")

    // The PRO card's own button, not the first on the page: /pricing offers
    // three plans and two intervals, and picking by position would quietly buy
    // whatever the design puts first.
    const proCard = page.locator("section,article,div").filter({
      has: page.getByRole("heading", { name: /^PRO$/i }),
    })

    await proCard
      .getByRole("button", { name: /start|upgrade|choose|get/i })
      .first()
      .click()

    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 })

    await payWithTestCard(page)

    // Wait to leave Stripe, and assert nothing about where it lands.
    //
    // Stripe's success URL is built from the app's own configured base URL,
    // which is `localhost`, while this suite runs against `127.0.0.1`. Those
    // are different origins to a browser, so the session cookie does not come
    // along and the app correctly bounces to /login. Waiting for
    // `?checkout=success` therefore times out on a checkout that worked.
    //
    // It does not matter: `?checkout=success` is Stripe's word that the session
    // completed, not evidence that the app heard about it, and the assertion
    // below — made on our own origin, where the session lives — is the one that
    // decides whether the webhook did its job.
    await page.waitForURL((url) => !url.hostname.endsWith("stripe.com"), {
      timeout: 60_000,
    })

    await expectPlanHeading(page, /PRO is active/, "PRO is active")
  })

  test("a subscriber is offered the billing portal, and it opens for them", async ({
    page,
  }, testInfo) => {
    email = requireBilling(testInfo.project.name)

    await page.goto("/dashboard/account")

    // "Manage subscription" is what the button says. Two other strings in
    // `dashboard-copy.ts` tell people to use "Manage billing above", which is a
    // name no control on the page carries — noted, not worked around: matching
    // both here would hide the inconsistency instead of recording it.
    await page.getByRole("button", { name: /manage subscription/i }).click()

    await page.waitForURL(/billing\.stripe\.com/, { timeout: 30_000 })

    // The portal is Stripe's page, so this asserts the handoff and nothing
    // about its layout: a session was minted for *this* customer and it opened.
    await expect(page.locator("body")).toContainText(/PRO/i, { timeout: 20_000 })
  })

  test("the first invoice exists and is paid", async ({}, testInfo) => {
    email = requireBilling(testInfo.project.name)

    const customerId = customerIdFor(email)

    expect(customerId, "Checkout completed but no Stripe customer carries that email").not.toBeNull()

    const invoices = stripeJson<{ data: { status: string; amount_paid: number }[] }>([
      "invoices",
      "list",
      "--customer",
      customerId!,
      "--limit",
      "5",
    ])

    expect(
      invoices.data.length,
      "A subscription was created but Stripe issued no invoice for it"
    ).toBeGreaterThan(0)

    const first = invoices.data[0]

    expect(first.status).toBe("paid")
    expect(
      first.amount_paid,
      "The invoice is marked paid but carries no amount — a zero here would mean the price id resolved to nothing"
    ).toBeGreaterThan(0)
  })

  test("cancelling at period end keeps access and says when it ends", async ({
    page,
  }, testInfo) => {
    email = requireBilling(testInfo.project.name)

    const customerId = customerIdFor(email)
    const [subscription] = liveSubscriptions(customerId!)

    expect(subscription, "No live subscription to step down from").toBeTruthy()

    execFileSync("stripe", [
      "subscriptions",
      "update",
      subscription.id,
      "--cancel-at-period-end=true",
      "--confirm",
    ])

    await expectPlanHeading(page, /PRO ends on/, "PRO ends on a date")
  })

  test("ending the subscription revokes entitlement", async ({
    page,
  }, testInfo) => {
    email = requireBilling(testInfo.project.name)

    const customerId = customerIdFor(email)
    const [subscription] = liveSubscriptions(customerId!)

    expect(subscription, "No live subscription to cancel").toBeTruthy()

    cancelSubscription(subscription.id)

    await expectPlanHeading(
      page,
      /Your PRO subscription ended/,
      "the subscription ended"
    )

    // The sentence changed; this is the part that decides what the account can
    // actually do. `effectivePlan("pro", "canceled")` is `free`, so the upgrade
    // invitation is back.
    await expect(page.getByRole("link", { name: /see plans/i })).toBeVisible()
  })
})

/**
 * Fills Stripe's hosted checkout.
 *
 * Two things here were found by looking at the page rather than by assuming it,
 * and both would have failed quietly in a way that reads like a broken product:
 *
 * **The card fields do not exist until card is chosen.** The page opens on a
 * payment-method accordion — card, Cash App, bank — and renders the card form
 * only for the selected item. Waiting for `#cardNumber` on arrival times out
 * against a page that is working perfectly.
 *
 * **The submit button is not matched by its words.** Naming it `/subscribe|pay/`
 * resolves first to the accordion's own `aria-label="Pay with card"` control,
 * which is hidden once card is open, so the click retries for thirty seconds
 * against an invisible element and reports a timeout that looks like a broken
 * checkout. Stripe gives the real one a test id.
 */
async function payWithTestCard(page: Page) {
  // Wait for whichever of the two shapes this account renders, then decide.
  // Checking for the accordion the instant the URL changes finds nothing —
  // the page is still loading — and the check then passes over a step it
  // needed to take, which is how the previous attempt timed out on a page
  // that was working.
  await page
    .locator("#cardNumber, #payment-method-accordion-item-title-card")
    .first()
    .waitFor({ state: "visible", timeout: 45_000 })

  const cardMethod = page.locator("#payment-method-accordion-item-title-card")

  if (await cardMethod.isVisible().catch(() => false)) {
    await cardMethod.click({ force: true })
  }

  await page.locator("#cardNumber").waitFor({ state: "visible", timeout: 30_000 })

  await page.locator("#cardNumber").fill(TEST_CARD.number)
  await page.locator("#cardExpiry").fill(TEST_CARD.expiry)
  await page.locator("#cardCvc").fill(TEST_CARD.cvc)

  const name = page.locator("#billingName")

  if (await name.isVisible().catch(() => false)) {
    await name.fill(TEST_CARD.name)
  }

  // Collected only when the Stripe account asks for it, so it is filled when
  // present rather than required to be.
  const postal = page.locator("#billingPostalCode")

  if (await postal.isVisible().catch(() => false)) {
    await postal.fill(TEST_CARD.postal)
  }

  // The test id first, the class as a fallback: both are Stripe's and either
  // could be renamed, but between them the one thing they will not do is
  // resolve to a different button, which is what a text match did.
  await page
    .locator(
      '[data-testid="hosted-payment-submit-button"], button.SubmitButton[type="submit"]'
    )
    .first()
    .click()
}
