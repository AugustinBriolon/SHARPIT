import { Checkbox } from '@/components/ui/checkbox';
import type { EquipmentCatalogItem, EquipmentItemId } from '@/lib/equipment/catalog';
import { cn } from '@/lib/utils';

export function EquipmentItemChecklist({
  items,
  owned,
  onToggle,
}: {
  items: EquipmentCatalogItem[];
  owned: EquipmentItemId[];
  onToggle: (itemId: EquipmentItemId, enabled: boolean) => void;
}) {
  return (
    <div className="grid gap-2">
      {items.map((item) => {
        const checked = owned.includes(item.id);
        return (
          <label
            key={item.id}
            className={cn(
              'analysis-panel rounded-analysis-lg flex cursor-pointer items-start gap-3 px-3.5 py-3 transition-colors',
              checked ? 'border-highlight bg-highlight/20' : 'hover:bg-analysis-surface-alt/80',
            )}
          >
            <Checkbox
              checked={checked}
              className="mt-0.5"
              onCheckedChange={(value) => onToggle(item.id, value === true)}
            />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{item.label}</span>
              <span className="text-muted-foreground mt-0.5 block text-xs leading-relaxed">
                {item.impact}
              </span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
