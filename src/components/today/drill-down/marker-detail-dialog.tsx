'use client';

import Link from 'next/link';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { MarkerRange } from '@/components/today/drill-down/marker-band';
import {
  MarkerDetailActionLink,
  MarkerDetailHistorySection,
  MarkerDetailPositionLine,
} from '@/components/today/drill-down/marker-detail-dialog-sections';
import {
  MarkerDetailRangeBlock,
  MarkerDetailValueRow,
} from '@/components/today/drill-down/marker-detail-dialog-parts';
import type { MarkerHistoryPoint } from '@/components/today/drill-down/marker-history-chart';

/**
 * The full reading of one marker, opened on demand.
 */
export type MarkerDetail = {
  label: string;
  value: number | null;
  unit: string;
  delta: number | null;
  range: MarkerRange | null;
  series: MarkerHistoryPoint[];
  format?: (value: number) => string;
  explanation: string;
  reading?: string | null;
  concerning: boolean;
  positionWord: string | null;
  action?: { label: string; href: string } | null;
};

export function MarkerDetailDialog({
  detail,
  onClose,
}: {
  detail: MarkerDetail | null;
  onClose: () => void;
}) {
  if (!detail) {
    return null;
  }

  const { range, value, delta, series } = detail;
  const format = detail.format ?? ((raw: number) => String(raw));

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{detail.label}</DialogTitle>
        </DialogHeader>

        <MarkerDetailValueRow
          concerning={detail.concerning}
          format={format}
          unit={detail.unit}
          value={value}
        />

        {range && value !== null ? (
          <MarkerDetailRangeBlock
            concerning={detail.concerning}
            format={format}
            range={range}
            value={value}
          />
        ) : null}

        <MarkerDetailPositionLine
          concerning={detail.concerning}
          positionWord={detail.positionWord}
        />

        <DialogDescription>{detail.explanation}</DialogDescription>

        <MarkerDetailHistorySection delta={delta} series={series} unit={detail.unit} />

        {detail.reading ? (
          <p className="text-foreground text-sm leading-relaxed">{detail.reading}</p>
        ) : null}

        <MarkerDetailActionLink action={detail.action} />
      </DialogContent>
    </Dialog>
  );
}
