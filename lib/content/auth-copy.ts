import { formatTemplate } from "@/lib/content/analysis-copy"
import type { SiteLocale } from "@/lib/content/site-copy"

/**
 * Copy for the account surfaces: login, signup, and password reset. Same
 * shape as the other files here — leaves are `Record<SiteLocale, string>`,
 * `{slot}` params interpolate via formatTemplate, ES is rioplatense voseo.
 *
 * The password guidance is deliberately concrete. The old text ("choose a
 * stronger password that meets your WorkOS password policy") named an
 * internal vendor and gave the user nothing to change, which is a bad thing
 * to say on any form and a very bad thing to say on the one form where
 * failure means the account never gets created.
 */

type LocalizedLabel = Record<SiteLocale, string>

interface AlertCopy {
  title: LocalizedLabel
  description: LocalizedLabel
}

export const PASSWORD_FIELD_COPY = {
  requirementsTitle: {
    en: "Your password needs to:",
    es: "Tu contraseña necesita:",
  },
  minLengthRule: {
    en: "Be at least {min} characters long",
    es: "Tener al menos {min} caracteres",
  },
  notCommonRule: {
    en: "Not be a common password or an obvious pattern",
    es: "No ser una contraseña común ni un patrón obvio",
  },
  passphraseTip: {
    en: "Three or four unrelated words work well — easy to remember, and always long enough.",
    es: "Tres o cuatro palabras sin relación funcionan bien — fáciles de recordar y siempre lo bastante largas.",
  },
  strengthLabel: {
    en: "Password strength",
    es: "Fuerza de la contraseña",
  },
  strengthWeak: {
    en: "Weak",
    es: "Débil",
  },
  strengthFair: {
    en: "Fair",
    es: "Aceptable",
  },
  strengthStrong: {
    en: "Strong",
    es: "Fuerte",
  },
  /** Announced to screen readers as the checks flip; also the meter's a11y text. */
  ruleMet: {
    en: "Met",
    es: "Cumplido",
  },
  ruleUnmet: {
    en: "Not met yet",
    es: "Todavía no se cumple",
  },
} as const

/**
 * The passphrase escape hatch, appended to every password rejection: whatever
 * the specific reason was, a longer multi-word passphrase clears it.
 */
const PASSPHRASE_ESCAPE = {
  en: "A passphrase of three or four unrelated words always passes.",
  es: "Una frase de tres o cuatro palabras sin relación siempre pasa.",
}

export const AUTH_ALERT_COPY = {
  passwordUpdated: {
    title: { en: "Password updated", es: "Contraseña actualizada" },
    description: {
      en: "Your new password is active. Sign in with it below.",
      es: "Tu nueva contraseña ya está activa. Iniciá sesión con ella acá abajo.",
    },
  },
  signedOut: {
    title: { en: "Signed out successfully", es: "Sesión cerrada" },
    description: {
      en: "Your session has been closed. You can sign in again or create a new account.",
      es: "Tu sesión se cerró. Podés volver a iniciar sesión o crear una cuenta nueva.",
    },
  },
  missingFields: {
    title: { en: "Missing required fields", es: "Faltan campos obligatorios" },
    description: {
      en: "Complete every field before continuing.",
      es: "Completá todos los campos antes de continuar.",
    },
  },
  passwordMismatch: {
    title: { en: "Passwords do not match", es: "Las contraseñas no coinciden" },
    description: {
      en: "Use the same password in both fields.",
      es: "Usá la misma contraseña en los dos campos.",
    },
  },
  invalidCredentials: {
    title: { en: "Invalid credentials", es: "Credenciales inválidas" },
    description: {
      en: "That email and password combination did not match an account.",
      es: "Esa combinación de email y contraseña no coincide con ninguna cuenta.",
    },
  },
  emailTaken: {
    title: { en: "Email already in use", es: "Ese email ya está en uso" },
    description: {
      en: "That address already belongs to an account. Try logging in instead.",
      es: "Esa dirección ya pertenece a una cuenta. Probá iniciando sesión.",
    },
  },

  // --- password policy rejections -------------------------------------------
  passwordTooShort: {
    title: { en: "Password is too short", es: "La contraseña es muy corta" },
    description: {
      en: `Use at least {min} characters. ${PASSPHRASE_ESCAPE.en}`,
      es: `Usá al menos {min} caracteres. ${PASSPHRASE_ESCAPE.es}`,
    },
  },
  passwordTooLong: {
    title: { en: "Password is too long", es: "La contraseña es muy larga" },
    description: {
      en: "This one is past the maximum length. Trim it down and try again.",
      es: "Esta supera el largo máximo. Recortala y probá de nuevo.",
    },
  },
  passwordBreached: {
    title: {
      en: "This password appears in known data breaches",
      es: "Esta contraseña aparece en filtraciones conocidas",
    },
    description: {
      en: `It has leaked publicly, so it cannot be used here even though the length is fine. Pick something you have never used elsewhere. ${PASSPHRASE_ESCAPE.en}`,
      es: `Se filtró públicamente, así que no se puede usar acá aunque el largo esté bien. Elegí algo que nunca hayas usado en otro lado. ${PASSPHRASE_ESCAPE.es}`,
    },
  },
  passwordContainsEmail: {
    title: {
      en: "Password contains your email address",
      es: "La contraseña contiene tu email",
    },
    description: {
      en: `Pick something unrelated to the address you signed up with. ${PASSPHRASE_ESCAPE.en}`,
      es: `Elegí algo que no tenga que ver con la dirección con la que te registraste. ${PASSPHRASE_ESCAPE.es}`,
    },
  },
  passwordMissingCharacter: {
    title: {
      en: "Password is missing a required character",
      es: "Falta un tipo de carácter en la contraseña",
    },
    description: {
      en: `Mix in an uppercase letter, a number, or a symbol. ${PASSPHRASE_ESCAPE.en}`,
      es: `Sumá una mayúscula, un número o un símbolo. ${PASSPHRASE_ESCAPE.es}`,
    },
  },
  passwordTooWeak: {
    title: {
      en: "Password is too easy to guess",
      es: "La contraseña es fácil de adivinar",
    },
    description: {
      en: `It is built from common words or an obvious pattern. ${PASSPHRASE_ESCAPE.en}`,
      es: `Está armada con palabras comunes o un patrón obvio. ${PASSPHRASE_ESCAPE.es}`,
    },
  },
  /** Fallback when the rejection arrives without a reason we recognise. */
  weakPassword: {
    title: {
      en: "That password was rejected",
      es: "Esa contraseña fue rechazada",
    },
    description: {
      en: `Use at least {min} characters and avoid common words. ${PASSPHRASE_ESCAPE.en}`,
      es: `Usá al menos {min} caracteres y evitá palabras comunes. ${PASSPHRASE_ESCAPE.es}`,
    },
  },

  // --- everything else ------------------------------------------------------
  accountSuspended: {
    title: { en: "Account suspended", es: "Cuenta suspendida" },
    description: {
      en: "This account has been suspended. Contact support if you believe this is a mistake.",
      es: "Esta cuenta fue suspendida. Escribinos si creés que es un error.",
    },
  },
  auth: {
    title: { en: "Authentication failed", es: "Falló la autenticación" },
    description: {
      en: "Sign in could not be completed with the submitted credentials.",
      es: "No se pudo completar el inicio de sesión con las credenciales enviadas.",
    },
  },
  signupFailed: {
    title: { en: "Sign up failed", es: "No se pudo crear la cuenta" },
    description: {
      en: "The account could not be created with the submitted details. Try again shortly.",
      es: "No se pudo crear la cuenta con los datos enviados. Probá de nuevo en un rato.",
    },
  },
  config: {
    title: {
      en: "Sign in is not configured yet",
      es: "El inicio de sesión todavía no está configurado",
    },
    description: {
      en: "This request could not be completed. Recheck the server configuration.",
      es: "No se pudo completar esta solicitud. Revisá la configuración del servidor.",
    },
  },
  socialConfig: {
    title: {
      en: "Google sign-in is not ready yet",
      es: "El acceso con Google todavía no está listo",
    },
    description: {
      en: "The Google flow could not start. Confirm that Google Social Login is enabled.",
      es: "No se pudo iniciar el flujo de Google. Confirmá que el acceso con Google esté habilitado.",
    },
  },
  resetInvalid: {
    title: {
      en: "Reset link expired or invalid",
      es: "El link de recuperación venció o no es válido",
    },
    description: {
      en: "Request a fresh link from the forgot-password page.",
      es: "Pedí un link nuevo desde la página de recuperación.",
    },
  },
  resetFailed: {
    title: { en: "Reset failed", es: "No se pudo actualizar" },
    description: {
      en: "The password could not be updated. Try again shortly.",
      es: "No se pudo actualizar la contraseña. Probá de nuevo en un rato.",
    },
  },
} as const satisfies Record<string, AlertCopy>

type AlertKey = keyof typeof AUTH_ALERT_COPY

/**
 * Query-string error codes → copy. Both the auth pages and the reset page
 * read from this one map so the two surfaces cannot drift apart.
 */
const ERROR_CODE_TO_ALERT: Record<string, AlertKey> = {
  missing_fields: "missingFields",
  password_mismatch: "passwordMismatch",
  invalid_credentials: "invalidCredentials",
  email_taken: "emailTaken",
  password_too_short: "passwordTooShort",
  password_too_long: "passwordTooLong",
  password_breached: "passwordBreached",
  password_contains_email: "passwordContainsEmail",
  password_missing_character: "passwordMissingCharacter",
  password_too_weak: "passwordTooWeak",
  weak_password: "weakPassword",
  account_suspended: "accountSuspended",
  auth: "auth",
  signup_failed: "signupFailed",
  config: "config",
  social_config: "socialConfig",
  reset_invalid: "resetInvalid",
  reset_failed: "resetFailed",
}

export interface ResolvedAlertCopy {
  title: string
  description: string
}

export function getAuthAlertCopy({
  errorCode,
  locale,
  minLength,
  loggedOut = false,
  resetSuccess = false,
}: {
  errorCode?: string
  locale: SiteLocale
  minLength: number
  loggedOut?: boolean
  resetSuccess?: boolean
}): ResolvedAlertCopy | undefined {
  const key: AlertKey | undefined = resetSuccess
    ? "passwordUpdated"
    : loggedOut
      ? "signedOut"
      : errorCode
        ? ERROR_CODE_TO_ALERT[errorCode]
        : undefined

  if (!key) {
    return undefined
  }

  const copy = AUTH_ALERT_COPY[key]

  return {
    title: copy.title[locale],
    description: formatTemplate(copy.description[locale], { min: minLength }),
  }
}
