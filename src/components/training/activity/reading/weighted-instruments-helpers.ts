/**
 * Split hero instrument slots into primary (first viewport) vs secondary (quieter row).
 * Primary count is capped so the plate never becomes a metric inventory.
 */
export type WeightedInstrumentItem = {
  label: string;
  value: string | null;
};

export function partitionWeightedInstruments<T extends WeightedInstrumentItem>(
  items: T[],
  primaryCount = 3,
): { primary: T[]; secondary: T[] } {
  const capped = Math.max(0, Math.min(primaryCount, items.length));
  return {
    primary: items.slice(0, capped),
    secondary: items.slice(capped),
  };
}
