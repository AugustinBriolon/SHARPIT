import { AnalyticsClient } from '@/components/analytics/analytics-client';
import { RecordsPanel } from '@/components/analytics/records-panel';

export default function AnalyticsPage() {
  return (
    <div className="space-y-0">
      <AnalyticsClient />
      <RecordsPanel />
    </div>
  );
}
