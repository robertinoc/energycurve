"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { ScoreHeader } from "@/components/analysis/score-header"
import type { SiteLocale } from "@/lib/content/site-copy"
import {
  deriveOrder,
  potentialScore,
  scoreOrder,
  type SetFix,
} from "@/lib/engine/fixes"
import type {
  PlaylistContext,
  SupportedGenre,
} from "@/lib/product/strategy"
import type { ResolvedTrackEnergy } from "@/types/analysis"

/** Per-playlist persistence of the user's decisions (survives reloads). */
function storageKey(playlistId: string) {
  return `energycurve.analysis.fixes.${playlistId}`
}

interface StoredDecisions {
  applied: string[]
  discarded: string[]
}

function readStoredDecisions(
  playlistId: string,
  validIds: ReadonlySet<string>
): { applied: Set<string>; discarded: Set<string> } {
  try {
    const raw = window.localStorage.getItem(storageKey(playlistId))

    if (!raw) {
      return { applied: new Set(), discarded: new Set() }
    }

    const parsed = JSON.parse(raw) as Partial<StoredDecisions>
    // Fix ids are stable (type + positions), but a re-analysis can change the
    // issue set — drop decisions whose fix no longer exists.
    const keep = (ids: unknown) =>
      new Set(
        (Array.isArray(ids) ? ids : []).filter(
          (id): id is string => typeof id === "string" && validIds.has(id)
        )
      )

    return { applied: keep(parsed.applied), discarded: keep(parsed.discarded) }
  } catch {
    return { applied: new Set(), discarded: new Set() }
  }
}

export interface AnalysisWorkbenchProps {
  playlistId: string
  /** Track ids in the ORIGINAL saved order. */
  originalIds: string[]
  /** Energies resolved for the original order (index-aligned). */
  energies: ResolvedTrackEnergy[]
  fixes: SetFix[]
  genre: SupportedGenre
  context: PlaylistContext
  /** Score the engine computed for the original order. */
  baseScore: number
  locale: SiteLocale
}

/**
 * Client container of the redesigned analysis screen. Owns the ONLY piece of
 * view state — `{applied, discarded}` fix-id sets — and derives everything
 * else: the current order (deriveOrder), the recalculated score (the same
 * engine that produced the base score) and the reachable potential. Zones 2
 * (curve + fix panel) and 3 (live tracklist) plug into this same state.
 */
export function AnalysisWorkbench({
  playlistId,
  originalIds,
  energies,
  fixes,
  genre,
  context,
  baseScore,
  locale,
}: AnalysisWorkbenchProps) {
  const [applied, setApplied] = useState<Set<string>>(new Set())
  const [discarded, setDiscarded] = useState<Set<string>>(new Set())
  const [hydrated, setHydrated] = useState(false)

  const fixIds = useMemo(() => new Set(fixes.map((fix) => fix.id)), [fixes])

  // Restore persisted decisions after mount (localStorage is unavailable at
  // SSR; starting empty avoids a hydration mismatch).
  useEffect(() => {
    const stored = readStoredDecisions(playlistId, fixIds)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setApplied(stored.applied)
    setDiscarded(stored.discarded)
    setHydrated(true)
  }, [playlistId, fixIds])

  useEffect(() => {
    if (!hydrated) {
      return
    }

    window.localStorage.setItem(
      storageKey(playlistId),
      JSON.stringify({
        applied: [...applied],
        discarded: [...discarded],
      } satisfies StoredDecisions)
    )
  }, [playlistId, applied, discarded, hydrated])

  const applyFix = useCallback((fixId: string) => {
    setApplied((current) => new Set(current).add(fixId))
    setDiscarded((current) => {
      const next = new Set(current)
      next.delete(fixId)
      return next
    })
  }, [])

  const undoFix = useCallback((fixId: string) => {
    setApplied((current) => {
      const next = new Set(current)
      next.delete(fixId)
      return next
    })
  }, [])

  const discardFix = useCallback((fixId: string) => {
    setDiscarded((current) => new Set(current).add(fixId))
    setApplied((current) => {
      const next = new Set(current)
      next.delete(fixId)
      return next
    })
  }, [])

  const resetAll = useCallback(() => {
    setApplied(new Set())
    setDiscarded(new Set())
  }, [])

  // Everything below is DERIVED — the tracklist is never mutated in place.
  const order = useMemo(
    () => deriveOrder(originalIds, fixes, applied),
    [originalIds, fixes, applied]
  )

  const currentScore = useMemo(
    () =>
      applied.size === 0
        ? baseScore
        : scoreOrder(order, originalIds, energies, genre, context),
    [applied.size, order, originalIds, energies, genre, context, baseScore]
  )

  const decidable = useMemo(
    () => fixes.filter((fix) => fix.operations.length > 0),
    [fixes]
  )
  const decidedCount = decidable.filter(
    (fix) => applied.has(fix.id) || discarded.has(fix.id)
  ).length
  const remainingCount = decidable.filter(
    (fix) => !applied.has(fix.id) && !discarded.has(fix.id)
  ).length

  // Potential never moves when applying (only discarding lowers it), and is
  // never shown below the engine-measured current score.
  const potential = Math.max(
    potentialScore(baseScore, fixes, discarded),
    currentScore
  )

  const gainedPoints = Math.max(0, currentScore - baseScore)
  const totalPoints = Math.max(0, potential - baseScore)

  // Zone 2/3 consumers (curve markers, fix panel, live tracklist) mount here
  // in the next stages and receive {order, applyFix, undoFix, discardFix,
  // resetAll} — the callbacks already exist so the header math is final.
  void undoFix
  void resetAll

  return (
    <div className="space-y-5">
      <ScoreHeader
        currentScore={currentScore}
        potentialScore={potential}
        gainedPoints={gainedPoints}
        totalPoints={totalPoints}
        remainingCount={remainingCount}
        decidableCount={decidable.length}
        decidedCount={decidedCount}
        locale={locale}
      />
      {/* Zone 2 (curve as map + fix panel) and zone 3 (live tracklist) land
          here next. */}
      {applied.size === 0 && discarded.size === 0 ? null : (
        <button
          type="button"
          onClick={resetAll}
          className="text-xs text-white/48 underline decoration-white/24 underline-offset-4 hover:text-white"
        >
          {locale === "es" ? "Reiniciar decisiones" : "Reset decisions"}
        </button>
      )}
      {/* Temporary dev affordance until zone 2 lands: apply/discard the first
          pending fix so the header can be exercised in the preview. Removed
          when the fix panel arrives. */}
      {process.env.NODE_ENV !== "production" && remainingCount > 0 ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              const next = decidable.find(
                (fix) => !applied.has(fix.id) && !discarded.has(fix.id)
              )
              if (next) applyFix(next.id)
            }}
            className="rounded-lg border border-white/14 px-3 py-1.5 text-xs text-white/72 hover:bg-white/10"
          >
            [dev] aplicar próximo arreglo
          </button>
          <button
            type="button"
            onClick={() => {
              const next = decidable.find(
                (fix) => !applied.has(fix.id) && !discarded.has(fix.id)
              )
              if (next) discardFix(next.id)
            }}
            className="rounded-lg border border-white/14 px-3 py-1.5 text-xs text-white/72 hover:bg-white/10"
          >
            [dev] descartar próximo
          </button>
        </div>
      ) : null}
    </div>
  )
}
