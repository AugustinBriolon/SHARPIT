import { formatApiErrorMessage, parseApiErrorBody } from '@/lib/query/api-error';

export type SendJsonOptions = {
  signal?: AbortSignal;
  keepalive?: boolean;
};

/** Shared JSON fetch helper for TanStack Query mutations. */
export async function sendJson(
  url: string,
  method: string,
  body?: unknown,
  options?: SendJsonOptions,
) {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: options?.signal,
    keepalive: options?.keepalive,
  });
  if (!res.ok) {
    const parsed = parseApiErrorBody(await res.json().catch(() => null));
    throw new Error(formatApiErrorMessage(parsed ?? {}));
  }
  // keepalive unload / 204 — empty body is ok
  if (res.status === 204) {
    return null;
  }
  const text = await res.text();
  if (!text) {
    return null;
  }
  return JSON.parse(text) as unknown;
}
