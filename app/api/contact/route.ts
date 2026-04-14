import { NextResponse } from "next/server"
import { ZodError } from "zod"

import { createContactFormSchema } from "@/lib/contact-form"
import { SiteLocale } from "@/lib/content/site-copy"
import { checkRateLimit } from "@/lib/rate-limit"
import { submitContactMessage } from "@/services/contact-service"

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT_MAX_REQUESTS = 5

function getClientIp(headers: Headers) {
  const forwardedFor = headers.get("x-forwarded-for")

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown"
  }

  return headers.get("x-real-ip") ?? "unknown"
}

function isTrustedOrigin(request: Request) {
  const requestOrigin = new URL(request.url).origin
  const origin = request.headers.get("origin")
  const referer = request.headers.get("referer")

  if (origin && origin !== requestOrigin) {
    return false
  }

  if (referer && !referer.startsWith(requestOrigin)) {
    return false
  }

  return true
}

function getApiMessage(
  locale: SiteLocale,
  key:
    | "untrusted"
    | "rate_limit"
    | "invalid_body"
    | "field_error"
    | "success"
    | "server_error"
) {
  const messages = {
    en: {
      untrusted: "Untrusted origin.",
      rate_limit: "Too many messages sent recently. Please try again shortly.",
      invalid_body: "Invalid request body.",
      field_error: "Please review the highlighted fields and try again.",
      success: "Thanks. Your message has been received.",
      server_error: "We could not send your message right now. Please try again.",
    },
    es: {
      untrusted: "Origen no permitido.",
      rate_limit: "Se enviaron demasiados mensajes recientemente. Intentá de nuevo en unos minutos.",
      invalid_body: "El cuerpo de la solicitud es inválido.",
      field_error: "Revisá los campos marcados e intentá nuevamente.",
      success: "Gracias. Recibimos tu mensaje.",
      server_error: "No pudimos enviar tu mensaje ahora mismo. Intentá nuevamente.",
    },
  } as const

  return messages[locale][key]
}

export async function POST(request: Request) {
  const fallbackLocale = "en"

  if (!isTrustedOrigin(request)) {
    return NextResponse.json(
      { ok: false, message: getApiMessage(fallbackLocale, "untrusted") },
      { status: 403 }
    )
  }

  const ipAddress = getClientIp(request.headers)
  const rateLimit = checkRateLimit({
    key: `contact:${ipAddress}`,
    limit: RATE_LIMIT_MAX_REQUESTS,
    windowMs: RATE_LIMIT_WINDOW_MS,
  })

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        message: getApiMessage(fallbackLocale, "rate_limit"),
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)),
        },
      }
    )
  }

  let json: unknown

  try {
    json = await request.json()
  } catch {
    return NextResponse.json(
      { ok: false, message: getApiMessage(fallbackLocale, "invalid_body") },
      { status: 400 }
    )
  }

  try {
    const requestedLocale =
      typeof json === "object" &&
      json !== null &&
      "locale" in json &&
      (json as Record<string, unknown>).locale === "es"
        ? "es"
        : "en"

    const parsed = createContactFormSchema(requestedLocale).parse(json)

    if (parsed.company) {
      return NextResponse.json({
        ok: true,
        message: getApiMessage(parsed.locale, "success"),
      })
    }

    await submitContactMessage(parsed, {
      ipAddress,
      userAgent: request.headers.get("user-agent"),
      origin: new URL(request.url).origin,
    })

    return NextResponse.json({
      ok: true,
      message: getApiMessage(parsed.locale, "success"),
    })
  } catch (error) {
    if (error instanceof ZodError) {
      const locale =
        typeof json === "object" &&
        json !== null &&
        "locale" in json &&
        (json as Record<string, unknown>).locale === "es"
          ? "es"
          : "en"

      return NextResponse.json(
        {
          ok: false,
          message: getApiMessage(locale, "field_error"),
          fieldErrors: error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    console.error("Contact form submission failed", error)

    return NextResponse.json(
      {
        ok: false,
        message: getApiMessage(fallbackLocale, "server_error"),
      },
      { status: 500 }
    )
  }
}
