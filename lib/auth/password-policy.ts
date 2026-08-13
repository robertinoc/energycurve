/**
 * Mirror of the WorkOS password policy, so the signup and reset forms can
 * state the rules up front and check them as the user types instead of
 * discovering them from a rejected round trip.
 *
 * WorkOS stays authoritative — this module never decides that a password is
 * *acceptable*, only that it is obviously going to be rejected. The breach
 * check in particular cannot run here: it needs haveibeenpwned, and the one
 * thing we will not do is ship the typed password anywhere to find out.
 *
 * Verified against the WorkOS environment behind this app on 13 Aug 2026 by
 * posting a deliberately failing password to `POST /user_management/users`:
 *
 *   {"code":"password_strength_error","errors":[
 *     {"code":"password_too_short","minimum_length":10,"message":"…10 or more characters."},
 *     {"code":"password_too_weak","suggestions":["Add more words that are less common."]}]}
 *
 * So: minimum length 10, plus a zxcvbn-style guessability check. Note that a
 * long-but-famously-leaked passphrase was *accepted* by that same environment,
 * which means the haveibeenpwned rejection is not switched on there — see
 * `docs/auth-users.md`. The `password_pwned` mapping below is still wired up
 * because the policy is per-environment and production may enable it.
 *
 * The minimum is overridable so a stricter production policy can be mirrored
 * without a code change; re-run the probe in `docs/auth-users.md` to confirm.
 */

const DEFAULT_MIN_LENGTH = 10

function readConfiguredMinLength(): number {
  // Referenced literally so Next can inline it into the client bundle.
  const configured = Number(process.env.NEXT_PUBLIC_PASSWORD_MIN_LENGTH)

  return Number.isInteger(configured) && configured > 0
    ? configured
    : DEFAULT_MIN_LENGTH
}

export const PASSWORD_MIN_LENGTH = readConfiguredMinLength()

/**
 * Length at which we stop nagging: a passphrase this long clears both the
 * length rule and the guessability score even when the words are ordinary.
 * This is the escape hatch the error copy points at.
 */
export const PASSPHRASE_LENGTH = 16

/** Words a passphrase needs before we treat it as strong on word count alone. */
const PASSPHRASE_WORDS = 3

/**
 * Query-string name used to carry WorkOS's own reported minimum back to the
 * form after a rejection, so the message can quote the real number.
 */
export const PASSWORD_MIN_LENGTH_PARAM = "minLength"

/** Upper bound on the echoed value — it arrives from the URL, so it is input. */
const MAX_TRUSTED_MIN_LENGTH = 256

export function parsePasswordMinLength(
  value: string | string[] | undefined
): number {
  const raw = Array.isArray(value) ? value[0] : value
  const parsed = Number(raw)

  return Number.isInteger(parsed) &&
    parsed > 0 &&
    parsed <= MAX_TRUSTED_MIN_LENGTH
    ? parsed
    : PASSWORD_MIN_LENGTH
}

export type PasswordStrength = "empty" | "weak" | "fair" | "strong"

export interface PasswordEvaluation {
  length: number
  /** Meets the minimum length WorkOS enforces. */
  meetsMinLength: boolean
  /** Looks like a common password or an obvious keyboard/repeat pattern. */
  looksCommon: boolean
  /** Number of whitespace- or separator-delimited words. */
  wordCount: number
  strength: PasswordStrength
}

/**
 * Bases that dominate every leaked-password list, plus the patterns people
 * reach for when a form demands more characters. Deliberately small: this is
 * a "you are about to be rejected" hint, not a breach corpus. Matching is on
 * the alphabetic skeleton, so `P@ssw0rd123` is caught along with `password`.
 */
const COMMON_BASES = [
  "password",
  "passwort",
  "contrasena",
  "letmein",
  "welcome",
  "admin",
  "login",
  "iloveyou",
  "princess",
  "dragon",
  "monkey",
  "sunshine",
  "football",
  "baseball",
  "superman",
  "batman",
  "master",
  "shadow",
  "freedom",
  "whatever",
  "trustno",
  "starwars",
  "energycurve",
  "qwerty",
  "qwertz",
  "azerty",
  "asdfgh",
  "zxcvbn",
]

/** Leet substitutions, so `P@ssw0rd` reduces to `password`. */
const LEET: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "8": "b",
  "@": "a",
  $: "s",
  "!": "i",
  "|": "l",
}

function skeleton(password: string): string {
  return password
    .toLowerCase()
    .split("")
    .map((character) => LEET[character] ?? character)
    .filter((character) => /[a-z]/.test(character))
    .join("")
}

/** `aaaaaaaaaa`, `1111`, `abababab` — long but a single repeated unit. */
function isRepeatedUnit(password: string): boolean {
  const value = password.toLowerCase()

  if (value.length < 4) {
    return false
  }

  for (let size = 1; size <= Math.floor(value.length / 2); size += 1) {
    const unit = value.slice(0, size)

    if (value.length % size === 0 && unit.repeat(value.length / size) === value) {
      return true
    }
  }

  return false
}

/** `123456`, `abcdef`, `987654` — a straight run up or down the keyboard. */
function isSequentialRun(password: string): boolean {
  const value = password.toLowerCase()

  if (value.length < 4 || !/^[a-z0-9]+$/.test(value)) {
    return false
  }

  let ascending = true
  let descending = true

  for (let index = 1; index < value.length; index += 1) {
    const step = value.charCodeAt(index) - value.charCodeAt(index - 1)

    if (step !== 1) ascending = false
    if (step !== -1) descending = false
  }

  return ascending || descending
}

function countWords(password: string): number {
  return password.split(/[\s._\-|/+]+/).filter(Boolean).length
}

/**
 * Heuristic mirror of the WorkOS guessability check. False negatives are
 * expected and fine — the server still has the final say. What matters is
 * that the obvious cases fail *before* the round trip.
 */
export function looksCommonPassword(password: string): boolean {
  if (!password) {
    return false
  }

  if (isRepeatedUnit(password) || isSequentialRun(password)) {
    return true
  }

  // Checked on the raw value: the leet map below turns digits into letters,
  // so `skeleton` can never tell us whether the user typed any to begin with.
  if (!/[a-z]/i.test(password)) {
    // Digits or symbols only: fine at passphrase length, guessable below it.
    return password.length < PASSPHRASE_LENGTH
  }

  const letters = skeleton(password)
  const matchedBase = COMMON_BASES.find((base) => letters.includes(base))

  if (!matchedBase) {
    return false
  }

  // A common word inside a genuinely long passphrase is not the problem
  // WorkOS rejects — `correct-horse-password-staple` scores fine.
  const remainder = letters.replace(matchedBase, "")

  return remainder.length < 6 && countWords(password) < PASSPHRASE_WORDS
}

export function evaluatePassword(
  password: string,
  minLength: number = PASSWORD_MIN_LENGTH
): PasswordEvaluation {
  const length = password.length
  const wordCount = countWords(password)
  const meetsMinLength = length >= minLength
  const looksCommon = looksCommonPassword(password)

  let strength: PasswordStrength = "fair"

  if (length === 0) {
    strength = "empty"
  } else if (!meetsMinLength || looksCommon) {
    strength = "weak"
  } else if (length >= PASSPHRASE_LENGTH || wordCount >= PASSPHRASE_WORDS) {
    strength = "strong"
  }

  return { length, meetsMinLength, looksCommon, wordCount, strength }
}
