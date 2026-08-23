'use client';

import Link from 'next/link';
import { ClinicalAnnotation } from '@/components/ui/instruments/clinical-annotation';
import { useCoachContext } from '@/hooks/use-coach';
import { useAthleteProfile } from '@/hooks/use-data';
import { getProfileCompleteness } from '@/lib/profile/profile-completeness';

export function ProfileContextBanner() {
  const { data: profile, isPending: profilePending } = useAthleteProfile();
  const { data: context, isPending: contextPending } = useCoachContext();

  if (profilePending || contextPending) return null;

  const { isComplete, gaps, hasContext, contextLength } = getProfileCompleteness(profile, context);

  if (isComplete) {
    return (
      <ClinicalAnnotation title="Profil actif">
        Contexte personnel ({contextLength} car.) et seuils pris en compte.{' '}
        <Link
          className="text-primary font-medium hover:underline"
          href="/settings/memory#memory-profile-context"
        >
          Modifier le contexte
        </Link>
        {' · '}
        <Link className="text-primary font-medium hover:underline" href="/progress?tab=performance">
          Calibration
        </Link>
      </ClinicalAnnotation>
    );
  }

  return (
    <ClinicalAnnotation title="Profil incomplet">
      {hasContext
        ? `Contexte actif (${contextLength} car.) — complète aussi : ${gaps.map((g) => g.label).join(', ')}.`
        : `Complète ton profil pour des propositions plus précises : ${gaps.map((g) => g.label).join(', ')} manquant(s).`}{' '}
      {gaps.map((gap, index) => (
        <span key={gap.key}>
          {index > 0 ? ' · ' : null}
          <Link className="text-primary font-medium hover:underline" href={gap.href}>
            {gap.cta}
          </Link>
        </span>
      ))}
    </ClinicalAnnotation>
  );
}
