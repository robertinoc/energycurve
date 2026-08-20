import "server-only"

import { toSiteLocale } from "@/lib/analysis-locale"
import { buildPaymentFailedEmail } from "@/lib/email/payment-failed"
import {
  isEmailDeliveryConfigured,
  sendTransactionalEmail,
} from "@/lib/email/send-email"
import { logError, logInfo } from "@/lib/observability/logger"
import type { Plan } from "@/lib/product/plans"
import { SITE_URL } from "@/lib/seo"
import { getSupabaseAdminClient } from "@/lib/supabase/server"

/**
 * Tells a customer their card was declined.
 *
 * Same contract as the purchase confirmation, for the same reason: never throws
 * and never awaits anything the caller depends on. The caller is the Stripe
 * webhook, where an exception means a 500, which means Stripe retries the event —
 * and a retry loop caused by a mail server having a bad minute would re-run the
 * whole branch, not just the email.
 */
export async function sendPaymentFailedNotice(
  profileId: string,
  plan: Plan,
  retriesExhausted: boolean
): Promise<void> {
  try {
    if (!isEmailDeliveryConfigured()) {
      return
    }

    const supabase = getSupabaseAdminClient()
    const { data, error } = await supabase
      .from("profiles")
      .select("email, preferred_locale")
      .eq("id", profileId)
      .maybeSingle()

    const content = buildPaymentFailedEmail({
      plan,
      appUrl: SITE_URL,
      retriesExhausted,
      locale: toSiteLocale(data?.preferred_locale ?? undefined),
    })

    if (!content) {
      return
    }

    if (error || !data?.email) {
      logError(
        "billing.payment_failed_email.no_address",
        error ?? new Error("profile has no email"),
        { profileId }
      )
      return
    }

    const delivered = await sendTransactionalEmail({
      to: data.email,
      subject: content.subject,
      text: content.text,
      html: content.html,
    })

    logInfo("billing.payment_failed_email", {
      profileId,
      plan,
      retriesExhausted,
      delivered,
    })
  } catch (error) {
    logError("billing.payment_failed_email.failed", error, { profileId, plan })
  }
}
