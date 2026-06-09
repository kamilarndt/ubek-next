/**
 * Safe logging utilities.
 * Never log raw Error objects or values that may contain secrets, DB schemas, internal paths, or PII.
 * Use for production observability without data leakage (addresses audit finding on raw console.error).
 */

export function logError(context: string, err: unknown, extra?: Record<string, unknown>) {
  const message = err instanceof Error ? err.message : String(err)
  // Redact anything that looks like a path, connection string, or long stack in message if needed.
  const safeMessage = message.replace(/\/[\w./-]+/g, '[redacted-path]').slice(0, 300)
  console.error(`[${context}] ${safeMessage}`, extra ? { extra } : '')
}

export function logWarn(context: string, msg: string, extra?: Record<string, unknown>) {
  console.warn(`[${context}] ${msg}`, extra ? { extra } : '')
}
