/**
 * Who may write to a shared set right now.
 *
 * Turn-based, chosen over real-time co-editing on purpose: with a single writer
 * there is no conflict to resolve, so there is no conflict resolution to get
 * wrong. A B2B pair passing a draft back and forth during the week needs the
 * turn, not the merge.
 *
 * The hard part isn't the lock, it's the *stale* lock. Someone takes the pen,
 * closes the laptop, and the other DJ is frozen out of their own collaboration
 * with no way to recover — which is worse than having no locking at all, because
 * at least an unlocked set can be edited. So a turn expires, and the expiry is
 * the load-bearing rule in this file.
 *
 * Pure and time-injected, so "has this expired" is testable without waiting.
 */

/**
 * How long a turn lasts without being renewed.
 *
 * Twenty minutes is long enough to reorder a set without being nagged, and short
 * enough that a laptop closed at the wrong moment doesn't block the other person
 * for their whole evening. Renewed by any write, so an active editor never hits
 * it; only an absent one does.
 */
export const EDIT_LOCK_MINUTES = 20

export interface EditLock {
  holderId: string | null
  takenAt: Date | null
}

export type LockState =
  /** Nobody holds it. Anyone with write access may take it. */
  | { kind: "free" }
  /** This reader holds it and may write. */
  | { kind: "held_by_viewer"; expiresAt: Date }
  /** Someone else holds it, and it hasn't expired. */
  | { kind: "held_by_other"; holderId: string; expiresAt: Date }
  /** Someone else holds it but the turn ran out. Takeable. */
  | { kind: "expired"; holderId: string }

/**
 * Resolves a stored lock against a reader and a clock.
 *
 * A malformed lock — a holder with no timestamp, or a timestamp with no holder —
 * resolves to `free`. Half a lock is not a lock, and treating it as one would
 * freeze a set on a bad write with no way for anyone to clear it.
 */
export function resolveLock(
  lock: EditLock,
  viewerId: string,
  now: Date = new Date()
): LockState {
  if (!lock.holderId || !lock.takenAt) {
    return { kind: "free" }
  }

  const expiresAt = new Date(
    lock.takenAt.getTime() + EDIT_LOCK_MINUTES * 60_000
  )

  if (expiresAt.getTime() <= now.getTime()) {
    return { kind: "expired", holderId: lock.holderId }
  }

  return lock.holderId === viewerId
    ? { kind: "held_by_viewer", expiresAt }
    : { kind: "held_by_other", holderId: lock.holderId, expiresAt }
}

/**
 * Whether this reader may write to the set right now.
 *
 * An expired lock counts as writable *after* taking it, not before — the caller
 * has to claim the turn explicitly. Letting a write silently steal an expired
 * turn would mean two people editing the moment both their clocks agree it
 * lapsed, which is the exact race this design exists to avoid.
 */
export function mayWrite(state: LockState): boolean {
  return state.kind === "held_by_viewer"
}

/** Whether this reader can claim the turn. */
export function mayTake(state: LockState): boolean {
  return state.kind === "free" || state.kind === "expired"
}
