import { z } from "zod"

import type { SiteLocale } from "@/lib/content/site-copy"
import {
  ENERGY_SCORE_RANGE,
  SET_CONTEXTS,
  SUPPORTED_GENRES,
} from "@/lib/product/strategy"
import { TRACKLIST_FORMATS } from "@/lib/playlists/parse-tracklist"

export const BPM_INPUT_RANGE = { min: 60, max: 220 } as const
export const PLAYLIST_NAME_MAX_LENGTH = 120
export const TRACK_FIELD_MAX_LENGTH = 200
export const TRACKLIST_IMPORT_MAX_LENGTH = 20000

const collapsedWhitespace = /\s+/g
const controlCharacters = /[\u0000-\u001f\u007f]/g

function sanitizeText(value: string) {
  return value
    .replace(controlCharacters, " ")
    .replace(/[<>]/g, "")
    .replace(collapsedWhitespace, " ")
    .trim()
}

function getPlaylistValidationMessages(locale: SiteLocale) {
  return locale === "es"
    ? {
        nameRequired: "Ingresá un nombre para la playlist.",
        nameLong: "El nombre es demasiado largo.",
        genreInvalid: "Elegí un género soportado.",
        contextInvalid: "Elegí un contexto de set.",
        artistRequired: "Ingresá el artista.",
        artistLong: "El artista es demasiado largo.",
        trackRequired: "Ingresá el nombre del track.",
        trackLong: "El nombre del track es demasiado largo.",
        bpmRange: `El BPM debe estar entre ${BPM_INPUT_RANGE.min} y ${BPM_INPUT_RANGE.max}.`,
        energyRange: `El energy score debe estar entre ${ENERGY_SCORE_RANGE.min} y ${ENERGY_SCORE_RANGE.max}.`,
        importRequired: "Pegá al menos una línea con un track.",
        importLong: "El texto pegado es demasiado largo.",
        formatInvalid: "Elegí un formato de línea válido.",
      }
    : {
        nameRequired: "Please enter a playlist name.",
        nameLong: "Playlist name is too long.",
        genreInvalid: "Choose a supported genre.",
        contextInvalid: "Choose a set context.",
        artistRequired: "Please enter the artist.",
        artistLong: "Artist is too long.",
        trackRequired: "Please enter the track name.",
        trackLong: "Track name is too long.",
        bpmRange: `BPM must be between ${BPM_INPUT_RANGE.min} and ${BPM_INPUT_RANGE.max}.`,
        energyRange: `Energy score must be between ${ENERGY_SCORE_RANGE.min} and ${ENERGY_SCORE_RANGE.max}.`,
        importRequired: "Paste at least one line with a track.",
        importLong: "The pasted text is too long.",
        formatInvalid: "Choose a valid line format.",
      }
}

function optionalBoundedNumber(options: {
  min: number
  max: number
  message: string
}) {
  return z.preprocess(
    (value) => {
      if (value === undefined || value === null) {
        return null
      }

      const raw = String(value).trim().replace(",", ".")

      if (!raw) {
        return null
      }

      return Number(raw)
    },
    z.union([
      z.null(),
      z
        .number({ message: options.message })
        .min(options.min, options.message)
        .max(options.max, options.message),
    ])
  )
}

export function createPlaylistSchema(locale: SiteLocale) {
  const messages = getPlaylistValidationMessages(locale)

  return z.object({
    name: z
      .string()
      .transform(sanitizeText)
      .pipe(
        z
          .string()
          .min(1, messages.nameRequired)
          .max(PLAYLIST_NAME_MAX_LENGTH, messages.nameLong)
      ),
    genre: z.enum(SUPPORTED_GENRES, { message: messages.genreInvalid }),
    context: z.enum(SET_CONTEXTS, { message: messages.contextInvalid }),
  })
}

export function createTrackInputSchema(locale: SiteLocale) {
  const messages = getPlaylistValidationMessages(locale)

  return z.object({
    artist: z
      .string()
      .transform(sanitizeText)
      .pipe(
        z
          .string()
          .min(1, messages.artistRequired)
          .max(TRACK_FIELD_MAX_LENGTH, messages.artistLong)
      ),
    name: z
      .string()
      .transform(sanitizeText)
      .pipe(
        z
          .string()
          .min(1, messages.trackRequired)
          .max(TRACK_FIELD_MAX_LENGTH, messages.trackLong)
      ),
    bpm: optionalBoundedNumber({
      min: BPM_INPUT_RANGE.min,
      max: BPM_INPUT_RANGE.max,
      message: messages.bpmRange,
    }),
    energyScore: optionalBoundedNumber({
      min: ENERGY_SCORE_RANGE.min,
      max: ENERGY_SCORE_RANGE.max,
      message: messages.energyRange,
    }).transform((value) =>
      value === null ? null : Math.round(value * 10) / 10
    ),
  })
}

export function createTracklistImportSchema(locale: SiteLocale) {
  const messages = getPlaylistValidationMessages(locale)

  return z.object({
    text: z
      .string()
      .min(1, messages.importRequired)
      .max(TRACKLIST_IMPORT_MAX_LENGTH, messages.importLong),
    format: z.enum(TRACKLIST_FORMATS, { message: messages.formatInvalid }),
  })
}

export type PlaylistCreateInput = z.infer<
  ReturnType<typeof createPlaylistSchema>
>
export type TrackFormInput = z.infer<ReturnType<typeof createTrackInputSchema>>
export type TracklistImportInput = z.infer<
  ReturnType<typeof createTracklistImportSchema>
>
