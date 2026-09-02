import { ClinicalAnnotation } from '@/components/ui/instruments/clinical-annotation';
import { MEDICAL_DISCLAIMER_V0 } from '@/lib/copy/medical-disclaimer';
import { cn } from '@/lib/utils';

/**
 * Visible, always-available medical disclaimer — clinical annotation, not a banner.
 * Renders the exact V0 string with no paraphrasing title prefix.
 */
export function MedicalDisclaimerNote({ className }: { className?: string }) {
  return (
    <ClinicalAnnotation className={cn('text-pretty', className)}>
      {MEDICAL_DISCLAIMER_V0}
    </ClinicalAnnotation>
  );
}
