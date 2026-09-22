"use server"

import { withAuth } from "@workos-inc/authkit-nextjs"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { buildReturnToHref } from "@/lib/auth/return-to"
import { isSuspended } from "@/lib/auth/suspension"
import { DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import { logError, logWarn } from "@/lib/observability/logger"
import { consumeRateLimit } from "@/services/rate-limit-service"
import { getRequestLocale } from "@/lib/server-locale"
import { formatPlanDate } from "@/lib/product/plan-summary"
import { sendDeletionScheduledEmail } from "@/services/account-deletion-email-service"
import {
  cancelAccountDeletion,
  requestAccountDeletion,
} from "@/services/account-deletion-service"
import { notifyPrivacyRequest } from "@/services/privacy-request-email-service"
import {
  countOpenPrivacyRequests,
  createPrivacyRequest,
} from "@/services/privacy-request-service"
import {
  syncProfileFromWorkOSUser,
  updateDisplayName,
} from "@/services/profile-service"

/**
 * Rectification, GDPR Art. 16.
 *
 * The gap assessment listed this as one of four reds that are really one
 * problem: a user could export their data and do nothing else with it. The
 * concrete version of that was having to email support to fix a typo in your
 * own name.
 *
 * Name only. Email rectification changes the login identity and silently drops
 * every set shared with you — `set_collaborators` is keyed by address — so it
 * needs a product decision and a confirmation screen, not a save button. Said
 * out loud in `services/profile-service.ts` and in the gap assessment rather
 * than left as a gap someone rediscovers.
 */

const COPY = DASHBOARD_COPY.account

export interface AccountActionState {
  ok: boolean
  message: string | null
}

export const IDLE_ACCOUNT_STATE: AccountActionState = { ok: false, message: null }

/**
 * Six an hour. Generous for a field someone edits once, and low enough that the
 * WorkOS API is not reachable as an unbounded write through our session.
 */
const RATE_LIMIT = { limit: 6, windowMs: 60 * 60 * 1000 }

/**
 * Both parts optional, both capped, and trimmed before length is judged so a
 * name of spaces cannot pass as 40 characters.
 *
 * No character-class restriction on purpose: names contain apostrophes, hyphens,
 * accents and scripts this codebase has no business ruling on, and a validator
 * that rejects a real name is worse than one that accepts an odd one. Rendering
 * is React's job, and it escapes.
 */
const nameSchema = z.object({
  firstName: z.string().trim().max(80).optional(),
  lastName: z.string().trim().max(80).optional(),
})

export async function updateNameAction(
  _previous: AccountActionState,
  formData: FormData
): Promise<AccountActionState> {
  const { user } = await withAuth()

  if (!user) {
    redirect(buildReturnToHref("/login", "/dashboard/account"))
  }

  const profile = await syncProfileFromWorkOSUser({
    id: user.id,
    email: user.email,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
  })

  // Same gate as every other write in the product: suspension has to be an
  // authorization check, not a page gate.
  if (isSuspended(profile)) {
    redirect("/account-suspended")
  }

  const locale: SiteLocale = await getRequestLocale()

  const { allowed } = await consumeRateLimit({
    key: `account-name:${profile.id}`,
    limit: RATE_LIMIT.limit,
    windowMs: RATE_LIMIT.windowMs,
  })

  if (!allowed) {
    logWarn("account.name_rate_limited", { profileId: profile.id })

    return { ok: false, message: COPY.nameRateLimited[locale] }
  }

  const parsed = nameSchema.safeParse({
    firstName: formData.get("firstName")?.toString() ?? "",
    lastName: formData.get("lastName")?.toString() ?? "",
  })

  if (!parsed.success) {
    return { ok: false, message: COPY.nameInvalid[locale] }
  }

  try {
    await updateDisplayName(
      user.id,
      parsed.data.firstName || null,
      parsed.data.lastName || null
    )
  } catch (error) {
    logError("account.name_update_failed", error, { profileId: profile.id })

    return { ok: false, message: COPY.nameFailed[locale] }
  }

  // The page reads the name straight off the WorkOS session, so without this the
  // form would report success above a field still showing the old value.
  revalidatePath("/dashboard/account")

  return { ok: true, message: COPY.nameSaved[locale] }
}

/**
 * The rights that are not a button: Art. 16 for the email, Art. 18, Art. 21.
 *
 * Three of the four reds in the gap assessment, and the fix is deliberately not
 * "make them self-serve". None of the three is mechanical: restricting
 * processing is a judgement about what to stop, objecting is a judgement about
 * a balance, and changing the email moves the login identity and drops shares
 * matched by address. What they were missing was not a switch — it was a record
 * and a deadline.
 *
 * `docs/compliance/dsar-procedure.md` had already established that emailing
 * hello@ is a valid mechanism under Art. 12, conditional on somebody answering
 * inside a month. This action is what makes the condition observable: the
 * request lands in a table with its own stored deadline, shows up in the panel
 * sorted by what is due soonest, and is shown back to the person who filed it
 * with the date. A clock only one side can see is a clock that gets missed
 * quietly.
 *
 * Identity verification comes for free and is worth saying why: this runs inside
 * an authenticated session, so the request arrives from the account itself. The
 * procedure's rule is that a request from the account address is already
 * verified, and asking for a document to confirm what the channel already
 * confirms means collecting new personal data to protect old personal data.
 */

/**
 * Three an hour, and the real bound is elsewhere.
 *
 * The rate limit stops a loop; what stops a pile-up is
 * `countOpenPrivacyRequests` below, because the thing worth bounding is not how
 * fast somebody files but how many unanswered requests they can accumulate.
 * Someone with three open requests does not need a fourth, they need an answer.
 */
const RIGHTS_RATE_LIMIT = { limit: 3, windowMs: 60 * 60 * 1000 }

/** Past this, the queue is the problem and another row will not help. */
const MAX_OPEN_REQUESTS = 3

const rightsSchema = z.object({
  kind: z.enum(["rectify_email", "object", "restrict", "other"]),
  // Two thousand characters is far more than anyone needs and still bounded.
  // Trimmed before the length is judged, and empty becomes null rather than ""
  // so the retention sweep's `details is not null` filter means what it says.
  details: z.string().trim().max(2000).optional(),
})

export async function filePrivacyRequestAction(
  _previous: AccountActionState,
  formData: FormData
): Promise<AccountActionState> {
  const { user } = await withAuth()

  if (!user) {
    redirect(buildReturnToHref("/login", "/dashboard/account"))
  }

  const profile = await syncProfileFromWorkOSUser({
    id: user.id,
    email: user.email,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
  })

  if (isSuspended(profile)) {
    redirect("/account-suspended")
  }

  const locale: SiteLocale = await getRequestLocale()

  const { allowed } = await consumeRateLimit({
    key: `privacy-request:${profile.id}`,
    limit: RIGHTS_RATE_LIMIT.limit,
    windowMs: RIGHTS_RATE_LIMIT.windowMs,
  })

  if (!allowed) {
    logWarn("privacy_request.rate_limited", { profileId: profile.id })

    return { ok: false, message: COPY.rightsTooMany[locale] }
  }

  const parsed = rightsSchema.safeParse({
    kind: formData.get("kind")?.toString() ?? "",
    details: formData.get("details")?.toString() ?? "",
  })

  if (!parsed.success) {
    return { ok: false, message: COPY.rightsInvalid[locale] }
  }

  if ((await countOpenPrivacyRequests(profile.id)) >= MAX_OPEN_REQUESTS) {
    logWarn("privacy_request.queue_full", { profileId: profile.id })

    return { ok: false, message: COPY.rightsTooMany[locale] }
  }

  const request = await createPrivacyRequest({
    profileId: profile.id,
    kind: parsed.data.kind,
    details: parsed.data.details || null,
    requesterEmail: user.email,
  })

  if (!request) {
    // The service already logged the cause. The copy points at hello@ and says
    // the deadline is the same either way, which is true and is the only thing
    // that matters to someone whose request just failed to save.
    return { ok: false, message: COPY.rightsFailed[locale] }
  }

  // Delivery is best-effort and the row is not: if the mail fails the request
  // still exists, still has its deadline, and still shows up in the panel. The
  // opposite arrangement — mail sent, nothing recorded — is the one that loses
  // a legal obligation, and it is what "write to hello@" was.
  await notifyPrivacyRequest({
    kind: parsed.data.kind,
    requestId: request.id,
    requesterEmail: user.email,
    details: parsed.data.details || null,
    dueAt: request.dueAt,
  })

  revalidatePath("/dashboard/account")

  return { ok: true, message: COPY.rightsFiled[locale] }
}

/**
 * Erasure, Art. 17, self-serve, with thirty days of grace.
 *
 * The last of the four reds in the gap assessment, and the only one where the
 * fix is genuinely a button. It was open because the ask needed a decision
 * rather than code: `deleteUserEverywhere` already did the heavy lifting and was
 * already tested; what was missing was a user-facing surface and an answer to
 * "how much friction, what grace, and what happens to a live subscription".
 *
 * The answers, all three visible in the copy before anyone can confirm:
 *
 * - **Friction: type the account email.** Not a checkbox. A checkbox stops a
 *   misclick and nothing else, and this is the one irreversible thing on the
 *   page. It does not defend against a hijacked session — whoever has the
 *   session can read the address off the page — which is what the notification
 *   email is for.
 * - **Grace: thirty days, fully reversible, account keeps working.** Somebody
 *   who just asked to be deleted is exactly who most needs to download their
 *   data first, so locking them out would answer an erasure request by removing
 *   portability. And because the account still works, cancelling needs no signed
 *   token in a URL — which is the pattern the security audit kept finding.
 * - **Subscription: stops renewing now, plan runs to the period already paid
 *   for, no refund, and it all goes back if the request is withdrawn.** Said
 *   with the exact date before confirming, because a surprise about money
 *   afterwards is a chargeback.
 */

/**
 * Two an hour, which is the tightest limit on this page.
 *
 * Not because scheduling is expensive, but because the typed-email check makes
 * this endpoint an oracle otherwise: unlimited attempts against a known session
 * is not a threat, but unlimited attempts is never the shape you want in front
 * of a destructive action.
 */
const DELETE_RATE_LIMIT = { limit: 2, windowMs: 60 * 60 * 1000 }

export async function requestAccountDeletionAction(
  _previous: AccountActionState,
  formData: FormData
): Promise<AccountActionState> {
  const { user } = await withAuth()

  if (!user) {
    redirect(buildReturnToHref("/login", "/dashboard/account"))
  }

  const profile = await syncProfileFromWorkOSUser({
    id: user.id,
    email: user.email,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
  })

  if (isSuspended(profile)) {
    redirect("/account-suspended")
  }

  const locale: SiteLocale = await getRequestLocale()

  const { allowed } = await consumeRateLimit({
    key: `account-delete:${profile.id}`,
    limit: DELETE_RATE_LIMIT.limit,
    windowMs: DELETE_RATE_LIMIT.windowMs,
  })

  if (!allowed) {
    logWarn("account_deletion.rate_limited", { profileId: profile.id })

    return { ok: false, message: COPY.deleteRateLimited[locale] }
  }

  // Case-insensitive and trimmed, because an address is not case-sensitive in
  // the part that matters and a trailing space from a paste is not a different
  // intent. Compared against the session's email, not against a form field.
  const typed = (formData.get("confirmEmail")?.toString() ?? "").trim()

  if (typed.toLowerCase() !== user.email.toLowerCase()) {
    logWarn("account_deletion.confirmation_mismatch", { profileId: profile.id })

    return { ok: false, message: COPY.deleteMismatch[locale] }
  }

  const result = await requestAccountDeletion(profile.id)

  if (!result) {
    return { ok: false, message: COPY.deleteFailed[locale] }
  }

  // After the schedule, not before: a mail announcing a deletion that then
  // failed to schedule would be the worse of the two possible wrong orders.
  await sendDeletionScheduledEmail({
    to: user.email,
    scheduledFor: result.scheduledFor,
    preferredLocale: profile.preferred_locale,
  })

  revalidatePath("/dashboard/account")

  const scheduled = COPY.deleteScheduled[locale].replace(
    "{date}",
    formatPlanDate(new Date(result.scheduledFor), locale)
  )

  // Reported as `ok` even when the subscription part failed, because the thing
  // the person asked for did happen. Hiding the billing failure behind a generic
  // error would leave them believing the deletion failed too.
  return {
    ok: true,
    message: result.subscriptionNeedsAttention
      ? `${scheduled} ${COPY.deleteSubscriptionWarning[locale]}`
      : scheduled,
  }
}

/** Withdraws a scheduled deletion. No confirmation: it is the safe direction. */
export async function cancelAccountDeletionAction(
  _previous: AccountActionState,
  _formData: FormData
): Promise<AccountActionState> {
  // `useActionState` fixes this signature at (previousState, formData). This is
  // the one action on the page that takes no input at all — withdrawing a
  // deletion needs nothing typed and nothing confirmed — so both parameters are
  // named and deliberately unused.
  void _previous
  void _formData

  const { user } = await withAuth()

  if (!user) {
    redirect(buildReturnToHref("/login", "/dashboard/account"))
  }

  const profile = await syncProfileFromWorkOSUser({
    id: user.id,
    email: user.email,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
  })

  // No suspension gate here, and that is deliberate rather than an oversight:
  // keeping your account is not a write anyone needs protecting from, and a
  // suspended account whose deletion is pending should still be able to stop
  // the clock.
  const locale: SiteLocale = await getRequestLocale()
  const cancelled = await cancelAccountDeletion(profile.id)

  if (!cancelled) {
    return { ok: false, message: COPY.deleteCancelFailed[locale] }
  }

  revalidatePath("/dashboard/account")

  return { ok: true, message: COPY.deleteCancelled[locale] }
}
