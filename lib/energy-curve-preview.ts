export interface EnergyCurvePreviewTrack {
  id: string
  title: string
  artist: string
  bpm: number
  energy: number
  durationMinutes: number
  cue: string
}

export interface EnergyCurvePoint {
  x: number
  y: number
}

export const energyCurvePreviewTracks: EnergyCurvePreviewTrack[] = [
  {
    id: "intro-bloom",
    title: "Intro Bloom",
    artist: "Nova Relay",
    bpm: 118,
    energy: 32,
    durationMinutes: 4,
    cue: "Warm open and room reset",
  },
  {
    id: "velvet-grid",
    title: "Velvet Grid",
    artist: "Aria Static",
    bpm: 122,
    energy: 44,
    durationMinutes: 5,
    cue: "First lift with tighter percussion",
  },
  {
    id: "afterglow-code",
    title: "Afterglow Code",
    artist: "Signal Youth",
    bpm: 124,
    energy: 58,
    durationMinutes: 6,
    cue: "Momentum starts locking in",
  },
  {
    id: "peak-freq",
    title: "Peak Freq",
    artist: "Mira Phase",
    bpm: 127,
    energy: 81,
    durationMinutes: 5,
    cue: "Main-room pressure peak",
  },
  {
    id: "neon-slip",
    title: "Neon Slip",
    artist: "Circuit Bloom",
    bpm: 125,
    energy: 69,
    durationMinutes: 4,
    cue: "Controlled release before the rebuild",
  },
  {
    id: "cyan-after",
    title: "Cyan After",
    artist: "Night Logic",
    bpm: 129,
    energy: 89,
    durationMinutes: 6,
    cue: "Final surge with hands-up payoff",
  },
] as const

export function getAverageEnergy(tracks: EnergyCurvePreviewTrack[]) {
  if (tracks.length === 0) {
    return 0
  }

  return Math.round(
    tracks.reduce((total, track) => total + track.energy, 0) / tracks.length
  )
}

export function getPeakEnergy(tracks: EnergyCurvePreviewTrack[]) {
  return tracks.reduce((peak, track) => Math.max(peak, track.energy), 0)
}

export function getTotalDuration(tracks: EnergyCurvePreviewTrack[]) {
  return tracks.reduce((total, track) => total + track.durationMinutes, 0)
}

export function mapTracksToCurvePoints(
  tracks: EnergyCurvePreviewTrack[],
  width: number,
  height: number,
  padding = 24
) {
  if (tracks.length === 0) {
    return []
  }

  const innerWidth = width - padding * 2
  const innerHeight = height - padding * 2
  const stepX = tracks.length === 1 ? 0 : innerWidth / (tracks.length - 1)

  return tracks.map((track, index) => {
    const x = padding + stepX * index
    const y = padding + ((100 - track.energy) / 100) * innerHeight

    return { x, y }
  })
}

export function buildSmoothCurvePath(points: EnergyCurvePoint[]) {
  if (points.length === 0) {
    return ""
  }

  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`
  }

  const firstMidX = (points[0].x + points[1].x) / 2
  const firstMidY = (points[0].y + points[1].y) / 2

  let path = `M ${points[0].x} ${points[0].y} Q ${points[0].x} ${points[0].y} ${firstMidX} ${firstMidY}`

  for (let index = 1; index < points.length - 1; index += 1) {
    const point = points[index]
    const nextPoint = points[index + 1]
    const midX = (point.x + nextPoint.x) / 2
    const midY = (point.y + nextPoint.y) / 2

    path += ` Q ${point.x} ${point.y} ${midX} ${midY}`
  }

  const lastPoint = points.at(-1)
  const previousPoint = points.at(-2)

  if (lastPoint && previousPoint) {
    path += ` Q ${previousPoint.x} ${previousPoint.y} ${lastPoint.x} ${lastPoint.y}`
  }

  return path
}

export function buildCurveAreaPath(
  points: EnergyCurvePoint[],
  width: number,
  height: number,
  padding = 24
) {
  if (points.length === 0) {
    return ""
  }

  const linePath = buildSmoothCurvePath(points)
  const lastPoint = points.at(-1)
  const firstPoint = points[0]
  const baselineY = height - padding

  if (!lastPoint) {
    return ""
  }

  return `${linePath} L ${lastPoint.x} ${baselineY} L ${firstPoint.x} ${baselineY} Z`
}
