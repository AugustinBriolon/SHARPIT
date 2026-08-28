import { DEMO_SESSION_LINK_READING_DELAY_MS } from '@/lib/demo/demo-session-link-reading';

export type LinkPhase = 'idle' | 'linking' | 'analyzing' | 'done';

export function hasLoadMeta(secondary?: string | null): boolean {
  return Boolean(secondary?.toLowerCase().includes('tss'));
}

export function linkErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return 'La liaison a échoué. Réessaie dans un instant.';
}

export function demoAnalyzingDelayMs(): number {
  return DEMO_SESSION_LINK_READING_DELAY_MS;
}
