import {
  buildCurveAreaPath,
  buildSmoothCurvePath,
  mapValuesToCurvePoints,
  type CurvePoint,
} from "@/lib/charts/curve-geometry"

export { buildCurveAreaPath, buildSmoothCurvePath }
export type EnergyCurvePoint = CurvePoint

export interface EnergyCurvePreviewTrack {
  id: string
  title: string
  artist: string
  bpm: number
  energy: number
  durationMinutes: number
  cue: string
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
  return mapValuesToCurvePoints(
    tracks.map((track) => track.energy),
    width,
    height,
    padding,
    { min: 0, max: 100 }
  )
}
