export type ApiErrorBody = {
  error?: string;
  tripId?: string;
  tripName?: string;
  details?: { fieldErrors?: Record<string, string[]> };
};

export function parseApiErrorBody(data: unknown): ApiErrorBody | null {
  if (data === undefined || data === null || typeof data !== 'object') {
    return null;
  }
  const body = data as ApiErrorBody;
  return {
    error: typeof body.error === 'string' ? body.error : undefined,
    tripId: typeof body.tripId === 'string' ? body.tripId : undefined,
    tripName: typeof body.tripName === 'string' ? body.tripName : undefined,
    details: body.details,
  };
}

export function formatApiErrorMessage(
  body: ApiErrorBody,
  fallback = 'Une erreur est survenue',
): string {
  if (body.tripName) {
    return `Une activité est déjà dans « ${body.tripName} »`;
  }

  let message = body.error ?? fallback;
  const fieldErr = body.details?.fieldErrors;
  if (fieldErr) {
    const [first] = Object.values(fieldErr).flat();
    if (first) {
      message = first;
    }
  }
  return message;
}
