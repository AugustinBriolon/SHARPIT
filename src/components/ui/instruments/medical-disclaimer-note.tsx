import { ClinicalAnnotation } from '@/components/ui/instruments/clinical-annotation';
import { MEDICAL_DISCLAIMER_V0 } from '@/lib/copy/medical-disclaimer';
import { cn } from '@/lib/utils';

/**
 * Secondary medical disclaimer — ClinicalAnnotation note, never a banner.
 * Keep typography small so Today hero verdict + action stay above the mobile fold.
 */
export function MedicalDisclaimerNote({ className }: { className?: string }) {
  return (
    <ClinicalAnnotation
      className={cn('text-pretty text-[0.6875rem] leading-snug', className)}
    >
      {MEDICAL_DISCLAIMER_V0}
    </ClinicalAnnotation>
  );
}
