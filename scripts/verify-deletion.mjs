#!/usr/bin/env node
/**
 * Does deleting an account actually delete it?
 *
 * The self-serve deletion shipped in PR #253 and the interface says the account
 * is gone. This asks the database whether that is true, table by table — which
 * is a different question, and the only one an erasure request is actually
 * about.
 *
 * ## Two phases, because after the fact there is nothing left to ask with
 *
 * Every child row hangs off `profiles.id` by `on delete cascade`, so once the
 * profile is gone there is no id to look anything up by. A one-shot "check for
 * leftovers" would find none and call it proof, when it had simply lost the
 * ability to look.
 *
 *   node scripts/verify-deletion.mjs --before someone@example.com > snap.json
 *   …delete the account through the product…
 *   node scripts/verify-deletion.mjs --after snap.json
 *
 * `--before` writes down the ids. `--after` goes looking for them by name.
 *
 * ## Read-only, and never a real person
 *
 * It only ever SELECTs. It refuses to run against an address that is not
 * obviously disposable, because the way a verification script does damage is by
 * being pointed at production by someone in a hurry.
 *
 * ## What survives on purpose, and is reported rather than ticked
 *
 * Two things outlive the account by design, and a script that showed all-green
 * without saying so would be the wrong kind of reassuring:
 *
 * - **Stripe invoices.** The customer's invoices stay under Stripe's own
 *   retention, and there are accounting obligations that compete with erasure —
 *   in most of the EU, seven to ten years. Deleting the subscription does not
 *   delete the invoice, and it should not.
 * - **The person in PostHog.** Analytics identifies by profile id. Nothing here
 *   deletes it, and this script cannot see it: PostHog is a separate system with
 *   its own API and its own deletion endpoint.
 *
 * Both are named in the output every run, with no tick beside them.
 */

import { readFileSync, existsSync } from "node:fs"

import { createClient } from "@supabase/supabase-js"

/**
 * Every table that holds something belonging to a person, and how it is tied to
 * them. Read off the migrations rather than remembered: each `link` is the
 * column that appears in a `references public.profiles` clause, or the parent
 * id for the ones that hang off a playlist.
 */
const OWNED = [
  { table: "playlists", by: "user_id", label: "playlists" },
  { table: "analyses", by: "user_id", label: "analyses" },
  { table: "curve_templates", by: "user_id", label: "curve templates" },
  { table: "user_genres", by: "user_id", label: "custom genres" },
  { table: "user_contexts", by: "user_id", label: "custom contexts" },
  { table: "feature_usage", by: "profile_id", label: "usage counters" },
  { table: "set_suggestions", by: "author_id", label: "suggestions authored" },
  { table: "privacy_requests", by: "profile_id", label: "privacy requests" },
]

/** Tables reached through the playlists, not through the profile. */
const VIA_PLAYLIST = [
  { table: "tracks", label: "tracks" },
  { table: "playlist_versions", label: "set versions" },
  { table: "set_collaborators", label: "collaborator invitations" },
]

function client() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    console.error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.\n" +
        "They live in `.env.local`. Never write them into a file in this repo."
    )
    process.exit(2)
  }

  return createClient(url, key, { auth: { persistSession: false } })
}

/**
 * Refuses anything that could be a real person.
 *
 * The check is deliberately blunt. A verification script earns its keep by
 * being run casually, and the failure mode of a casually-run script is that one
 * day it is casually pointed at somebody's actual account.
 */
function assertDisposable(email) {
  const ok =
    email.endsWith("@example.com") ||
    email.includes("+e2e") ||
    email.includes("+test") ||
    /^e2e-/.test(email)

  if (!ok) {
    console.error(
      `Refusing to run against "${email}".\n\n` +
        "This only runs against a throwaway account: an @example.com address, " +
        "one with a +e2e or +test tag, or one whose local part starts with " +
        "`e2e-`. It is read-only, but the habit of pointing it at whatever " +
        "address is to hand is the one that eventually costs somebody their data."
    )
    process.exit(2)
  }
}

async function before(email) {
  assertDisposable(email)

  const supabase = client()
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, email, workos_user_id, stripe_customer_id, stripe_subscription_id")
    .eq("email", email)
    .maybeSingle()

  if (error) {
    throw new Error(`Could not read the profile: ${error.message}`)
  }

  if (!profile) {
    console.error(`No profile with email ${email}. Nothing to snapshot.`)
    process.exit(1)
  }

  const { data: playlists } = await supabase
    .from("playlists")
    .select("id")
    .eq("user_id", profile.id)

  const playlistIds = (playlists ?? []).map((row) => row.id)
  const counts = {}

  for (const { table, by } of OWNED) {
    const { count } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq(by, profile.id)

    counts[table] = count ?? 0
  }

  for (const { table } of VIA_PLAYLIST) {
    if (playlistIds.length === 0) {
      counts[table] = 0
      continue
    }

    const { count } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .in("playlist_id", playlistIds)

    counts[table] = count ?? 0
  }

  const { count: billingRows } = await supabase
    .from("billing_events")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profile.id)

  console.log(
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        profileId: profile.id,
        email: profile.email,
        workosUserId: profile.workos_user_id,
        stripeCustomerId: profile.stripe_customer_id,
        stripeSubscriptionId: profile.stripe_subscription_id,
        playlistIds,
        counts: { ...counts, billing_events: billingRows ?? 0 },
      },
      null,
      2
    )
  )
}

async function after(snapshotPath) {
  if (!existsSync(snapshotPath)) {
    console.error(`No snapshot at ${snapshotPath}. Run --before first.`)
    process.exit(2)
  }

  const snap = JSON.parse(readFileSync(snapshotPath, "utf8"))
  const supabase = client()
  const findings = []

  const say = (label, remaining, note) =>
    findings.push({ label, remaining, note })

  // 1. The profile itself.
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", snap.profileId)
    .maybeSingle()

  say("profile row", profile ? 1 : 0)

  // 2. Everything that hangs off it.
  for (const { table, by, label } of OWNED) {
    const { count } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq(by, snap.profileId)

    say(label, count ?? 0)
  }

  // 3. Everything that hung off the playlists, found by the ids taken earlier.
  for (const { table, label } of VIA_PLAYLIST) {
    if (snap.playlistIds.length === 0) {
      say(label, 0, "none existed before the deletion")
      continue
    }

    const { count } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .in("playlist_id", snap.playlistIds)

    say(label, count ?? 0)
  }

  // 4. `billing_events` is the documented exception: the rows stay, because the
  //    row *is* the webhook idempotency guarantee and deleting it would let a
  //    redelivered Stripe event be processed as new. What must go is the
  //    payload, which carries name, email, billing address and country.
  const { data: billing } = await supabase
    .from("billing_events")
    .select("id, profile_id, payload")
    .eq("profile_id", snap.profileId)

  const orphanKept = (billing ?? []).length

  say(
    "billing_events still pointing at the profile",
    orphanKept,
    "the FK is `on delete set null`, so these should be zero"
  )

  const { data: withPayload } = await supabase
    .from("billing_events")
    .select("id")
    .is("profile_id", null)
    .not("payload", "is", null)

  say(
    "orphaned billing payloads anywhere in the table",
    (withPayload ?? []).length,
    "scrubbed by sweepBillingPayloads; a non-zero count here is the sweep " +
      "not having run, and it is not specific to this account"
  )

  // 5. The email in a text column, which no cascade can reach.
  const { data: byEmail } = await supabase
    .from("set_collaborators")
    .select("id, playlist_id")
    .eq("invited_email", snap.email)

  say(
    "collaborator invitations naming the address",
    (byEmail ?? []).length,
    "`set_collaborators.invited_email` is text, not a foreign key — it is " +
      "matched on email so an invitation works before the person has an " +
      "account. Nothing cascades to it, so a deleted user's address can " +
      "survive on somebody else's playlist"
  )

  // ---- report -------------------------------------------------------------

  const leftovers = findings.filter((one) => one.remaining > 0)

  console.log(`Deletion check for ${snap.email}`)
  console.log(`Snapshot taken ${snap.capturedAt}`)
  console.log("")

  for (const one of findings) {
    const mark = one.remaining === 0 ? "  gone" : "  LEFT"

    console.log(`${mark}  ${one.label}: ${one.remaining}`)

    if (one.note && one.remaining > 0) {
      console.log(`        ${one.note}`)
    }
  }

  console.log("")
  console.log("Outside this database, and not checked here:")
  console.log(
    `  Stripe — customer ${snap.stripeCustomerId ?? "none"}. Invoices survive ` +
      "under Stripe's retention, and accounting obligations compete with " +
      "erasure. Deleting them is a decision, not a cleanup."
  )
  console.log(
    "  PostHog — the person is keyed by profile id. Nothing in this codebase " +
      "deletes it; it needs PostHog's own deletion endpoint."
  )
  console.log(
    `  WorkOS — user ${snap.workosUserId}. Deleted by \`deleteUserEverywhere\`, ` +
      "but that is an API call this script cannot verify."
  )

  console.log("")

  if (leftovers.length === 0) {
    console.log("Nothing left in the database that should have gone.")
    process.exit(0)
  }

  console.log(
    `${leftovers.length} check(s) found rows that should not be there.`
  )
  process.exit(1)
}

const [mode, argument] = process.argv.slice(2)

if (mode === "--before" && argument) {
  await before(argument)
} else if (mode === "--after" && argument) {
  await after(argument)
} else {
  console.error(
    "Usage:\n" +
      "  node scripts/verify-deletion.mjs --before <email> > snapshot.json\n" +
      "  …delete the account through the product…\n" +
      "  node scripts/verify-deletion.mjs --after snapshot.json\n\n" +
      "Read-only. Refuses any address that is not obviously disposable."
  )
  process.exit(2)
}
