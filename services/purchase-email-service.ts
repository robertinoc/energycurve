import "server-only"

import { toSiteLocale } from "@/lib/analysis-locale"
import { buildPurchaseEmail } from "@/lib/email/purchase-confirmation"
import {
  isEmailDeliveryConfigured,
  sendTransactionalEmail,
} from "@/lib/email/send-email"
import { logError, logInfo } from "@/lib/observability/logger"
import type { Plan } from "@/lib/product/plans"
import { SITE_URL } from "@/lib/seo"
import { getSupabaseAdminClient } from "@/lib/supabase/server"

/**
 * Sends the "you're on PRO" email after a purchase.
 *
 * Never throws and never awaits anything the caller depends on. The caller is
 * the Stripe webhook, where an exception means a 500, which means Stripe retries
 * the event — and a retry loop caused by a mail server having a bad minute would
 * re-run the subscription write, not just the email.
 */
export async function sendPurchaseConfirmation(
  profileId: string,
  plan: Plan,
  isUpgrade: boolean
): Promise<void> {
  try {
    if (!isEmailDeliveryConfigured()) {
      return
    }

    const supabase = getSupabaseAdminClient()
    // Address and language in one read: they live on the same row, and the
    // language decides what gets written before the address decides where.
    const { data, error } = await supabase
      .from("profiles")
      .select("email, preferred_locale")
      .eq("id", profileId)
      .maybeSingle()

    const content = buildPurchaseEmail({
      plan,
      appUrl: SITE_URL,
      isUpgrade,
      locale: toSiteLocale(data?.preferred_locale ?? undefined),
    })

    if (!content) {
      return
    }

    if (error || !data?.email) {
      logError(
        "billing.purchase_email.no_address",
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

    logInfo("billing.purchase_email", { profileId, plan, delivered })
  } catch (error) {
    logError("billing.purchase_email.failed", error, { profileId, plan })
  }
}
