'use client';

import { AlertCircle, Check } from 'lucide-react';
import Link from 'next/link';
import { useCoachContext } from '@/hooks/use-coach';
import { useAthleteProfile } from '@/hooks/use-data';
import { getProfileCompleteness } from '@/lib/profile-completeness';
import { cn } from '@/lib/utils';

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
      <p
        className={cn(
          'flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-md border px-3 py-2 text-xs',
          'text-muted-foreground border-emerald-500/20 bg-emerald-500/5',
        )}
      >
        <Check className="size-3.5 shrink-0 text-emerald-600" />
        <span>
          Profil actif — contexte personnel ({contextLength} car.) et seuils pris en compte.
        </span>
        <Link className="text-primary font-medium hover:underline" href="/profil">
          Modifier
        </Link>
      </p>
    );
  }

  return (
    <p
      className={cn(
        'flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-md border px-3 py-2 text-xs',
        'text-muted-foreground border-amber-500/25 bg-amber-500/5',
      )}
    >
      <AlertCircle className="size-3.5 shrink-0 text-amber-600" />
      <span>
        {hasContext
          ? `Contexte actif (${contextLength} car.) — complète aussi : ${missing.join(', ')}.`
          : `Complète ton profil pour des propositions plus précises : ${missing.join(', ')} manquant(s).`}
      </span>
      <Link className="text-primary font-medium hover:underline" href="/profil">
        Mon profil
      </Link>
    </p>
  );
}
