/**
 * Privacy client fetchers.
 * Export (blob) and delete keep special semantics — not generic sendJson UX.
 */

import { sendJson } from '@/lib/query/send-json';

export async function postPrivacyConsent(body: Record<string, unknown>): Promise<unknown> {
  return sendJson('/api/privacy/consent', 'POST', body);
}

export async function downloadPrivacyExport(): Promise<Blob> {
  const response = await fetch('/api/privacy/export');
  if (!response.ok) {
    throw new Error('Export impossible');
  }
  return response.blob();
}

export async function deletePrivacyAccount(): Promise<void> {
  const response = await fetch('/api/privacy/delete', { method: 'POST' });
  if (!response.ok) {
    throw new Error('Suppression impossible');
  }
}
