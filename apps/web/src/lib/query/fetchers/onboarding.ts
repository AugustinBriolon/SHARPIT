import { sendJson } from '@/lib/query/send-json';

export async function completeOnboarding(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await sendJson('/api/onboarding/complete', 'POST');
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Impossible de terminer l'onboarding",
    };
  }
}
