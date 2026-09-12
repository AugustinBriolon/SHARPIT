import { sendJson } from '@/lib/query/send-json';

export async function postMorningRecalibrationAction(body: {
  decisionId: string;
  action: 'accept' | 'reject';
}): Promise<void> {
  await sendJson('/api/morning-recalibration/action', 'POST', body);
}
