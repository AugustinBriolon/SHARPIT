import { Bike, Footprints, Waves } from 'lucide-react';
import type { MultisportLegKind } from '@/lib/multisport';

export const sportHeader: Record<
  Exclude<MultisportLegKind, 'transition'>,
  { icon: typeof Waves; accent: string; description: string }
> = {
  swim: {
    icon: Waves,
    accent: 'text-blue-600 bg-blue-500/10',
    description: 'Fréquence cardiaque et rythme en eau libre',
  },
  bike: {
    icon: Bike,
    accent: 'text-emerald-600 bg-emerald-500/10',
    description: 'Puissance, dénivelé et zones d’effort',
  },
  run: {
    icon: Footprints,
    accent: 'text-orange-600 bg-orange-500/10',
    description: 'Allure, splits et réponse cardiovasculaire',
  },
};
