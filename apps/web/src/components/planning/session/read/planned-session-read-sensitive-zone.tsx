'use client';

import { usePhysicalNotes } from '@/hooks/use-physical';
import { useSensitiveZoneAck } from '@/hooks/use-sensitive-zone-ack';
import { sessionZoneFlags } from '@sharpit/server/lib/physical-health/sensitive-zone-audit';
import {
  bySeverityDesc,
  describeZone,
  sensitiveZonesFrom,
} from '@sharpit/server/lib/physical-health/sensitive-zones';
import type { ClientPlannedSession } from '@sharpit/server/lib/query/types';

function SensitiveZoneAcked({ onUndo }: { onUndo: () => void }) {
  return (
    <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 px-0.5 text-xs">
      <span>Charge sur une zone sensible assumée pour cette séance.</span>
      <button
        className="hover:text-foreground underline underline-offset-2"
        type="button"
        onClick={onUndo}
      >
        Réafficher l’alerte
      </button>
    </p>
  );
}

function SensitiveZoneAlert({
  zoneText,
  exercises,
  onAcknowledge,
}: {
  zoneText: string;
  exercises: string[];
  onAcknowledge: () => void;
}) {
  return (
    <div className="border-signal-vo2/30 bg-signal-vo2/8 text-signal-vo2 space-y-2 rounded-lg border px-3 py-2 text-xs">
      <p>
        {exercises.length > 0 ? (
          <>
            Cette séance charge une zone que tu protèges ({zoneText}) : {exercises.join(', ')}.
            Adapte ou remplace ces exercices.
          </>
        ) : (
          <>
            Ce sport sollicite une zone que tu protèges ({zoneText}). Adapte le volume et
            l’intensité, ou change de sport ce jour-là.
          </>
        )}
      </p>
      <button
        className="border-signal-vo2/40 hover:bg-signal-vo2/10 pressable inline-flex min-h-8 items-center rounded-full border px-3 font-medium transition-colors"
        type="button"
        onClick={onAcknowledge}
      >
        C’est voulu
      </button>
    </div>
  );
}

export function SensitiveZoneWarning({ session }: { session: ClientPlannedSession }) {
  const notesQuery = usePhysicalNotes();
  const { acked, acknowledge, undo } = useSensitiveZoneAck(session.id);
  const flags = sessionZoneFlags(session, sensitiveZonesFrom(notesQuery.data ?? []));

  if (flags.length === 0) {
    return null;
  }
  if (acked) {
    return <SensitiveZoneAcked onUndo={undo} />;
  }

  const zoneText = [...new Map(flags.map((flag) => [flag.zone.label, flag.zone])).values()]
    .sort(bySeverityDesc)
    .map(describeZone)
    .join(', ');

  return (
    <SensitiveZoneAlert
      exercises={[...new Set(flags.flatMap((flag) => (flag.exercise ? [flag.exercise] : [])))]}
      zoneText={zoneText}
      onAcknowledge={acknowledge}
    />
  );
}
