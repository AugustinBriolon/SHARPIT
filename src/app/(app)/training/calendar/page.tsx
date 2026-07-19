import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { CalendarView } from '@/components/calendar/calendar-view';

export default function TrainingCalendarPage() {
  return (
    <div className="space-y-4">
      <MobileBackLink href="/training" label="Entraînement" showOnDesktop />
      <StickyHeader>
        <p className="text-label">Entraînement</p>
        <h1 className="text-page-title mt-1">Calendar</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Vue temporelle du plan, des séances réalisées et de ce qui arrive ensuite.
        </p>
      </StickyHeader>

      <CalendarView embedded showCoachMenu showPlanButton />
    </div>
  );
}
