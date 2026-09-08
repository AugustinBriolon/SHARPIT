'use client';

import { useEffect, useState } from 'react';
import { CalendarRange } from 'lucide-react';
import {
  PreferenceRadioGroup,
  type PreferenceOption,
} from '@/components/settings/preference-radio-group';
import {
  DATA_HISTORY_YEARS,
  type DataHistoryYears,
  readDataHistoryYearsFromStorage,
  writeDataHistoryYearsToStorage,
} from '@/lib/preferences/data-history-window';

const OPTIONS: readonly PreferenceOption<`${DataHistoryYears}`>[] = DATA_HISTORY_YEARS.map(
  (years) => ({
    id: `${years}` as `${DataHistoryYears}`,
    title: years === 1 ? '1 an' : `${years} ans`,
    description:
      years === 1
        ? 'Fenêtre courte — lectures récentes, moins de charge historique.'
        : `Remonter jusqu’à ${years} ans dans les historiques et courbes.`,
    icon: CalendarRange,
  }),
);

export function DataHistoryWindowPicker() {
  const [years, setYears] = useState<DataHistoryYears | null>(null);

  useEffect(() => {
    setYears(readDataHistoryYearsFromStorage());
  }, []);

  if (years === null) {
    return (
      <div aria-label="Fenêtre de données" className="space-y-3" aria-busy>
        <div className="bg-muted/45 h-[4.5rem] animate-pulse rounded-xl" />
        <div className="bg-muted/45 h-[4.5rem] animate-pulse rounded-xl" />
      </div>
    );
  }

  return (
    <PreferenceRadioGroup
      label="Fenêtre de données"
      options={OPTIONS}
      value={`${years}`}
      onChange={(id) => {
        const next = Number(id) as DataHistoryYears;
        setYears(next);
        writeDataHistoryYearsToStorage(next);
      }}
    />
  );
}
