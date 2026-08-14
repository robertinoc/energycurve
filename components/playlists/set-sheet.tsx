import { formatClock, formatGap, type ResolvedSlot } from "@/lib/engine/slot"
import {
  CONTEXT_COPY,
  CURVE_SHAPE_COPY,
  DASHBOARD_COPY,
} from "@/lib/content/dashboard-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import {
  GENRE_LABELS,
  type CurveShape,
  type PlaylistContext,
  type SupportedGenre,
} from "@/lib/product/strategy"

const COPY = DASHBOARD_COPY.setSheet

export interface SetSheetRow {
  position: number
  artist: string
  name: string
  bpm: number | null
  camelot: string | null
  energy: number
  /** Wall-clock minute this track lands on, when a slot was declared. */
  clockMinutes: number | null
}

export interface SetSheetProps {
  playlistName: string
  description: string | null
  genre: SupportedGenre | null
  context: PlaylistContext | null
  targetShape: CurveShape | null
  slot: ResolvedSlot | null
  rows: SetSheetRow[]
  /** 1-based position of the highest-energy track, marked on the curve. */
  peakPosition: number | null
  estimatedMinutes: number
  locale: SiteLocale
}

/**
 * The sheet a DJ takes into the booth.
 *
 * Deliberately a white document rather than a dark screen, on paper *and* on
 * screen. Two reasons: a dark page is unreadable once printed and wastes the
 * whole cartridge, and a sheet that looks the same in both places means what the
 * DJ sees before printing is what comes out.
 *
 * Server-rendered on purpose. Nothing here is interactive — the only client
 * behaviour on the page is the print button — so the sheet costs no JavaScript
 * on a phone propped up in a booth with bad wifi.
 */
export function SetSheet({
  playlistName,
  description,
  genre,
  context,
  targetShape,
  slot,
  rows,
  peakPosition,
  estimatedMinutes,
  locale,
}: SetSheetProps) {
  const facts = [
    genre ? GENRE_LABELS[genre] : null,
    context ? CONTEXT_COPY[context][locale] : null,
    targetShape ? CURVE_SHAPE_COPY[targetShape].label[locale] : null,
    slot
      ? `${formatClock(slot.startMinutes)}–${formatClock(slot.endMinutes)} · ${formatGap(slot.durationMinutes)}`
      : null,
    `${rows.length} ${COPY.tracks[locale]}`,
    slot ? null : `≈ ${formatGap(estimatedMinutes)}`,
  ].filter(Boolean) as string[]

  return (
    // `print:` variants keep the paper rules next to the screen ones instead of
    // in a stylesheet nobody remembers to update.
    <article className="rounded-2xl bg-white px-8 py-7 text-[#111] shadow-lg print:rounded-none print:px-0 print:py-0 print:shadow-none">
      <header className="border-b border-black/15 pb-4">
        <h1 className="text-2xl font-semibold leading-tight">{playlistName}</h1>
        <p className="mt-1.5 text-[13px] leading-5 text-black/60">
          {facts.join("  ·  ")}
        </p>
      </header>

      {rows.length > 1 ? (
        <SetCurvePrint rows={rows} peakPosition={peakPosition} />
      ) : null}

      <table className="mt-5 w-full border-collapse text-[13px]">
        {/*
          table-header-group so the header repeats on every printed page. A
          three-page tracklist whose columns are only labelled on page one is
          useless at 3am.
        */}
        <thead className="print:table-header-group">
          <tr className="border-b border-black/25 text-left align-bottom">
            <th className="w-8 pb-1.5 font-semibold">#</th>
            {slot ? (
              <th className="w-14 pb-1.5 font-semibold">{COPY.time[locale]}</th>
            ) : null}
            <th className="pb-1.5 font-semibold">{COPY.track[locale]}</th>
            <th className="w-14 pb-1.5 text-right font-semibold">BPM</th>
            <th className="w-12 pb-1.5 text-right font-semibold">
              {COPY.key[locale]}
            </th>
            <th className="w-16 pb-1.5 pr-1 text-right font-semibold">
              {COPY.energy[locale]}
            </th>
            {/* Blank ruled column for pen notes — paper only. */}
            <th className="hidden w-32 pb-1.5 font-semibold print:table-cell">
              {COPY.notes[locale]}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.position}
              // A track split across a page break is a track the DJ misreads.
              className="break-inside-avoid border-b border-black/10"
            >
              <td className="py-1.5 tabular-nums text-black/50">
                {row.position}
              </td>
              {slot ? (
                <td className="py-1.5 tabular-nums font-medium">
                  {row.clockMinutes === null ? "" : formatClock(row.clockMinutes)}
                </td>
              ) : null}
              <td className="py-1.5 pr-3">
                <span className="font-medium">{row.artist}</span>
                <span className="text-black/45"> — {row.name}</span>
                {row.position === peakPosition ? (
                  <span className="ml-1.5 rounded border border-black/30 px-1 text-[10px] font-semibold uppercase tracking-wide">
                    {COPY.peak[locale]}
                  </span>
                ) : null}
              </td>
              <td className="py-1.5 text-right tabular-nums">
                {row.bpm ?? "—"}
              </td>
              <td className="py-1.5 text-right tabular-nums">
                {row.camelot ?? "—"}
              </td>
              <td className="py-1.5 pr-1 text-right tabular-nums">
                {row.energy}
              </td>
              <td className="hidden print:table-cell" />
            </tr>
          ))}
        </tbody>
      </table>

      {description ? (
        <section className="mt-5 border-t border-black/15 pt-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-black/50">
            {/* Distinct from the pen column's "Notes" header: on paper both are
                visible, and two blocks with the same label is a puzzle. */}
            {COPY.setNotes[locale]}
          </h2>
          <p className="mt-1 whitespace-pre-wrap text-[13px] leading-5">
            {description}
          </p>
        </section>
      ) : null}

      <footer className="mt-6 text-[10px] uppercase tracking-wide text-black/35">
        energycurve.app
      </footer>
    </article>
  )
}

/**
 * The curve as a black line on white.
 *
 * Hand-rolled rather than reusing the dashboard chart: that one is a client
 * component built for a dark background with hover states, none of which
 * survive a printer.
 */
function SetCurvePrint({
  rows,
  peakPosition,
}: {
  rows: SetSheetRow[]
  peakPosition: number | null
}) {
  // Taller than it looks like it needs to be, and the 0–10 scale is kept rather
  // than fitted to the set's own range. A warm-up living between 5.5 and 9 reads
  // as a flat line at 96px; at this height the shape is legible while the scale
  // still means the same thing on every sheet, which is what makes two sheets
  // comparable at all.
  const width = 720
  const height = 150
  const padY = 10

  const axisWidth = 22
  const x = (index: number) =>
    axisWidth + (index / (rows.length - 1)) * (width - axisWidth)
  const y = (energy: number) =>
    padY + (1 - energy / 10) * (height - padY * 2)

  const points = rows.map((row, index) => `${x(index)},${y(row.energy)}`)
  const peakIndex = rows.findIndex((row) => row.position === peakPosition)

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="mt-5 w-full"
      role="img"
      aria-hidden="true"
    >
      {/* Rules at 10, 5 and 0, labelled — the height of the line has to be
          readable as a number, not just as a shape. */}
      {[10, 5, 0].map((level) => (
        <g key={level}>
          <line
            x1={22}
            y1={y(level)}
            x2={width}
            y2={y(level)}
            stroke="#000"
            strokeOpacity={level === 5 ? 0.1 : 0.18}
            strokeWidth={1}
            strokeDasharray={level === 5 ? "3 3" : undefined}
          />
          <text
            x={0}
            y={y(level) + 3.5}
            fontSize={10}
            fill="#000"
            fillOpacity={0.4}
          >
            {level}
          </text>
        </g>
      ))}
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="#000"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {peakIndex >= 0 ? (
        <circle
          cx={x(peakIndex)}
          cy={y(rows[peakIndex].energy)}
          r={4}
          fill="#000"
        />
      ) : null}
    </svg>
  )
}
