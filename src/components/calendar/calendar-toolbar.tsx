import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { GoogleCalendarInfo } from '@/lib/query/fetchers';
import { cn } from '@/lib/utils';
import { CalendarCog, ChevronLeft, ChevronRight, Plus } from 'lucide-react';

function CalendarVisibilityMenu({
  calendars,
  loading,
  error,
  onToggle,
  compact = false,
}: {
  calendars: GoogleCalendarInfo[];
  loading: boolean;
  error: string | null;
  onToggle: (calendarId: string, visible: boolean) => Promise<void>;
  compact?: boolean;
}) {
  const selectable = calendars.filter((c) => !c.isTarget);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label="Calendriers Google"
            disabled={loading}
            size={compact ? 'icon' : 'sm'}
            variant="outline"
          >
            <CalendarCog className="size-4" />
            {!compact && 'Calendriers'}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Calendriers Google affichés</DropdownMenuLabel>
          {loading && <p className="text-muted-foreground px-2 py-1.5 text-xs">Chargement…</p>}
          {!loading && selectable.length === 0 && (
            <p className="text-muted-foreground px-2 py-1.5 text-xs">Aucun autre calendrier.</p>
          )}
          {selectable.map((c) => (
            <DropdownMenuCheckboxItem
              key={c.id}
              checked={!c.hidden}
              closeOnClick={false}
              onCheckedChange={(checked) => onToggle(c.id, checked)}
            >
              <span className="flex items-center gap-2 truncate">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: c.backgroundColor ?? '#9ca3af' }}
                />
                <span className="truncate">{c.summary}</span>
              </span>
            </DropdownMenuCheckboxItem>
          ))}
          {error && <p className="text-destructive px-2 py-1.5 text-xs">{error}</p>}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function CalendarToolbar({
  embedded,
  isMobile,
  mounted,
  title,
  googleConnected,
  calendars,
  calendarsLoading,
  visibilityError,
  onPlan,
  onPrev,
  onNext,
  onToday,
  onToggleCalendar,
}: {
  embedded: boolean;
  isMobile: boolean;
  mounted: boolean;
  title: string;
  googleConnected: boolean;
  calendars: GoogleCalendarInfo[];
  calendarsLoading: boolean;
  visibilityError: string | null;
  onPlan: () => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onToggleCalendar: (calendarId: string, visible: boolean) => Promise<void>;
}) {
  const showTitle = isMobile || !embedded;

  const navButtons = (
    <>
      <Button
        aria-label="Période précédente"
        disabled={!mounted}
        size="icon"
        variant="outline"
        onClick={onPrev}
      >
        <ChevronLeft className="size-4" />
      </Button>
      <Button disabled={!mounted} size="sm" variant="outline" onClick={onToday}>
        {isMobile ? 'Auj.' : "Aujourd'hui"}
      </Button>
      <Button
        aria-label="Période suivante"
        disabled={!mounted}
        size="icon"
        variant="outline"
        onClick={onNext}
      >
        <ChevronRight className="size-4" />
      </Button>
    </>
  );

  if (isMobile) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-end gap-2">
          {!showTitle && <div className="min-w-0 flex-1" />}
          {googleConnected && (
            <CalendarVisibilityMenu
              calendars={calendars}
              error={visibilityError}
              loading={calendarsLoading}
              compact
              onToggle={onToggleCalendar}
            />
          )}
          <div className="flex shrink-0 items-center gap-1">{navButtons}</div>
          <Button
            aria-label="Planifier une séance"
            disabled={!mounted}
            size="icon"
            onClick={onPlan}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {!embedded && <p className="text-primary text-xs font-medium uppercase">Calendar</p>}
          <h1
            className={cn(
              'font-heading font-semibold capitalize',
              embedded ? 'text-xl' : 'mt-2 text-3xl',
            )}
          >
            {title}
          </h1>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {googleConnected && (
            <CalendarVisibilityMenu
              calendars={calendars}
              error={visibilityError}
              loading={calendarsLoading}
              onToggle={onToggleCalendar}
            />
          )}
          {navButtons}
          <Button disabled={!mounted} onClick={onPlan}>
            <Plus className="size-4" />
            Planifier
          </Button>
        </div>
      </div>
    </div>
  );
}
