import "server-only"

import { logError, logInfo } from "@/lib/observability/logger"
import {
  normalizeInviteEmail,
  normalizeSuggestionBody,
  sameInvitee,
} from "@/lib/playlists/collaboration"
import {
  EDIT_LOCK_MINUTES,
  mayTake,
  resolveLock,
  type LockState,
} from "@/lib/playlists/edit-lock"
import { can } from "@/lib/product/capabilities"
import { getSupabaseAdminClient } from "@/lib/supabase/server"
import { getProfileBilling } from "@/services/billing-service"
import { getOwnedPlaylist, getPlaylistWithTracksById } from "@/services/playlist-service"
import type { PlaylistWithTracks } from "@/types/domain"

export interface Collaborator {
  id: string
  email: string
  createdAt: string
}

export interface Suggestion {
  id: string
  body: string
  trackId: string | null
  authorEmail: string
  isOwnerAuthor: boolean
  resolvedAt: string | null
  createdAt: string
}

export interface SharedSetSummary {
  playlistId: string
  name: string
  trackCount: number
  ownerEmail: string
  sharedAt: string
}

/**
 * Sharing a set is PRO+, and this is the only door.
 *
 * Gated on the OWNER's plan, never the collaborator's. Requiring both parties to
 * pay would mean the feature only works between two subscribers, which is not a
 * paid feature so much as a feature that mostly doesn't work — and the person
 * getting the value of "my B2B partner can see the draft" is the one who shared it.
 * A collaborator on FREE reads and comments, and that is deliberate: they are the
 * demo.
 */
async function ownerMayShare(profileId: string): Promise<boolean> {
  const billing = await getProfileBilling(profileId)

  return can(billing.plan, billing.status, "b2b_sets")
}

/**
 * Invites someone to a set by email.
 *
 * Returns why it failed rather than throwing, because every failure here is
 * something the person typing needs to read: the wrong plan, a malformed address,
 * or their own address.
 */
export async function inviteCollaborator(
  ownerProfileId: string,
  ownerEmail: string,
  playlistId: string,
  email: string
): Promise<
  | { ok: true; alreadyInvited: boolean }
  | { ok: false; reason: "not_entitled" | "not_owner" | "bad_email" | "self" | "failed" }
> {
  const normalized = normalizeInviteEmail(email)

  if (!normalized) {
    return { ok: false, reason: "bad_email" }
  }

  // Inviting yourself would create a row that grants nothing and then shows up in
  // your own "shared with me" list, which reads as a bug.
  if (sameInvitee(normalized, ownerEmail)) {
    return { ok: false, reason: "self" }
  }

  // Ownership before entitlement: a stranger poking at someone else's playlist id
  // should learn nothing about that person's plan.
  if (!(await getOwnedPlaylist(ownerProfileId, playlistId))) {
    return { ok: false, reason: "not_owner" }
  }

  if (!(await ownerMayShare(ownerProfileId))) {
    return { ok: false, reason: "not_entitled" }
  }

  const supabase = getSupabaseAdminClient()
  const { error } = await supabase.from("set_collaborators").insert({
    playlist_id: playlistId,
    invited_email: normalized,
    invited_by: ownerProfileId,
  })

  if (error) {
    // 23505 is the unique index: they're already invited, which is the intended
    // end state, so it's a success with nothing to do rather than an error.
    if (error.code === "23505") {
      return { ok: true, alreadyInvited: true }
    }

    logError("collaboration.invite_failed", error, { playlistId })
    return { ok: false, reason: "failed" }
  }

  logInfo("collaboration.invited", { playlistId })
  return { ok: true, alreadyInvited: false }
}

/** Everyone a set is shared with. Owner-only; returns empty for anyone else. */
export async function listCollaborators(
  ownerProfileId: string,
  playlistId: string
): Promise<Collaborator[]> {
  if (!(await getOwnedPlaylist(ownerProfileId, playlistId))) {
    return []
  }

  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from("set_collaborators")
    .select("id, invited_email, created_at")
    .eq("playlist_id", playlistId)
    .order("created_at", { ascending: true })

  if (error) {
    logError("collaboration.list_failed", error, { playlistId })
    return []
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    email: row.invited_email as string,
    createdAt: row.created_at as string,
  }))
}

/** Revokes an invite. Owner-only, and idempotent. */
export async function removeCollaborator(
  ownerProfileId: string,
  playlistId: string,
  collaboratorId: string
): Promise<boolean> {
  if (!(await getOwnedPlaylist(ownerProfileId, playlistId))) {
    return false
  }

  const supabase = getSupabaseAdminClient()
  // Scoped by playlist_id as well as id: without it, a valid collaborator id from
  // another set would delete a row on a playlist this caller doesn't own.
  const { error } = await supabase
    .from("set_collaborators")
    .delete()
    .eq("id", collaboratorId)
    .eq("playlist_id", playlistId)

  if (error) {
    logError("collaboration.remove_failed", error, { playlistId })
    return false
  }

  return true
}

/**
 * Sets shared with this person.
 *
 * Matched on email, so an invite sent before they signed up starts working the
 * moment they do — there is no pending state and no claim flow, which is one
 * fewer code path that runs once per user and is therefore the one that's broken.
 */
export async function listSharedWithMe(
  viewerEmail: string
): Promise<SharedSetSummary[]> {
  const normalized = normalizeInviteEmail(viewerEmail)

  if (!normalized) {
    return []
  }

  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from("set_collaborators")
    .select(
      "created_at, playlist_id, playlists(id, name), profiles!set_collaborators_invited_by_fkey(email)"
    )
    .eq("invited_email", normalized)
    .order("created_at", { ascending: false })

  if (error) {
    logError("collaboration.shared_list_failed", error, {})
    return []
  }

  const rows = (data ?? []) as unknown as Array<{
    created_at: string
    playlist_id: string
    playlists: { id: string; name: string } | null
    profiles: { email: string } | null
  }>

  // A row whose playlist is gone is skipped rather than rendered as a blank card:
  // the cascade should have removed it, and a leftover is a bug to be invisible
  // to the reader, not a broken row for them to click.
  const live = rows.filter((row) => row.playlists !== null)

  if (live.length === 0) {
    return []
  }

  const counts = await trackCounts(live.map((row) => row.playlist_id))

  return live.map((row) => ({
    playlistId: row.playlist_id,
    name: row.playlists!.name,
    trackCount: counts.get(row.playlist_id) ?? 0,
    ownerEmail: row.profiles?.email ?? "",
    sharedAt: row.created_at,
  }))
}

async function trackCounts(playlistIds: string[]): Promise<Map<string, number>> {
  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from("tracks")
    .select("playlist_id")
    .in("playlist_id", playlistIds)

  if (error) {
    return new Map()
  }

  const counts = new Map<string, number>()

  for (const row of data ?? []) {
    const id = row.playlist_id as string
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }

  return counts
}

/**
 * A shared set, for someone it was shared with.
 *
 * Returns null when they weren't invited, which is the same answer as "no such
 * playlist" on purpose: a collaborator guessing ids learns nothing about which
 * ones exist.
 */
export async function getSharedPlaylist(
  viewerEmail: string,
  playlistId: string
): Promise<{ playlist: PlaylistWithTracks; ownerEmail: string } | null> {
  const normalized = normalizeInviteEmail(viewerEmail)

  if (!normalized) {
    return null
  }

  const supabase = getSupabaseAdminClient()
  // The owner's email comes back with the access check rather than in a second
  // query: the read-only banner names whose set this is, and a banner that can't
  // name them would have to say something vaguer than the truth.
  const { data, error } = await supabase
    .from("set_collaborators")
    .select("id, profiles!set_collaborators_invited_by_fkey(email)")
    .eq("playlist_id", playlistId)
    .eq("invited_email", normalized)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  const playlist = await getPlaylistWithTracksById(playlistId)

  if (!playlist) {
    return null
  }

  const owner = (data as unknown as { profiles: { email: string } | null }).profiles

  return { playlist, ownerEmail: owner?.email ?? "" }
}

/** Suggestions on a set, oldest first — a conversation reads forwards. */
export async function listSuggestions(
  playlistId: string,
  ownerProfileId: string | null
): Promise<Suggestion[]> {
  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from("set_suggestions")
    .select("id, body, track_id, resolved_at, created_at, author_id, profiles(email)")
    .eq("playlist_id", playlistId)
    .order("created_at", { ascending: true })

  if (error) {
    logError("collaboration.suggestions_failed", error, { playlistId })
    return []
  }

  const rows = (data ?? []) as unknown as Array<{
    id: string
    body: string
    track_id: string | null
    resolved_at: string | null
    created_at: string
    author_id: string
    profiles: { email: string } | null
  }>

  return rows.map((row) => ({
    id: row.id,
    body: row.body,
    trackId: row.track_id,
    authorEmail: row.profiles?.email ?? "",
    isOwnerAuthor: row.author_id === ownerProfileId,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
  }))
}

/**
 * Leaves a suggestion.
 *
 * Open to the owner and to collaborators alike: the owner replying in their own
 * thread is the normal way a conversation goes, and a thread only one side can
 * write to isn't one.
 */
export async function addSuggestion(
  authorProfileId: string,
  authorEmail: string,
  playlistId: string,
  body: string,
  trackId: string | null
): Promise<{ ok: boolean; reason?: "no_access" | "bad_body" | "failed" }> {
  const normalized = normalizeSuggestionBody(body)

  if (!normalized) {
    return { ok: false, reason: "bad_body" }
  }

  const isOwner = Boolean(await getOwnedPlaylist(authorProfileId, playlistId))
  const isCollaborator =
    !isOwner && (await getSharedPlaylist(authorEmail, playlistId)) !== null

  if (!isOwner && !isCollaborator) {
    return { ok: false, reason: "no_access" }
  }

  const supabase = getSupabaseAdminClient()
  const { error } = await supabase.from("set_suggestions").insert({
    playlist_id: playlistId,
    author_id: authorProfileId,
    body: normalized,
    track_id: trackId,
  })

  if (error) {
    logError("collaboration.suggest_failed", error, { playlistId })
    return { ok: false, reason: "failed" }
  }

  logInfo("collaboration.suggested", { playlistId })
  return { ok: true }
}

/**
 * Marks a suggestion dealt with. Owner only.
 *
 * It means "I've handled this", which is not the commenter's to declare — see
 * `may()` in lib/playlists/collaboration.ts.
 */
export async function resolveSuggestion(
  ownerProfileId: string,
  playlistId: string,
  suggestionId: string
): Promise<boolean> {
  if (!(await getOwnedPlaylist(ownerProfileId, playlistId))) {
    return false
  }

  const supabase = getSupabaseAdminClient()
  const { error } = await supabase
    .from("set_suggestions")
    .update({ resolved_at: new Date().toISOString() })
    .eq("id", suggestionId)
    .eq("playlist_id", playlistId)

  if (error) {
    logError("collaboration.resolve_failed", error, { playlistId })
    return false
  }

  return true
}

// ---------------------------------------------------------------------------
// Turn-based editing: one writer at a time on a shared set.
// ---------------------------------------------------------------------------

/** Everyone who may hold the pen: the owner, plus anyone it's shared with. */
async function mayHoldLock(
  profileId: string,
  email: string,
  playlistId: string
): Promise<boolean> {
  if (await getOwnedPlaylist(profileId, playlistId)) {
    return true
  }

  return (await getSharedPlaylist(email, playlistId)) !== null
}

/** The stored lock, resolved against this reader and the clock. */
export async function getLockState(
  viewerId: string,
  playlistId: string
): Promise<LockState> {
  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from("playlists")
    .select("edit_lock_holder, edit_lock_taken_at")
    .eq("id", playlistId)
    .maybeSingle()

  if (error || !data) {
    // Fail towards nobody-can-write rather than everybody: an unreadable lock is
    // a reason to stop, not a reason to let two people in.
    return { kind: "held_by_other", holderId: "", expiresAt: new Date(0) }
  }

  return resolveLock(
    {
      holderId: data.edit_lock_holder,
      takenAt: data.edit_lock_taken_at
        ? new Date(data.edit_lock_taken_at)
        : null,
    },
    viewerId
  )
}

/**
 * Claims the turn.
 *
 * The conditional UPDATE is the whole design. Reading the lock and then writing it
 * would leave a window where two people both see it free and both take it — the
 * one race a single-writer model has to not have. Instead the database decides:
 * the update only matches a row whose lock is still the one we saw, so exactly one
 * of two simultaneous claims changes a row and the other gets zero.
 */
export async function takeEditLock(
  profileId: string,
  email: string,
  playlistId: string
): Promise<{ ok: boolean; reason?: "no_access" | "held" }> {
  if (!(await mayHoldLock(profileId, email, playlistId))) {
    return { ok: false, reason: "no_access" }
  }

  const state = await getLockState(profileId, playlistId)

  if (!mayTake(state) && state.kind !== "held_by_viewer") {
    return { ok: false, reason: "held" }
  }

  const supabase = getSupabaseAdminClient()
  const stale = new Date(Date.now() - EDIT_LOCK_MINUTES * 60_000).toISOString()

  // Matches only if the lock is free, already ours, or older than a turn. Two
  // claimants racing on the same free lock both pass the guard above; only one
  // passes this.
  const { data, error } = await supabase
    .from("playlists")
    .update({
      edit_lock_holder: profileId,
      edit_lock_taken_at: new Date().toISOString(),
    })
    .eq("id", playlistId)
    .or(
      `edit_lock_holder.is.null,edit_lock_holder.eq.${profileId},edit_lock_taken_at.lt.${stale}`
    )
    .select("id")

  if (error) {
    logError("collaboration.lock_take_failed", error, { playlistId })
    return { ok: false, reason: "held" }
  }

  if (!data || data.length === 0) {
    // Somebody else won the race between the read and the write.
    return { ok: false, reason: "held" }
  }

  logInfo("collaboration.lock_taken", { playlistId })
  return { ok: true }
}

/**
 * Hands the turn back.
 *
 * Scoped to the holder, so a release can't clear someone else's turn — including
 * by a stale tab whose owner took it, lost it to an expiry, and then clicked
 * "done".
 */
export async function releaseEditLock(
  profileId: string,
  playlistId: string
): Promise<boolean> {
  const supabase = getSupabaseAdminClient()
  const { error } = await supabase
    .from("playlists")
    .update({ edit_lock_holder: null, edit_lock_taken_at: null })
    .eq("id", playlistId)
    .eq("edit_lock_holder", profileId)

  if (error) {
    logError("collaboration.lock_release_failed", error, { playlistId })
    return false
  }

  return true
}

/**
 * Renews the turn on a write, so an active editor never hits the expiry.
 *
 * Fire-and-forget by contract: the write it accompanies already succeeded, and
 * failing to bump a timestamp is not a reason to tell the DJ their reorder didn't
 * happen. The worst case is a turn that lapses early and has to be re-taken.
 */
export async function touchEditLock(
  profileId: string,
  playlistId: string
): Promise<void> {
  const supabase = getSupabaseAdminClient()

  const { error } = await supabase
    .from("playlists")
    .update({ edit_lock_taken_at: new Date().toISOString() })
    .eq("id", playlistId)
    .eq("edit_lock_holder", profileId)

  if (error) {
    logError("collaboration.lock_touch_failed", error, { playlistId })
  }
}
