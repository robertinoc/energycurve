import "server-only"

type LogLevel = "info" | "warn" | "error"

type LogValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | LogValue[]
  | { [key: string]: LogValue }

type LogMetadata = Record<string, LogValue>

function serializeError(error: unknown): LogValue {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack ?? null,
    }
  }

  if (typeof error === "string") {
    return error
  }

  if (
    typeof error === "object" &&
    error !== null &&
    !Array.isArray(error)
  ) {
    return error as Record<string, LogValue>
  }

  return error === undefined ? null : String(error)
}

function emitLog(level: LogLevel, event: string, metadata: LogMetadata = {}) {
  const payload = {
    app: "energycurve",
    level,
    event,
    timestamp: new Date().toISOString(),
    ...metadata,
  }

  const serialized = JSON.stringify(payload)

  if (level === "info") {
    console.info(serialized)
    return
  }

  if (level === "warn") {
    console.warn(serialized)
    return
  }

  console.error(serialized)
}

export function logInfo(event: string, metadata?: LogMetadata) {
  emitLog("info", event, metadata)
}

export function logWarn(event: string, metadata?: LogMetadata) {
  emitLog("warn", event, metadata)
}

export function logError(
  event: string,
  error: unknown,
  metadata: LogMetadata = {}
) {
  emitLog("error", event, {
    ...metadata,
    error: serializeError(error),
  })
}
