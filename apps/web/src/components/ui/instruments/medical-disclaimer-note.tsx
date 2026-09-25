import { ClinicalAnnotation } from '@/components/ui/instruments/clinical-annotation';
import { MEDICAL_DISCLAIMER_V0 } from '@/lib/copy/medical-disclaimer';
import { cn } from '@/lib/utils';

/**
 * Medical disclaimer — ClinicalAnnotation note for Settings (À propos), not coaching UI.
 * Do not place under Today verdict, wellness dialogs, or recovery alerts.
 */
export function MedicalDisclaimerNote({ className }: { className?: string }) {
  return (
    <ClinicalAnnotation className={cn('text-[0.6875rem] leading-snug text-pretty', className)}>
      {MEDICAL_DISCLAIMER_V0}
    </ClinicalAnnotation>
  );
}
