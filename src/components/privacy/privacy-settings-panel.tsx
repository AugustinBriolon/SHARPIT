'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SignOutButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/toast';
import {
  CONTROLLER_EMAIL,
  CURRENT_PRIVACY_VERSION,
  PRIVACY_PURGE_DELAY_DAYS,
} from '@/lib/privacy/constants';

type ConsentState = {
  termsAcceptedAt: string | null;
  privacyAcceptedAt: string | null;
  privacyVersion: string | null;
  healthDataConsentAt: string | null;
  aiProcessingConsentAt: string | null;
  unofficialProvidersAckAt: string | null;
  currentPrivacyVersion: string;
};

const HEALTH_DISCLAIMER =
  'Sharpit est un outil d’aide à l’entraînement. Ce n’est pas un dispositif médical et ça ne remplace pas un avis médical. Les signaux (récupération, fatigue, risques) sont des estimations d’entraînement, pas un diagnostic.';

export function PrivacySettingsPanel({ initial }: { initial: ConsentState | null }) {
  const router = useRouter();
  const { confirm, dialog } = useConfirmDialog();
  const [consents, setConsents] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [pendingSignOut, setPendingSignOut] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'provider_consent_required') {
      toast.error(
        'Accepte d’abord le consentement données de santé et l’accusé fournisseurs non officiels.',
      );
    }
  }, []);

  async function patchConsent(body: Record<string, boolean>) {
    setBusy(true);
    try {
      const response = await fetch('/api/privacy/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? 'Enregistrement impossible');
      }
      const data = (await response.json()) as { consents: ConsentState };
      setConsents(data.consents);
      toast.success('Consentement mis à jour');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Enregistrement impossible');
    } finally {
      setBusy(false);
    }
  }

  async function handleExport() {
    setBusy(true);
    try {
      const response = await fetch('/api/privacy/export');
      if (!response.ok) {
        throw new Error('Export impossible');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `sharpit-export-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success('Export téléchargé');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Export impossible');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    const ok = await confirm({
      title: 'Supprimer mon compte ?',
      description: `Le compte sera désactivé immédiatement, puis purgé définitivement sous ${PRIVACY_PURGE_DELAY_DAYS} jours.`,
      confirmLabel: 'Supprimer',
      cancelLabel: 'Annuler',
      variant: 'destructive',
    });
    if (!ok) {
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/privacy/delete', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Suppression impossible');
      }
      toast.success('Compte désactivé');
      setPendingSignOut(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Suppression impossible');
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {dialog}
      <section className="analysis-panel rounded-analysis-lg space-y-3 px-4 py-4">
        <p className="text-label">Documents</p>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link className="underline underline-offset-2" href="/privacy">
            Politique de confidentialité
          </Link>
          <Link className="underline underline-offset-2" href="/terms">
            Conditions d&apos;utilisation
          </Link>
        </div>
        <p className="text-muted-foreground text-xs">
          Version acceptée : {consents?.privacyVersion ?? '—'} · actuelle :{' '}
          {consents?.currentPrivacyVersion ?? CURRENT_PRIVACY_VERSION}
        </p>
        <p className="text-muted-foreground text-xs">Contact : {CONTROLLER_EMAIL}</p>
      </section>

      <section className="analysis-panel rounded-analysis-lg space-y-4 px-4 py-4">
        <div>
          <p className="text-label">Données de santé (requis)</p>
          <h2 className="mt-1 text-base font-semibold">Sync et traitements physiologiques</h2>
        </div>
        <label className="flex items-start gap-3 text-sm">
          <Checkbox
            checked={Boolean(consents?.healthDataConsentAt)}
            className="mt-0.5"
            disabled={busy}
            onCheckedChange={(value) => void patchConsent({ healthDataConsent: value === true })}
          />
          <span>
            Synchronisation et traitement des données de santé / physiologiques (art. 9). Sans ce
            consentement, l&apos;accès à Today est bloqué.
          </span>
        </label>
        <blockquote className="border-border text-muted-foreground border-l-2 pl-3 text-xs leading-relaxed">
          {HEALTH_DISCLAIMER}
        </blockquote>
      </section>

      <section className="analysis-panel rounded-analysis-lg space-y-4 px-4 py-4">
        <div>
          <p className="text-label">Consentements</p>
          <h2 className="mt-1 text-base font-semibold">Traitements optionnels</h2>
        </div>
        <label className="flex items-start gap-3 text-sm">
          <Checkbox
            checked={Boolean(consents?.aiProcessingConsentAt)}
            className="mt-0.5"
            disabled={busy}
            onCheckedChange={(value) =>
              void patchConsent({ aiProcessingConsent: value === true })
            }
          />
          <span>
            Traitement par IA (coach, bilans rédigés). Sans ce consentement, les moteurs
            déterministes restent disponibles.
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <Checkbox
            checked={Boolean(consents?.unofficialProvidersAckAt)}
            className="mt-0.5"
            disabled={busy}
            onCheckedChange={(value) =>
              void patchConsent({ unofficialProvidersAck: value === true })
            }
          />
          <span>
            J&apos;ai pris connaissance que certaines intégrations sont non officielles / « en
            l&apos;état ».
          </span>
        </label>
      </section>

      <section className="analysis-panel rounded-analysis-lg space-y-3 px-4 py-4">
        <p className="text-label">Tes données</p>
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy} type="button" variant="outline" onClick={() => void handleExport()}>
            Exporter JSON
          </Button>
          <Button
            disabled={busy}
            type="button"
            variant="destructive"
            onClick={() => void handleDelete()}
          >
            Supprimer mon compte
          </Button>
          {pendingSignOut ? (
            <SignOutButton redirectUrl="/sign-in">
              <Button type="button" variant="outline">
                Se déconnecter
              </Button>
            </SignOutButton>
          ) : null}
        </div>
      </section>
    </div>
  );
}
