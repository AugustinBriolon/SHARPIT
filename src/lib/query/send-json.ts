import { formatApiErrorMessage, parseApiErrorBody } from '@/lib/query/api-error';

/** Shared JSON fetch helper for TanStack Query mutations. */
export async function sendJson(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const parsed = parseApiErrorBody(await res.json().catch(() => null));
    throw new Error(formatApiErrorMessage(parsed ?? {}));
  }
  return res.json();
}
