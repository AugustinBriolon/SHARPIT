import { STRENGTH_VENUE_OPTIONS, type StrengthVenue } from '@/lib/equipment/catalog';
import { cn } from '@/lib/utils';

export function StrengthVenuePicker({
  value,
  onSelect,
}: {
  value: StrengthVenue | null;
  onSelect: (venue: StrengthVenue) => void;
}) {
  return (
    <div aria-label="Lieu de musculation" className="space-y-2" role="radiogroup">
      <p className="text-sm font-medium">Où t&apos;entraînes-tu en musculation ?</p>
      {STRENGTH_VENUE_OPTIONS.map((option) => {
        const active = value === option.id;
        return (
          <button
            key={option.id}
            aria-checked={active}
            role="radio"
            type="button"
            className={cn(
              'analysis-panel rounded-analysis-lg w-full px-3.5 py-3 text-left transition-colors',
              active ? 'border-highlight bg-highlight/30' : 'hover:bg-analysis-surface-alt/80',
            )}
            onClick={() => onSelect(option.id)}
          >
            <p className="text-sm font-medium">{option.title}</p>
            <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
              {option.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}
