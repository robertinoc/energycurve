"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { CircleCheck } from "lucide-react"

import { FixMapCurve, type FixMarkerDatum } from "@/components/analysis/fix-map-curve"
import { FixPanel, type FixStatus } from "@/components/analysis/fix-panel"
import { ScoreHeader } from "@/components/analysis/score-header"
import {
  ANALYSIS_UI,
  FIX_COPY,
  formatTemplate,
} from "@/lib/content/analysis-copy"
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

export interface WorkbenchTrack {
  id: string
  artist: string
  name: string
}

/** Localized, already-interpolated copy per fix id (from the engine's
 * recommendations) — the fallback when FIX_COPY has no short template. */
export interface FixRecommendationCopy {
  id: string
  title: string
  action: string
  body: string
}

export interface AnalysisWorkbenchProps {
  playlistId: string
  /** Tracks in the ORIGINAL saved order. */
  tracks: WorkbenchTrack[]
  /** Energies resolved for the original order (index-aligned). */
  energies: ResolvedTrackEnergy[]
  fixes: SetFix[]
  recommendations: FixRecommendationCopy[]
  genre: SupportedGenre
  context: PlaylistContext
  /** Score the engine computed for the original order. */
  baseScore: number
  /** Ideal curve, index-aligned to the set length. */
  targetCurve: number[]
  locale: SiteLocale
}

/**
 * Client container of the redesigned analysis screen. Owns the ONLY piece of
 * view state — `{applied, discarded}` fix-id sets + the selected fix — and
 * derives everything else: the current order (deriveOrder), the recalculated
 * score (same engine as the base score) and the reachable potential.
 */
export function AnalysisWorkbench({
  playlistId,
  tracks,
  energies,
  fixes,
  recommendations,
  genre,
  context,
  baseScore,
  targetCurve,
  locale,
}: AnalysisWorkbenchProps) {
  const originalIds = useMemo(() => tracks.map((track) => track.id), [tracks])
  const tracksById = useMemo(
    () => new Map(tracks.map((track) => [track.id, track])),
    [tracks]
  )
  const energiesById = useMemo(
    () => new Map(originalIds.map((id, index) => [id, energies[index]])),
    [originalIds, energies]
  )
  const recsById = useMemo(
    () => new Map(recommendations.map((rec) => [rec.id, rec])),
    [recommendations]
  )

  const [applied, setApplied] = useState<Set<string>>(new Set())
  const [discarded, setDiscarded] = useState<Set<string>>(new Set())
  const [hydrated, setHydrated] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const fixIds = useMemo(() => new Set(fixes.map((fix) => fix.id)), [fixes])

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

  const reconsiderFix = useCallback((fixId: string) => {
    setDiscarded((current) => {
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

  const orderedScores = useMemo(
    () => order.map((id) => energiesById.get(id)?.score ?? 0),
    [order, energiesById]
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
  const remainingCount = decidable.length - decidedCount

  const potential = Math.max(
    potentialScore(baseScore, fixes, discarded),
    currentScore
  )
  const gainedPoints = Math.max(0, currentScore - baseScore)
  const totalPoints = Math.max(0, potential - baseScore)

  // Navigable fixes (panel + arrows): every non-positive issue, curve order.
  const navigable = useMemo(
    () =>
      fixes
        .filter((fix) => fix.severity !== "positive")
        .sort((a, b) => a.markerPosition - b.markerPosition),
    [fixes]
  )

  const selectedFix =
    fixes.find((fix) => fix.id === selectedId) ??
    navigable.find(
      (fix) => !applied.has(fix.id) && !discarded.has(fix.id)
    ) ??
    navigable[0] ??
    null

  const navigate = useCallback(
    (direction: 1 | -1) => {
      if (navigable.length === 0) {
        return
      }

      const currentIndex = selectedFix
        ? navigable.findIndex((fix) => fix.id === selectedFix.id)
        : -1
      const nextIndex =
        (currentIndex + direction + navigable.length) % navigable.length
      setSelectedId(navigable[nextIndex].id)
    },
    [navigable, selectedFix]
  )

  // Curve markers anchored on the track that causes each issue, located in
  // the CURRENT derived order (markers follow their track when fixes move it).
  const markers: FixMarkerDatum[] = useMemo(
    () =>
      fixes.map((fix) => {
        const anchorId =
          fix.tracks[0]?.id || originalIds[fix.markerPosition - 1] || order[0]
        const index = Math.max(0, order.indexOf(anchorId))

        return { fix, index, applied: applied.has(fix.id) }
      }),
    [fixes, originalIds, order, applied]
  )

  const status: FixStatus = selectedFix
    ? applied.has(selectedFix.id)
      ? "applied"
      : discarded.has(selectedFix.id)
        ? "discarded"
        : "pending"
    : "pending"

  // Before/after windows: the real curve segment around the fix, without vs
  // with this fix applied (on top of everything else currently applied).
  const { beforeWindow, afterWindow } = useMemo(() => {
    if (!selectedFix || selectedFix.operations.length === 0) {
      return { beforeWindow: [], afterWindow: [] }
    }

    const without = new Set(applied)
    without.delete(selectedFix.id)
    const withFix = new Set(without).add(selectedFix.id)

    const beforeOrder = deriveOrder(originalIds, fixes, without)
    const afterOrder = deriveOrder(originalIds, fixes, withFix)
    const anchorId =
      selectedFix.operations[0]?.trackId ?? selectedFix.tracks[0]?.id

    const center = Math.max(0, afterOrder.indexOf(anchorId ?? ""))
    const start = Math.max(0, center - 3)
    const end = Math.min(afterOrder.length, center + 4)

    const scoresOf = (ids: string[]) =>
      ids.slice(start, end).map((id) => energiesById.get(id)?.score ?? 0)

    return {
      beforeWindow: scoresOf(beforeOrder),
      afterWindow: scoresOf(afterOrder),
    }
  }, [selectedFix, applied, originalIds, fixes, energiesById])

  const panelCopy = useMemo(() => {
    if (!selectedFix) {
      return null
    }

    const rec = recsById.get(selectedFix.id)
    const short = FIX_COPY[selectedFix.issueType]
    const trackName = (id: string | undefined) =>
      (id && tracksById.get(id)?.name) || "—"

    if (!short) {
      return {
        title: rec?.title ?? selectedFix.issueType,
        action: rec?.action ?? "",
        why: rec?.body ?? "",
      }
    }

    const bridgeId = selectedFix.operations[0]?.trackId
    const params = {
      bridge: trackName(bridgeId),
      track: trackName(bridgeId),
      from: selectedFix.tracks[0]?.position ?? "",
      to:
        selectedFix.issueType === "early_peak" ||
        selectedFix.issueType === "context_high_peak"
          ? (selectedFix.operations[0]?.toIndex ?? 0) + 1
          : (selectedFix.tracks[1]?.position ?? ""),
      delta: Math.abs(selectedFix.delta ?? 0),
      count: selectedFix.tracks.length,
    }

    return {
      title: rec?.title ?? selectedFix.issueType,
      action: formatTemplate(short.action[locale], params),
      why: formatTemplate(short.why[locale], params),
    }
  }, [selectedFix, recsById, tracksById, locale])

  const chips = useMemo(() => {
    if (!selectedFix) {
      return []
    }

    return selectedFix.tracks.map((ref) => ({
      position: ref.position,
      name: tracksById.get(ref.id)?.name ?? "—",
    }))
  }, [selectedFix, tracksById])

  const navigableIndex = selectedFix
    ? navigable.findIndex((fix) => fix.id === selectedFix.id)
    : -1

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

      {fixes.length === 0 ? (
        <div className="rounded-2xl border border-ec-border bg-ec-surface p-5">
          <p className="mb-4 flex items-center gap-2 text-sm text-ec-text-muted">
            <CircleCheck className="size-4 shrink-0 text-ec-cyan" />
            {ANALYSIS_UI.noFixesCoach[locale]}
          </p>
          <FixMapCurve
            scores={orderedScores}
            target={targetCurve}
            markers={[]}
            selectedFixId={null}
            onSelect={() => {}}
            onNavigate={() => {}}
            locale={locale}
          />
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
          <FixMapCurve
            scores={orderedScores}
            target={targetCurve}
            markers={markers}
            selectedFixId={selectedFix?.id ?? null}
            onSelect={setSelectedId}
            onNavigate={navigate}
            locale={locale}
          />
          {selectedFix && panelCopy ? (
            <FixPanel
              fix={selectedFix}
              title={panelCopy.title}
              actionText={panelCopy.action}
              whyText={panelCopy.why}
              index={navigableIndex + 1}
              total={navigable.length}
              status={status}
              beforeWindow={beforeWindow}
              afterWindow={afterWindow}
              chips={chips}
              onPrev={() => navigate(-1)}
              onNext={() => navigate(1)}
              onApply={() => applyFix(selectedFix.id)}
              onUndo={() => undoFix(selectedFix.id)}
              onDiscard={() => discardFix(selectedFix.id)}
              onReconsider={() => reconsiderFix(selectedFix.id)}
              locale={locale}
            />
          ) : null}
        </div>
      )}

      {applied.size === 0 && discarded.size === 0 ? null : (
        <button
          type="button"
          onClick={resetAll}
          className="text-xs text-white/48 underline decoration-white/24 underline-offset-4 hover:text-white"
        >
          {locale === "es" ? "Reiniciar decisiones" : "Reset decisions"}
        </button>
      )}
    </div>
  )
}
