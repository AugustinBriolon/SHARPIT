import { toast } from '@/components/ui/toast';
import { writeClientMorningHold } from '@/components/today/rich/morning-orientation-hold';

export async function postMorningRecalibration({
  action,
  decisionId,
  direction,
  trainingDayId,
  onSuccess,
}: {
  action: 'accept' | 'reject';
  decisionId: string;
  direction: 'DOWN' | 'UP' | null;
  trainingDayId: string;
  onSuccess: () => void;
}) {
  const res = await fetch('/api/morning-recalibration/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decisionId, action }),
  });
  const data = (await res.json()) as { error?: string };
  if (!res.ok) {
    toast.error(data.error ?? 'Action impossible');
    return;
  }
  if (action === 'reject') {
    writeClientMorningHold(trainingDayId);
  }
  onSuccess();
  if (action === 'reject') {
    toast.success('Plan tenu');
  } else if (direction === 'UP') {
    toast.success('Hausse appliquée');
  } else {
    toast.success('Ajustement appliqué');
  }
}
