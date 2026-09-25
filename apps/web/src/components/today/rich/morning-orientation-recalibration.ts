import { toast } from '@/components/ui/toast';
import { writeClientMorningHold } from '@/components/today/rich/morning-orientation-hold';
import { postMorningRecalibrationAction } from '@/lib/query/fetchers';

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
  try {
    await postMorningRecalibrationAction({ decisionId, action });
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Action impossible');
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
