/**
 * Athlete-facing FR errors for coach plan generation failures.
 * Keep precise enough to act; never dump Zod paths or stack traces.
 */

function errorText(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

type IssueLike = { path?: unknown[]; message?: string };
type NestedError = {
  issues?: IssueLike[];
  cause?: unknown;
  text?: unknown;
};

function pushIssuePaths(issues: IssueLike[] | undefined, parts: string[]): void {
  for (const issue of issues ?? []) {
    const path = Array.isArray(issue.path) ? issue.path.join('.') : '';
    parts.push(`${path || 'root'}: ${issue.message ?? 'invalid'}`);
  }
}

function collectZodIssues(node: unknown, depth: number, parts: string[]): void {
  if (!node || typeof node !== 'object' || depth > 4) {
    return;
  }
  const record = node as NestedError;
  pushIssuePaths(record.issues, parts);
  if (record.cause) {
    collectZodIssues(record.cause, depth + 1, parts);
  }
}

/** Best-effort extract of nested Zod / TypeValidation paths for ops logs. */
export function coachGenerationErrorDetails(error: unknown): string | null {
  if (!error || typeof error !== 'object') {
    return null;
  }
  const parts: string[] = [];
  collectZodIssues(error, 0, parts);
  if (parts.length > 0) {
    return parts.slice(0, 8).join(' · ');
  }
  const { text } = error as NestedError;
  if (typeof text === 'string' && text.length > 0) {
    return `text_len=${text.length}`;
  }
  return null;
}

const ERROR_RULES: Array<{ pattern: RegExp; message: string }> = [
  {
    pattern: /gateway|fetch failed|ECONNREFUSED|ETIMEDOUT|network|AbortError/i,
    message: 'Connexion au coach IA impossible. Vérifie ta connexion (réseau, VPN) puis réessaie.',
  },
  {
    pattern: /insufficient_funds|credit balance|402/i,
    message: 'Le coach IA est temporairement indisponible (quota). Réessaie plus tard.',
  },
  {
    pattern: /rate.?limit|429|too many/i,
    message: 'Trop de générations d’affilée. Attends une minute puis réessaie.',
  },
  {
    pattern: /No object generated|did not match schema|schema|validation|Zod/i,
    message:
      'Le coach a renvoyé une proposition incomplète. Réessaie — en général ça passe au second essai.',
  },
];

export function planGenerationErrorMessage(error: unknown): string {
  const message = errorText(error);
  if (/Aucune séance exploitable|Réponse coach vide/i.test(message)) {
    return message;
  }
  for (const rule of ERROR_RULES) {
    if (rule.pattern.test(message)) {
      return rule.message;
    }
  }
  return 'La génération a échoué. Réessaie dans un instant.';
}
