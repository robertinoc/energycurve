import { createClient } from "@supabase/supabase-js"

/**
 * Deleting what a spec created, so the dev database is the same after a run as
 * before it — whether the run happened once or twenty times.
 *
 * ## Why this is not done through the interface
 *
 * There is a delete button, and driving it would exercise one more path. It
 * would also make cleanup depend on the very UI the spec is testing: a run that
 * failed halfway leaves rows behind precisely when the page is broken, which is
 * the moment cleanup matters most. This talks to the database directly so that
 * a failed assertion and a failed cleanup cannot have the same cause.
 *
 * Everything hangs off `playlists` by `on delete cascade` — tracks, analyses,
 * versions, collaborators, suggestions — so deleting the playlist is the whole
 * job. Verified against the migrations rather than assumed: `0001`, `0003`,
 * `0017` and `0023` all declare it.
 *
 * ## Why the service-role key, in a file that is not app code
 *
 * `AGENTS.md` says application data access goes through `services/*`, which
 * take a `profileId` and scope every query by it. That rule is about the app's
 * security boundary. This is a test harness deleting rows whose ids it created
 * seconds earlier, and importing the service layer would drag `server-only`
 * into a Node process where it throws. The ids are the scope here.
 *
 * Reads its credentials from the environment and from nowhere else. If they are
 * absent, cleanup **fails loudly** rather than passing quietly: a spec that
 * silently stops cleaning up leaves a dev database that grows a little on every
 * run, which nobody notices until the day someone is debugging something else.
 */

function adminClient() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      "Cannot clean up after the authenticated specs: SUPABASE_URL and " +
        "SUPABASE_SERVICE_ROLE_KEY are not in the environment. They live in " +
        "`.env.local`, which a fresh git worktree does not inherit. Refusing " +
        "to finish quietly and leave rows behind in the dev database."
    )
  }

  return createClient(url, key, { auth: { persistSession: false } })
}

/**
 * Collects the playlists one spec file created, and deletes them at the end.
 *
 * A class rather than a bare array so a spec cannot forget which run its ids
 * belong to, and so the delete happens in one round trip instead of one per id.
 */
export class CreatedPlaylists {
  private readonly ids = new Set<string>()
  private readonly since = new Date().toISOString()
  private readonly email: string

  /**
   * Scoped to one test account, and to everything it gained after this object
   * was made.
   *
   * Registering ids is not enough on its own, and finding that out cost most of
   * an afternoon. When an import succeeded but the spec failed before it could
   * read the new id back, the playlist survived cleanup. On the FREE account —
   * three active playlists, by `PLAN_LIMITS` — two strays are enough to push
   * the next import over the cap, so one failure quietly became a whole file of
   * them, and the run after that started already poisoned.
   *
   * So cleanup asks the database what this account gained, rather than trusting
   * the run to have noticed. The ids are still collected because they make the
   * ordinary case exact; the timestamp is what makes it *complete*.
   */
  constructor(email: string) {
    this.email = email
  }

  /** Registers a playlist id, usually parsed out of the URL after an import. */
  add(id: string | null | undefined) {
    if (id) {
      this.ids.add(id)
    }
  }

  /** Pulls the id out of a `/dashboard/playlists/<uuid>` URL, and keeps it. */
  addFromUrl(url: string) {
    const match = /\/dashboard\/playlists\/([0-9a-f-]{36})/.exec(url)

    this.add(match?.[1])

    return match?.[1] ?? null
  }

  get size() {
    return this.ids.size
  }

  /**
   * Deletes everything this account gained since the run started.
   *
   * Never deletes anything older, so a set that was in the account before the
   * suite ran is left exactly where it was — which is the difference between
   * cleaning up and tidying somebody else's desk.
   */
  async deleteAll() {
    const supabase = adminClient()

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", this.email)
      .maybeSingle()

    if (!profile) {
      this.ids.clear()
      return
    }

    const { data, error: readError } = await supabase
      .from("playlists")
      .select("id")
      .eq("user_id", profile.id)
      .gte("created_at", this.since)

    if (readError) {
      throw new Error(`Could not list what to clean up: ${readError.message}`)
    }

    const doomed = new Set([...this.ids, ...(data ?? []).map((row) => row.id)])

    this.ids.clear()

    if (doomed.size === 0) {
      return
    }

    const { error } = await supabase
      .from("playlists")
      .delete()
      .in("id", [...doomed])

    if (error) {
      throw new Error(
        `Left ${doomed.size} playlist(s) behind for ${this.email}: ` +
          `${error.message}`
      )
    }
  }
}

/**
 * How many playlists a profile has right now.
 *
 * Used to assert the run was a round trip: same count before and after. It is a
 * stronger claim than "cleanup did not error", because it also catches a spec
 * that created something it never registered.
 */
export async function playlistCount(profileEmail: string): Promise<number> {
  const supabase = adminClient()

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", profileEmail)
    .maybeSingle()

  if (!profile) {
    return 0
  }

  const { count, error } = await supabase
    .from("playlists")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id)

  if (error) {
    throw new Error(`Could not count playlists: ${error.message}`)
  }

  return count ?? 0
}

/**
 * One registry per plan, made the first time that plan asks for it.
 *
 * Each spec file is run once per `auth-*` project, against a different account,
 * from the same module instance — so a single module-level registry would have
 * the PRO project deleting the FREE account's playlists. Keyed by plan, and the
 * plan comes from the project name at test time, which is the only place it is
 * actually known.
 */
const registries = new Map<string, CreatedPlaylists>()

export function registryFor(plan: string, email: string): CreatedPlaylists {
  const existing = registries.get(plan)

  if (existing) {
    return existing
  }

  const fresh = new CreatedPlaylists(email)

  registries.set(plan, fresh)

  return fresh
}
