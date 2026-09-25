import {
  isConcerning,
  POSITION_WORD,
  positionOf,
  type MarkerRange,
} from '@/components/today/drill-down/marker-band';

export function markerRangeWord(range: MarkerRange): string {
  return range.kind === 'baseline' ? 'norme' : '14 j';
}

export function deriveMarkerCardState({
  value,
  range,
  lowerIsBetter,
}: {
  value: number | null;
  range: MarkerRange | null;
  lowerIsBetter: boolean;
}) {
  const position = value !== null && range !== null ? positionOf(value, range) : null;
  const concerning = position !== null && isConcerning(position, lowerIsBetter);
  const rangeWord = range ? markerRangeWord(range) : null;
  const positionLabel =
    position && rangeWord ? `${POSITION_WORD[position]} ${rangeWord}` : 'Pas de référence';

  return { position, concerning, positionLabel };
}
