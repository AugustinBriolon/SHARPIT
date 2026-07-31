'use client';

import { useForm } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ActivityFormValues } from '@/components/training/activity/activity-form-helpers';

export function ActivityFormField({
  label,
  name,
  form,
  factor,
}: {
  label: string;
  name: string;
  form: ReturnType<typeof useForm<ActivityFormValues>>;
  factor?: number;
}) {
  const parts = name.split('.');
  const fieldName = parts[parts.length - 1];

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        name={fieldName}
        step="any"
        type="number"
        defaultValue={
          parts.length === 2
            ? (() => {
                const [group, key] = parts;
                const groupValue = form.getValues(group as keyof ActivityFormValues) as
                  Record<string, number> | undefined;
                const val = groupValue?.[key];
                if (val === undefined || val === null) return undefined;
                return factor ? val / factor : val;
              })()
            : undefined
        }
        onChange={(e) => {
          const raw = e.target.value;
          const value = raw ? Number(raw) : undefined;
          const finalValue = value !== undefined && factor ? value * factor : value;

          if (parts.length === 2) {
            const [group, key] = parts as [string, string];
            const current = (form.getValues(group as keyof ActivityFormValues) ?? {}) as Record<
              string,
              unknown
            >;
            form.setValue(
              group as keyof ActivityFormValues,
              {
                ...current,
                [key]: finalValue,
              } as ActivityFormValues[keyof ActivityFormValues],
            );
          } else {
            form.setValue(name as keyof ActivityFormValues, finalValue as never);
          }
        }}
      />
    </div>
  );
}
