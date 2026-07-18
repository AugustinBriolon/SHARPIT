'use client';

import Link from 'next/link';
import { ClinicalAnnotation } from '@/components/ui/clinical-annotation';
import { useCoachContext } from '@/hooks/use-coach';
import { useAthleteProfile } from '@/hooks/use-data';
import { getProfileCompleteness } from '@/lib/profile-completeness';

export function ProfileContextBanner() {
  const { data: profile, isPending: profilePending } = useAthleteProfile();
  const { data: context, isPending: contextPending } = useCoachContext();

  if (profilePending || contextPending) return null;

  const { isComplete, missing, hasContext, contextLength } = getProfileCompleteness(
    profile,
    context,
  );

  if (isComplete) {
    return (
      <ClinicalAnnotation title="Profil actif">
        Contexte personnel ({contextLength} car.) et seuils pris en compte.{' '}
        <Link className="text-primary font-medium hover:underline" href="/profil">
          Modifier
        </Link>
      </ClinicalAnnotation>
    );
  }

  return (
    <ClinicalAnnotation title="Profil incomplet">
      {hasContext
        ? `Contexte actif (${contextLength} car.) — complète aussi : ${missing.join(', ')}.`
        : `Complète ton profil pour des propositions plus précises : ${missing.join(', ')} manquant(s).`}{' '}
      <Link className="text-primary font-medium hover:underline" href="/profil">
        Mon profil
      </Link>
    </ClinicalAnnotation>
  );
}
