'use client';

import type { LucideIcon } from 'lucide-react';
import { PreferenceRadioOption } from '@/components/settings/preference-radio-option';
import { usePreferenceRadioGroup } from '@/components/settings/use-preference-radio-group';

export type PreferenceOption<TId extends string> = {
  id: TId;
  title: string;
  description: string;
  icon: LucideIcon;
};

/**
 * The settings radio pattern — one card per option, arrow-key roving focus.
 *
 * Pure: it renders the options it is given and reports the choice. Where the
 * preference is stored is the caller's business.
 */
export function PreferenceRadioGroup<TId extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly PreferenceOption<TId>[];
  value: TId;
  onChange: (id: TId) => void;
}) {
  const { optionRefs, onRadioKeyDown } = usePreferenceRadioGroup(options, onChange);

  return (
    <div aria-label={label} className="space-y-3" role="radiogroup">
      {options.map((option, index) => (
        <PreferenceRadioOption
          key={option.id}
          active={value === option.id}
          description={option.description}
          icon={option.icon}
          tabIndex={value === option.id ? 0 : -1}
          title={option.title}
          setRef={(node) => {
            optionRefs.current[index] = node;
          }}
          onKeyDown={(event) => onRadioKeyDown(event, index)}
          onSelect={() => onChange(option.id)}
        />
      ))}
    </div>
  );
}
