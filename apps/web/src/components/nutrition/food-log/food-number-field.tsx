'use client';

import { Input } from '@/components/ui/input';

/** A labelled decimal field — typed text, read by `parseDecimal` (a comma is a decimal point). */
export function FoodNumberField({
  name,
  label,
  unit,
  defaultValue,
  value,
  required = false,
  onChange,
}: {
  name: string;
  label: string;
  unit: string;
  defaultValue?: string;
  value?: string;
  required?: boolean;
  onChange?: (value: string) => void;
}) {
  const id = `food-field-${name}`;
  return (
    <div className="min-w-0 space-y-1.5">
      <label className="text-sm font-medium" htmlFor={id}>
        {label} <span className="text-muted-foreground font-normal">({unit})</span>
      </label>
      <Input
        autoComplete="off"
        className="text-data tabular-nums"
        defaultValue={defaultValue}
        id={id}
        inputMode="decimal"
        name={name}
        required={required}
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
      />
    </div>
  );
}
