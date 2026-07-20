/** Shared JSON fetch helper for TanStack Query mutations. */
export async function sendJson(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as {
      error?: string;
      details?: { fieldErrors?: Record<string, string[]> };
    } | null;
    let message = data?.error ?? 'Une erreur est survenue';
    const fieldErr = data?.details?.fieldErrors;
    if (fieldErr) {
      const [first] = Object.values(fieldErr).flat();
      if (first) message = first;
    }
    throw new Error(message);
  }
  return res.json();
}
