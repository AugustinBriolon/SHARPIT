import {
  splitInstrumentMeta,
  type InstrumentListChipMeta,
} from '@/components/ui/instruments/instrument-list-chip';
import type { TodayViewModel } from '@/core/presentation/today-view-model';

type DaySummaryLine = TodayViewModel['actionRow']['daySummaryLines'][number];

export function buildDaySummaryMeta(line: DaySummaryLine): InstrumentListChipMeta[] {
  const rawMeta = splitInstrumentMeta(line.secondary);
  const meta: InstrumentListChipMeta[] =
    line.kind === 'missed'
      ? rawMeta.map((text, i) => (i === 0 ? { text, tone: 'caution' as const } : text))
      : rawMeta;

  if (line.morningChoiceLabel) {
    meta.push({ text: line.morningChoiceLabel, tone: 'caution' });
  }

  return meta;
}

export function daySummaryOpenPlanned(
  line: DaySummaryLine,
  onOpenPlanned: (sessionId: string) => void,
): (() => void) | undefined {
  if (line.kind !== 'planned' && line.kind !== 'missed') {
    return undefined;
  }
  return () => onOpenPlanned(line.id);
}
