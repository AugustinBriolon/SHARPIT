'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/toast';
import { CURRENT_PRIVACY_VERSION } from '@/lib/privacy/constants';

type ConsentWallFormProps = {
  /** Legacy santé exposure — stronger copy when providers/rows already exist. */
  healthExposure?: boolean;
};

function RequiredConsents({
  terms,
  privacy,
  health,
  healthExposure,
  onTerms,
  onPrivacy,
  onHealth,
}: {
  terms: boolean;
  privacy: boolean;
  health: boolean;
  healthExposure: boolean;
  onTerms: (value: boolean) => void;
  onPrivacy: (value: boolean) => void;
  onHealth: (value: boolean) => void;
}) {
  return (
    <div className="analysis-panel rounded-analysis-lg space-y-4 px-4 py-4">
      <label className="flex items-start gap-3 text-sm">
        <Checkbox
          checked={terms}
          className="mt-0.5"
          onCheckedChange={(value) => onTerms(value === true)}
        />
        <span>
          J&apos;accepte les{' '}
          <Link className="underline underline-offset-2" href="/terms" target="_blank">
            Conditions d&apos;utilisation
          </Link>
          .
        </span>
      </label>
      <label className="flex items-start gap-3 text-sm">
        <Checkbox
          checked={privacy}
          className="mt-0.5"
          onCheckedChange={(value) => onPrivacy(value === true)}
        />
        <span>
          J&apos;accepte la{' '}
          <Link className="underline underline-offset-2" href="/privacy" target="_blank">
            Politique de confidentialité
          </Link>
          .
        </span>
      </label>
      <label className="flex items-start gap-3 text-sm">
        <Checkbox
          checked={health}
          className="mt-0.5"
          onCheckedChange={(value) => onHealth(value === true)}
        />
        <span>
          J&apos;autorise le traitement de mes données de santé / physiologiques (synchronisation et
          inférences Twin). Requis pour utiliser l&apos;application.
          {healthExposure ? (
            <>
              {' '}
              Des sources santé ou des mesures sont déjà présentes sur ton compte — ce consentement
              est obligatoire pour continuer.
            </>
          ) : null}
        </span>
      </label>
    </div>
  );
}

function OptionalConsents({
  ai,
  unofficial,
  onAi,
  onUnofficial,
}: {
  ai: boolean;
  unofficial: boolean;
  onAi: (value: boolean) => void;
  onUnofficial: (value: boolean) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-label">Optionnel — tu pourras aussi les activer plus tard</p>
      <label className="flex items-start gap-3 text-sm">
        <Checkbox
          checked={ai}
          className="mt-0.5"
          onCheckedChange={(value) => onAi(value === true)}
        />
        <span>
          J&apos;autorise le traitement par IA (coach, bilans rédigés). Les moteurs déterministes du
          Twin fonctionnent sans ce consentement.
        </span>
      </label>
      <label className="flex items-start gap-3 text-sm">
        <Checkbox
          checked={unofficial}
          className="mt-0.5"
          onCheckedChange={(value) => onUnofficial(value === true)}
        />
        <span>
          Je comprends que certaines connexions fournisseurs peuvent être non officielles (requis à
          la connexion des sources concernées).
        </span>
      </label>
    </div>
  );
}

export function ConsentWallForm({ healthExposure = false }: ConsentWallFormProps) {
  const router = useRouter();
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [health, setHealth] = useState(false);
  const [ai, setAi] = useState(false);
  const [unofficial, setUnofficial] = useState(false);
  const [busy, setBusy] = useState(false);

  const canSubmit = terms && privacy && health && !busy;

  async function handleSubmit() {
    if (!canSubmit) {
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/privacy/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acceptLegal: true,
          healthDataConsent: true,
          aiProcessingConsent: ai || undefined,
          unofficialProvidersAck: unofficial || undefined,
        }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? 'Enregistrement impossible');
      }
      toast.success('Consentements enregistrés');
      router.replace('/');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Enregistrement impossible');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit();
      }}
    >
      <div className="space-y-1 text-center">
        <h1 className="text-section-title">Confidentialité & conditions</h1>
        <p className="text-muted-foreground text-sm text-pretty">
          Avant d&apos;utiliser SharpIt, accepte les documents légaux et le traitement des données
          de santé (version {CURRENT_PRIVACY_VERSION}).
        </p>
      </div>

      <RequiredConsents
        health={health}
        healthExposure={healthExposure}
        privacy={privacy}
        terms={terms}
        onHealth={setHealth}
        onPrivacy={setPrivacy}
        onTerms={setTerms}
      />
      <OptionalConsents ai={ai} unofficial={unofficial} onAi={setAi} onUnofficial={setUnofficial} />

      <Button className="w-full" disabled={!canSubmit} type="submit">
        {busy ? 'Enregistrement…' : 'Continuer'}
      </Button>
    </form>
  );
}
