'use client';

import { Button } from '@sharpit/ui/components/ui/button';
import { Input } from '@/components/ui/input';

/** The web has no camera scanner: the code printed under the bars is typed in instead. */
export function FoodBarcodeField({
  pending,
  onSubmit,
}: {
  pending: boolean;
  onSubmit: (code: string) => void;
}) {
  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const code = new FormData(event.currentTarget).get('barcode');
        onSubmit(typeof code === 'string' ? code.replace(/\s+/g, '') : '');
      }}
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <label className="text-sm font-medium" htmlFor="food-barcode">
          Code-barres
        </label>
        <Input
          autoComplete="off"
          className="text-data tabular-nums"
          id="food-barcode"
          inputMode="numeric"
          name="barcode"
          placeholder="3017620422003"
        />
      </div>
      <Button disabled={pending} type="submit" variant="secondary">
        Chercher
      </Button>
    </form>
  );
}
