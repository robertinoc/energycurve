import { z } from "zod"

import { parseClock } from "@/lib/engine/slot"

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
        audioTracksRequired: "No hay tracks para importar.",
        audioTracksTooMany: "Demasiados tracks en un solo import.",
        slotIncomplete: "Completá la hora de inicio y la de fin, o dejá las dos vacías.",
        slotEmpty: "La hora de fin tiene que ser distinta de la de inicio.",
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
        audioTracksRequired: "There are no tracks to import.",
        audioTracksTooMany: "Too many tracks in a single import.",
        slotIncomplete: "Fill in both the start and end time, or leave both empty.",
        slotEmpty: "The end time has to differ from the start time.",
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
    // Rich tag fields, all optional (V3: editable so untagged wav/flac files
    // can be completed by hand). Lenient — sanitized/nulled, never erroring.
    musicalKey: lenientText(TRACK_FIELD_MAX_LENGTH).transform((value) =>
      value && value.length <= 12 ? value : null
    ),
    genre: lenientText(TRACK_FIELD_MAX_LENGTH).transform(
      (value) => value || null
    ),
    comment: lenientText(TRACK_FIELD_MAX_LENGTH).transform(
      (value) => value || null
    ),
  })
}

export const PLAYLIST_DESCRIPTION_MAX_LENGTH = 500

/** Rename + optional description for an existing playlist (V3 feedback). */
export function updatePlaylistDetailsSchema(locale: SiteLocale) {
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
    description: lenientText(PLAYLIST_DESCRIPTION_MAX_LENGTH).transform(
      (value) => value || null
    ),
    // Wall-clock strings from two <input type="time">. Parsed here rather than in
    // the action so "01:70" can never reach the database, and validated as a pair
    // because half a slot says nothing.
    slotStart: z.string().transform((value) => parseClock(value)).nullable(),
    slotEnd: z.string().transform((value) => parseClock(value)).nullable(),
  })
    .refine(
      (value) => (value.slotStart === null) === (value.slotEnd === null),
      { message: messages.slotIncomplete, path: ["slotEnd"] }
    )
    .refine((value) => value.slotStart !== value.slotEnd || value.slotStart === null, {
      message: messages.slotEmpty,
      path: ["slotEnd"],
    })
}

export const AUDIO_IMPORT_MAX_TRACKS = 500

/** Positive-length source path; only control chars stripped (paths may
 * legitimately contain "<" ">" — don't run the full sanitizer on them). */
const sourceUriSchema = z.preprocess(
  (value) =>
    typeof value === "string"
      ? value.replace(controlCharacters, "").trim().slice(0, 500)
      : null,
  z.union([z.null(), z.string()]).transform((value) => value || null)
)

/** Untrusted string → sanitized + truncated (never errors, unlike the manual
 * form fields — one messy tag must not sink a 100-file import). */
function lenientText(maxLength: number) {
  return z.preprocess(
    (value) => (typeof value === "string" ? value : ""),
    z
      .string()
      .transform(sanitizeText)
      .transform((value) => value.slice(0, maxLength))
  )
}

/** Untrusted number → clamped to range or null (never errors). */
function numberOrNull(options: {
  min: number
  max: number
  integer?: boolean
}) {
  return z.preprocess((value) => {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return null
    }
    if (options.integer && !Number.isInteger(value)) {
      return Math.round(value)
    }
    return value
  }, z.union([z.null(), z.number()])).transform((value) => {
    if (value === null || value < options.min || value > options.max) {
      return null
    }
    return value
  })
}

/**
 * Validates the client-parsed audio-tags payload. Unlike the paste flow (raw
 * text re-parsed server-side), here the parsed JSON IS the payload — the
 * browser read the tags and the audio never leaves the user's machine — so
 * this schema is the trust boundary. Stance: coerce garbage to null / truncate
 * rather than reject; only structural problems (no tracks, too many) error.
 */
export function createAudioImportSchema(locale: SiteLocale) {
  const messages = getPlaylistValidationMessages(locale)

  const track = z.object({
    artist: lenientText(TRACK_FIELD_MAX_LENGTH),
    name: lenientText(TRACK_FIELD_MAX_LENGTH),
    bpm: numberOrNull({
      min: BPM_INPUT_RANGE.min,
      max: BPM_INPUT_RANGE.max,
    }),
    // A musical/Camelot key longer than 12 chars is not a key at all —
    // null it rather than persist a truncated fragment.
    key: lenientText(TRACK_FIELD_MAX_LENGTH).transform((value) =>
      value && value.length <= 12 ? value : null
    ),
    genre: lenientText(TRACK_FIELD_MAX_LENGTH).transform(
      (value) => value || null
    ),
    energy: numberOrNull({
      min: ENERGY_SCORE_RANGE.min,
      max: ENERGY_SCORE_RANGE.max,
      integer: true,
    }),
    comment: lenientText(TRACK_FIELD_MAX_LENGTH).transform(
      (value) => value || null
    ),
    durationSeconds: numberOrNull({ min: 1, max: 86400, integer: true }),
    sourceUri: sourceUriSchema,
  })

  return z.object({
    name: lenientText(PLAYLIST_NAME_MAX_LENGTH),
    context: z.string().max(64),
    genre: z.string().max(64), // "" auto | base code | "custom:<id>"
    tracks: z
      .array(track)
      .min(1, messages.audioTracksRequired)
      .max(AUDIO_IMPORT_MAX_TRACKS, messages.audioTracksTooMany),
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
export type AudioImportPayload = z.input<
  ReturnType<typeof createAudioImportSchema>
>
export type AudioImportInput = z.infer<
  ReturnType<typeof createAudioImportSchema>
>
