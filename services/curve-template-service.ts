import "server-only"

import { logError } from "@/lib/observability/logger"
import {
  parseAnchors,
  type CurveAnchor,
} from "@/lib/playlists/curve-template"
import { getSupabaseAdminClient } from "@/lib/supabase/server"
import type { Json } from "@/types/database"

export interface CurveTemplate {
  id: string
  name: string
  anchors: CurveAnchor[]
}

/**
 * A user's saved shapes, newest first.
 *
 * Rows whose anchors don't parse are dropped rather than surfaced broken: the
 * column is jsonb, and a template that half-reads would score a set against a
 * shape nobody designed.
 */
export async function listCurveTemplates(
  profileId: string
): Promise<CurveTemplate[]> {
  const supabase = getSupabaseAdminClient()

  const { data, error } = await supabase
    .from("curve_templates")
    .select("id, name, anchors")
    .eq("user_id", profileId)
    .order("created_at", { ascending: false })

  if (error) {
    logError("curve_template.list_failed", error, { profileId })
    return []
  }

  return (data ?? []).flatMap((row) => {
    const anchors = parseAnchors(row.anchors)

    if (!anchors) {
      logError(
        "curve_template.unreadable",
        new Error("anchors failed to parse"),
        { profileId, templateId: row.id }
      )
      return []
    }

    return [{ id: row.id, name: row.name, anchors }]
  })
}

/** One template, scoped to its owner so an id alone can't fetch someone else's. */
export async function getCurveTemplate(
  profileId: string,
  templateId: string
): Promise<CurveTemplate | null> {
  const supabase = getSupabaseAdminClient()

  const { data } = await supabase
    .from("curve_templates")
    .select("id, name, anchors")
    .eq("user_id", profileId)
    .eq("id", templateId)
    .maybeSingle()

  if (!data) {
    return null
  }

  const anchors = parseAnchors(data.anchors)

  return anchors ? { id: data.id, name: data.name, anchors } : null
}

export async function createCurveTemplate(
  profileId: string,
  name: string,
  anchors: CurveAnchor[]
): Promise<CurveTemplate | null> {
  const supabase = getSupabaseAdminClient()

  const { data, error } = await supabase
    .from("curve_templates")
    .insert({
      user_id: profileId,
      name,
      anchors: anchors as unknown as Json,
    })
    .select("id, name, anchors")
    .single()

  if (error || !data) {
    logError("curve_template.create_failed", error, { profileId })
    return null
  }

  return { id: data.id, name: data.name, anchors }
}

/** Scoped by owner: the id alone must not be enough to delete anything. */
export async function deleteCurveTemplate(
  profileId: string,
  templateId: string
): Promise<void> {
  const supabase = getSupabaseAdminClient()

  const { error } = await supabase
    .from("curve_templates")
    .delete()
    .eq("user_id", profileId)
    .eq("id", templateId)

  if (error) {
    logError("curve_template.delete_failed", error, { profileId, templateId })
  }
}
