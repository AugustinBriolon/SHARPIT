'use client';

import { AlertCircle, Check, Loader2 } from 'lucide-react';
import { CorpsPanel } from '@/components/corps/corps-ui';
import { useCoachContext } from '@/hooks/use-coach';
import { useAthleteProfile } from '@/hooks/use-data';
import { getProfileCompleteness } from '@/lib/profile-completeness';
import { cn } from '@/lib/utils';

function formatPace(secPerKm: number | null | undefined): string | null {
  if (secPerKm == null) return null;
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, '0')}/km`;
}

function ProfileStatusIcon({ loading, isComplete }: { loading: boolean; isComplete: boolean }) {
  if (loading) return <Loader2 className="size-4 animate-spin" />;
  if (isComplete) return <Check className="size-4" />;
  return <AlertCircle className="size-4" />;
}

export function ProfileAiSummary() {
  const profileQuery = useAthleteProfile();
  const contextQuery = useCoachContext();
  const profile = profileQuery.data;
  const context = contextQuery.data;
  const loading = profileQuery.isPending || contextQuery.isPending;

  const { hasThresholds, hasContext, isComplete, contextLength } = getProfileCompleteness(
    profile,
    context,
  );

  const thresholds = [
    profile?.ftpW != null ? `FTP ${profile.ftpW} W` : null,
    profile?.lthr != null ? `LTHR ${profile.lthr} bpm` : null,
    profile?.maxHr != null ? `FC max ${profile.maxHr} bpm` : null,
    formatPace(profile?.runThresholdPaceSecPerKm ?? null)
      ? `Allure seuil ${formatPace(profile?.runThresholdPaceSecPerKm ?? null)}`
      : null,
  ].filter(Boolean);

  return (
    <CorpsPanel className="space-y-3">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-lg',
            isComplete ? 'bg-emerald-500/10 text-emerald-700' : 'bg-amber-500/10 text-amber-700',
          )}
        >
          <ProfileStatusIcon isComplete={isComplete} loading={loading} />
        </div>
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium">Ce que le coach utilise</p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Chat, génération de semaine, adaptation du plan et analyses — tout s&apos;appuie sur ton
            profil et ton contexte ci-dessous, enrichis automatiquement par ta forme et ton
            historique.
          </p>
        </div>
      </div>

      {!loading && (
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="bg-muted/40 rounded-lg border px-3 py-2.5">
            <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
              Seuils
            </p>
            <p className="mt-1 text-sm">
              {hasThresholds ? thresholds.join(' · ') : 'Non renseignés'}
            </p>
          </div>
          <div className="bg-muted/40 rounded-lg border px-3 py-2.5">
            <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
              Contexte personnel
            </p>
            <p className="mt-1 text-sm">
              {hasContext
                ? `${contextLength} caractères — pris en compte en priorité`
                : 'Non renseigné'}
            </p>
          </div>
        </div>
      )}
    </CorpsPanel>
  );
}
