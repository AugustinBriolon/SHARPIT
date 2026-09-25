import { formatApiErrorMessage, parseApiErrorBody } from '@/lib/query/api-error';
import { coachBeuiCopy } from '@/components/coach/beui/coach-beui-copy';

function shouldUseTransportFallback(raw: string | undefined): boolean {
  if (!raw) {
    return true;
  }
  return raw.toLowerCase().includes('api key');
}

function parseJsonTransportError(raw: string, fallback: string): string | null {
  if (!raw.startsWith('{')) {
    return null;
  }
  try {
    const body = parseApiErrorBody(JSON.parse(raw) as unknown);
    if (body?.error) {
      return formatApiErrorMessage(body, fallback);
    }
  } catch {
    // Fall through to the raw message when it isn't JSON.
  }
  return null;
}

/**
 * AI SDK often surfaces non-OK chat responses as Error.message = raw JSON body.
 * Prefer the athlete-facing `error` field when present.
 */
export function humanizeCoachTransportError(
  error: Error | undefined,
  fallback = coachBeuiCopy.genericError,
): string {
  const raw = error?.message?.trim();
  if (shouldUseTransportFallback(raw)) {
    return fallback;
  }

  const parsed = parseJsonTransportError(raw!, fallback);
  return parsed ?? raw!;
}
