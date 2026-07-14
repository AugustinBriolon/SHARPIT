import { BodySide, PhysicalCategory, PhysicalStatus } from '@prisma/client';
import { corpsToneFromPhysicalSeverity } from '@/lib/health-status';
import { CORPS_TONE_TEXT } from '@/lib/metric-tone';

export const categoryLabels: Record<PhysicalCategory, string> = {
  PAIN: 'Douleur',
  INJURY: 'Blessure',
  MOBILITY: 'Mobilité',
  POSTURE: 'Posture',
  OTHER: 'Autre',
};

export const categoryOrder: PhysicalCategory[] = ['PAIN', 'INJURY', 'MOBILITY', 'POSTURE', 'OTHER'];

export const statusLabels: Record<PhysicalStatus, string> = {
  ACTIVE: 'Active',
  MONITORING: 'Sous surveillance',
  RESOLVED: 'Résolue',
};

export const statusOrder: PhysicalStatus[] = ['ACTIVE', 'MONITORING', 'RESOLVED'];

/** Badge de workflow (statut de suivi) — neutre, distinct des teintes de sévérité. */
export const statusBadgeClass: Record<PhysicalStatus, string> = {
  ACTIVE: 'bg-muted text-muted-foreground',
  MONITORING: 'bg-muted text-foreground/75',
  RESOLVED: 'bg-muted/70 text-muted-foreground/80',
};

export const sideLabels: Record<BodySide, string> = {
  LEFT: 'Gauche',
  RIGHT: 'Droit',
  BILATERAL: 'Bilatéral',
  NA: '—',
};

export const sideOrder: BodySide[] = ['NA', 'LEFT', 'RIGHT', 'BILATERAL'];

/** Suggestions rapides de zones du corps. */
export const COMMON_BODY_PARTS = [
  'Genou',
  'Cheville',
  'Pied',
  'Mollet',
  'Cuisse',
  'Ischio',
  'Hanche',
  'Bassin',
  'Dos',
  'Lombaires',
  'Épaule',
  'Cou',
  "Tendon d'Achille",
];

/** Couleur de sévérité 0–10 — via corpsToneFromPhysicalSeverity (health-status). */
export function severityColor(severity?: number | null): string {
  return CORPS_TONE_TEXT[corpsToneFromPhysicalSeverity(severity)];
}
