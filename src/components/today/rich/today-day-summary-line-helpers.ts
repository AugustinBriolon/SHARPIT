import {
  splitInstrumentMeta,
  type InstrumentListChipMeta,
} from '@/components/ui/instruments/instrument-list-chip';
import type { TodayViewModel } from '@/core/presentation/today-view-model';

type DaySummaryLine = TodayViewModel['actionRow']['daySummaryLines'][number];

export function buildDaySummaryMeta(line: DaySummaryLine): InstrumentListChipMeta[] {
  const meta: InstrumentListChipMeta[] = splitInstrumentMeta(line.secondary);

  if (line.morningChoiceLabel) {
    meta.push({ text: line.morningChoiceLabel, tone: 'caution' });
  }

  return meta;
}

export function daySummaryOpenPlanned(
  line: DaySummaryLine,
  onOpenPlanned: (sessionId: string) => void,
): (() => void) | undefined {
  if (line.kind !== 'planned') {
    return undefined;
  }
  return () => onOpenPlanned(line.id);
}
