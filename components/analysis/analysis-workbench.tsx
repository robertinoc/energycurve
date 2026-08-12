"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { CircleCheck, Loader2, Sparkles } from "lucide-react"

import { reorderTracksAction } from "@/app/dashboard/playlists/actions"
import { PlaylistExportButton } from "@/components/playlists/playlist-export-button"
import type { ExportPlaylist } from "@/lib/playlists/export"
import { FixMapCurve, type FixMarkerDatum } from "@/components/analysis/fix-map-curve"
import { FixPanel, type FixStatus } from "@/components/analysis/fix-panel"
import {
  LiveTracklist,
  type LiveTracklistRow,
  type SmartOrderStatus,
} from "@/components/analysis/live-tracklist"
import { ScoreHeader } from "@/components/analysis/score-header"
import {
  ANALYSIS_UI,
  CONTEXT_DISPLAY_NAMES,
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
  /** Full order set by smart ordering (zone 4), if any. */
  smartOrder?: string[] | null
  smartSource?: "claude" | "fallback" | null
}

function readStoredDecisions(
  playlistId: string,
  validIds: ReadonlySet<string>,
  trackIds: ReadonlySet<string>
): {
  applied: Set<string>
  discarded: Set<string>
  smartOrder: string[] | null
  smartSource: "claude" | "fallback" | null
} {
  const empty = {
    applied: new Set<string>(),
    discarded: new Set<string>(),
    smartOrder: null,
    smartSource: null,
  }

  try {
    const raw = window.localStorage.getItem(storageKey(playlistId))

    if (!raw) {
      return empty
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

    // A stored smart order is only valid if it is EXACTLY the current track
    // set (tracks added/removed since invalidate it).
    const storedOrder = Array.isArray(parsed.smartOrder)
      ? parsed.smartOrder.filter((id): id is string => typeof id === "string")
      : null
    const smartOrder =
      storedOrder &&
      storedOrder.length === trackIds.size &&
      storedOrder.every((id) => trackIds.has(id)) &&
      new Set(storedOrder).size === storedOrder.length
        ? storedOrder
        : null

    return {
      applied: keep(parsed.applied),
      discarded: keep(parsed.discarded),
      smartOrder,
      smartSource:
        smartOrder && (parsed.smartSource === "claude" || parsed.smartSource === "fallback")
          ? parsed.smartSource
          : null,
    }
  } catch {
    return empty
  }
}

export interface WorkbenchTrack {
  id: string
  artist: string
  name: string
  /** Rich fields carried through so the CURRENT derived order is exportable
   * from this screen (same mapping the detail page uses). */
  bpm: number | null
  energyScore: number | null
  sourceUri: string | null
  musicalKey: string | null
  genre: string | null
  comment: string | null
  durationSeconds: number | null
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
  playlistName: string
  importSource: string | null
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
  playlistName,
  importSource,
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
  const [smartOrder, setSmartOrder] = useState<string[] | null>(null)
  const [smartSource, setSmartSource] = useState<"claude" | "fallback" | null>(
    null
  )
  const [smartStatus, setSmartStatus] = useState<SmartOrderStatus>("idle")
  const [smartError, setSmartError] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle")
  const revertIdsRef = useRef<string[] | null>(null)
  const router = useRouter()

  const fixIds = useMemo(() => new Set(fixes.map((fix) => fix.id)), [fixes])
  const trackIdSet = useMemo(() => new Set(originalIds), [originalIds])

  useEffect(() => {
    const stored = readStoredDecisions(playlistId, fixIds, trackIdSet)
    setApplied(stored.applied)
    setDiscarded(stored.discarded)
    setSmartOrder(stored.smartOrder)
    setSmartSource(stored.smartSource)
    setSmartStatus(
      stored.smartOrder
        ? stored.smartSource === "fallback"
          ? "fallback"
          : "done"
        : "idle"
    )
    setHydrated(true)
  }, [playlistId, fixIds, trackIdSet])

  useEffect(() => {
    if (!hydrated) {
      return
    }

    window.localStorage.setItem(
      storageKey(playlistId),
      JSON.stringify({
        applied: [...applied],
        discarded: [...discarded],
        smartOrder,
        smartSource,
      } satisfies StoredDecisions)
    )
  }, [playlistId, applied, discarded, smartOrder, smartSource, hydrated])

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
    setSmartOrder(null)
    setSmartSource(null)
    setSmartStatus("idle")
    setSmartError(false)
  }, [])

  /** "Back to original": restores the order (applied fixes + smart order)
   * without touching discard decisions — those are opinions, not moves. */
  const resetOrder = useCallback(() => {
    setApplied(new Set())
    setSmartOrder(null)
    setSmartSource(null)
    setSmartStatus("idle")
    setSmartError(false)
  }, [])

  // Everything below is DERIVED — the tracklist is never mutated in place.
  // Smart ordering (zone 4) swaps the BASE order; fix operations still apply
  // on top of it, so "Back to original" reverts everything exactly.
  const baseIds = smartOrder ?? originalIds

  const order = useMemo(
    () => deriveOrder(baseIds, fixes, applied),
    [baseIds, fixes, applied]
  )

  const orderedScores = useMemo(
    () => order.map((id) => energiesById.get(id)?.score ?? 0),
    [order, energiesById]
  )

  const currentScore = useMemo(
    () =>
      applied.size === 0 && !smartOrder
        ? baseScore
        : scoreOrder(order, originalIds, energies, genre, context),
    [
      applied.size,
      smartOrder,
      order,
      originalIds,
      energies,
      genre,
      context,
      baseScore,
    ]
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

  // Zone 3: rows of the live tracklist in the current derived order, each
  // carrying its 1-based ORIGINAL position for the amber "from N" chip.
  const originalPositionById = useMemo(
    () => new Map(originalIds.map((id, index) => [id, index + 1])),
    [originalIds]
  )

  const tracklistRows: LiveTracklistRow[] = useMemo(
    () =>
      order.map((id) => ({
        id,
        artist: tracksById.get(id)?.artist ?? "—",
        name: tracksById.get(id)?.name ?? "—",
        score: energiesById.get(id)?.score ?? 0,
        originalPosition: originalPositionById.get(id) ?? 0,
      })),
    [order, tracksById, energiesById, originalPositionById]
  )

  // The CURRENT derived order (fixes + smart order), exportable as-is —
  // positions renumbered 1..N, same field mapping as the detail page.
  const exportPlaylist: ExportPlaylist = useMemo(
    () => ({
      name: playlistName,
      importSource,
      tracks: order
        .map((id) => tracksById.get(id))
        .filter((track): track is WorkbenchTrack => Boolean(track))
        .map((track, index) => ({
          position: index + 1,
          artist: track.artist,
          name: track.name,
          bpm: track.bpm,
          energyScore: track.energyScore,
          sourceUri: track.sourceUri,
          musicalKey: track.musicalKey,
          genre: track.genre,
          comment: track.comment,
          durationSeconds: track.durationSeconds,
        })),
    }),
    [order, tracksById, playlistName, importSource]
  )

  const movedCount = tracklistRows.filter(
    (row, index) => row.originalPosition !== index + 1
  ).length

  const orderDirty = applied.size > 0 || smartOrder !== null

  // Zone 4: smart ordering — server endpoint (Claude) with local heuristic
  // fallback. The result enters the SAME derived state as manual fixes.
  const smartOrderRequest = useCallback(async () => {
    if (smartStatus === "thinking") {
      return
    }

    setSmartError(false)
    setSmartStatus("thinking")

    try {
      const response = await fetch(
        `/api/playlists/${playlistId}/smart-order`,
        { method: "POST" }
      )

      if (!response.ok) {
        throw new Error(`smart-order ${response.status}`)
      }

      const payload = (await response.json()) as {
        order?: unknown
        source?: unknown
      }
      const ids = Array.isArray(payload.order)
        ? payload.order.filter((id): id is string => typeof id === "string")
        : []

      // Same strict validation as the server: exact same id set, no dupes.
      const valid =
        ids.length === originalIds.length &&
        new Set(ids).size === ids.length &&
        ids.every((id) => trackIdSet.has(id))

      if (!valid) {
        throw new Error("smart-order invalid payload")
      }

      const source = payload.source === "fallback" ? "fallback" : "claude"
      setApplied(new Set())
      setSmartOrder(ids)
      setSmartSource(source)
      setSmartStatus(source === "fallback" ? "fallback" : "done")
    } catch {
      setSmartStatus(smartOrder ? (smartSource === "fallback" ? "fallback" : "done") : "idle")
      setSmartError(true)
    }
  }, [smartStatus, playlistId, originalIds.length, trackIdSet, smartOrder, smartSource])

  // Final CTA: write the derived order into the real playlist. Reversible —
  // the pre-save order is kept so one click restores it server-side too.
  const saveOrderToPlaylist = useCallback(async () => {
    if (saveState === "saving") {
      return
    }

    setSaveState("saving")

    const result = await reorderTracksAction(playlistId, order)

    if (!result.ok) {
      setSaveState("error")
      return
    }

    revertIdsRef.current = originalIds
    // The saved order IS the playlist order now — local decisions no longer
    // describe a delta, so clear them before the server data refreshes.
    setApplied(new Set())
    setDiscarded(new Set())
    setSmartOrder(null)
    setSmartSource(null)
    setSmartStatus("idle")
    window.localStorage.removeItem(storageKey(playlistId))
    setSaveState("saved")
    router.refresh()
  }, [playlistId, order, originalIds, router, saveState])

  const revertSavedOrder = useCallback(async () => {
    const revertIds = revertIdsRef.current

    if (!revertIds || saveState === "saving") {
      return
    }

    setSaveState("saving")

    const result = await reorderTracksAction(playlistId, revertIds)

    if (!result.ok) {
      setSaveState("error")
      return
    }

    revertIdsRef.current = null
    setSaveState("idle")
    router.refresh()
  }, [playlistId, router, saveState])

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

    const beforeOrder = deriveOrder(baseIds, fixes, without)
    const afterOrder = deriveOrder(baseIds, fixes, withFix)
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
  }, [selectedFix, applied, baseIds, fixes, energiesById])

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

  const contextName = CONTEXT_DISPLAY_NAMES[context]?.[locale] ?? context

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
        smartOrdered={smartStatus === "done"}
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

      {/* Zone 4 banners: violet while Claude thinks, cyan with the result. */}
      {smartStatus === "thinking" ? (
        <div className="flex items-center gap-3 rounded-xl border border-[#A24DE0]/35 bg-[#A24DE0]/[0.08] px-4 py-3 text-sm text-white/80">
          <Loader2 className="size-4 shrink-0 animate-spin text-[#c084fc]" />
          {formatTemplate(ANALYSIS_UI.smartThinkingBanner[locale], {
            context: contextName,
          })}
        </div>
      ) : smartError ? (
        <div className="rounded-xl border border-ec-amber/35 bg-ec-amber/[0.06] px-4 py-3 text-sm text-white/80">
          {ANALYSIS_UI.smartOrderError[locale]}
        </div>
      ) : smartStatus === "done" ? (
        <div className="flex items-center gap-3 rounded-xl border border-ec-cyan/35 bg-ec-cyan/[0.06] px-4 py-3 text-sm text-white/80">
          <Sparkles className="size-4 shrink-0 text-ec-cyan" />
          {currentScore > baseScore
            ? formatTemplate(ANALYSIS_UI.smartDoneBanner[locale], {
                from: baseScore.toFixed(1),
                to: currentScore.toFixed(1),
                context: contextName,
              })
            : formatTemplate(ANALYSIS_UI.smartDoneBannerFlat[locale], {
                context: contextName,
              })}
        </div>
      ) : smartStatus === "fallback" ? (
        <div className="rounded-xl border border-ec-cyan/35 bg-ec-cyan/[0.06] px-4 py-3 text-sm text-white/80">
          {ANALYSIS_UI.smartFallbackBanner[locale]}
        </div>
      ) : null}

      {/* Zone 3: the live tracklist — replaces the two 48-row lists. */}
      <LiveTracklist
        rows={tracklistRows}
        movedCount={movedCount}
        dirty={orderDirty}
        smartStatus={smartStatus}
        onSmartOrder={smartOrderRequest}
        onReset={resetOrder}
        exportSlot={
          <PlaylistExportButton playlist={exportPlaylist} locale={locale} />
        }
        locale={locale}
      />

      <div className="flex flex-wrap items-center gap-3">
        {movedCount > 0 ? (
          <button
            type="button"
            onClick={saveOrderToPlaylist}
            disabled={saveState === "saving"}
            className="rounded-[13px] border border-ec-cyan/50 bg-ec-cyan/10 px-4 py-2.5 text-sm font-semibold text-ec-cyan transition-colors hover:bg-ec-cyan/20 disabled:cursor-wait disabled:opacity-70"
          >
            {saveState === "saving"
              ? ANALYSIS_UI.savingOrder[locale]
              : ANALYSIS_UI.saveOrderCta[locale]}
          </button>
        ) : null}

        {saveState === "saved" ? (
          <p className="flex flex-wrap items-center gap-3 text-sm text-white/70">
            <CircleCheck className="size-4 shrink-0 text-ec-cyan" />
            {ANALYSIS_UI.savedOrderNote[locale]}
            <button
              type="button"
              onClick={revertSavedOrder}
              className="underline decoration-white/24 underline-offset-4 hover:text-white"
            >
              {ANALYSIS_UI.revertSavedCta[locale]}
            </button>
          </p>
        ) : null}

        {saveState === "error" ? (
          <p className="text-sm text-ec-amber">
            {ANALYSIS_UI.saveOrderError[locale]}
          </p>
        ) : null}

        {applied.size === 0 && discarded.size === 0 && !smartOrder ? null : (
          <button
            type="button"
            onClick={resetAll}
            className="ml-auto text-xs text-white/48 underline decoration-white/24 underline-offset-4 hover:text-white"
          >
            {locale === "es" ? "Reiniciar decisiones" : "Reset decisions"}
          </button>
        )}
      </div>
    </div>
  )
}
