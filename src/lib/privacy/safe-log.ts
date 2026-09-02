/**
 * Safe logging helpers — never pass credentials, tokens, passwords, or raw
 * body metrics into log messages. Prefer athleteId + error name/code only.
 */

const SENSITIVE_KEY =
  /password|passwd|secret|token|cookie|authorization|credential|refresh|access_token|session/i;

export function sanitizeLogValue(value: unknown, depth = 0): unknown {
  if (depth > 4) {
    return '[Truncated]';
  }
  if (value == null) {
    return value;
  }
  if (typeof value === 'string') {
    if (value.length > 200) {
      return `${value.slice(0, 40)}…[len=${value.length}]`;
    }
    return value;
  }
  if (typeof value !== 'object') {
    return value;
  }
  if (value instanceof Error) {
    return { name: value.name, message: value.message };
  }
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeLogValue(item, depth + 1));
  }
  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEY.test(key)) {
      out[key] = '[Redacted]';
      continue;
    }
    out[key] = sanitizeLogValue(nested, depth + 1);
  }
  return out;
}

/** Log an error without leaking secrets or body-metric payloads. */
export function logSafeError(scope: string, error: unknown, meta?: Record<string, unknown>): void {
  const safeMeta = meta ? sanitizeLogValue(meta) : undefined;
  const safeError = sanitizeLogValue(error);
  if (safeMeta) {
    console.error(`[${scope}]`, safeError, safeMeta);
  } else {
    console.error(`[${scope}]`, safeError);
  }
}
