import { Download } from 'lucide-react';
import { ProfileFormSection } from '@/components/settings/profile/profile-form-section';
import { NUMERIC_INPUT_CLASS } from '@/components/settings/profile/profile-input-format';
import { ThresholdHistoryPanel } from '@/components/settings/profile/threshold-history-panel';
import { Vo2maxIndicators } from '@/components/settings/profile/vo2max-indicators';
import { ThresholdSuggestionCard } from '@/components/threshold/threshold-suggestion-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { guardedActionLabel } from '@/hooks/use-offline-guard';
import type { ThresholdField } from '@/lib/threshold/threshold-estimates';
import type { ThresholdApplyPreview } from '@/lib/threshold/threshold-estimates';

type CalibrationSummaryProps = {
  ftpW: string;
  maxHr: string;
  lthr: string;
  thresholdPace: string;
};

function CalibrationSummaryGrid({ ftpW, maxHr, lthr, thresholdPace }: CalibrationSummaryProps) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <div className="bg-muted/30 rounded-analysis border-analysis-border/60 border px-3 py-2">
        <p className="text-label">FTP vélo</p>
        <p className="text-data mt-0.5 text-base font-semibold tabular-nums">
          {ftpW || '—'}
          {ftpW ? ' W' : ''}
        </p>
      </div>
      <div className="bg-muted/30 rounded-analysis border-analysis-border/60 border px-3 py-2">
        <p className="text-label">FC max</p>
        <p className="text-data mt-0.5 text-base font-semibold tabular-nums">
          {maxHr || '—'}
          {maxHr ? ' bpm' : ''}
        </p>
      </div>
      <div className="bg-muted/30 rounded-analysis border-analysis-border/60 border px-3 py-2">
        <p className="text-label">LTHR</p>
        <p className="text-data mt-0.5 text-base font-semibold tabular-nums">
          {lthr || '—'}
          {lthr ? ' bpm' : ''}
        </p>
      </div>
      <div className="bg-muted/30 rounded-analysis border-analysis-border/60 border px-3 py-2">
        <p className="text-label">Allure seuil</p>
        <p className="text-data mt-0.5 text-base font-semibold tabular-nums">
          {thresholdPace || '—'}
        </p>
      </div>
    </div>
  );
}

type CalibrationFieldsProps = CalibrationSummaryProps & {
  swimCss: string;
  poolLength: string;
  onFtpW: (value: string) => void;
  onMaxHr: (value: string) => void;
  onLthr: (value: string) => void;
  onThresholdPace: (value: string) => void;
  onSwimCss: (value: string) => void;
  onPoolLength: (value: string) => void;
};

function CalibrationFormFields({
  ftpW,
  maxHr,
  lthr,
  thresholdPace,
  swimCss,
  poolLength,
  onFtpW,
  onMaxHr,
  onLthr,
  onThresholdPace,
  onSwimCss,
  onPoolLength,
}: CalibrationFieldsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="ftpW">FTP vélo (W)</Label>
        <Input
          className={NUMERIC_INPUT_CLASS}
          id="ftpW"
          min={1}
          placeholder="280"
          type="number"
          value={ftpW}
          onChange={(e) => onFtpW(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="maxHr">FC max (bpm)</Label>
        <Input
          className={NUMERIC_INPUT_CLASS}
          id="maxHr"
          min={1}
          placeholder="190"
          type="number"
          value={maxHr}
          onChange={(e) => onMaxHr(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="lthr">LTHR (bpm)</Label>
        <Input
          className={NUMERIC_INPUT_CLASS}
          id="lthr"
          min={1}
          placeholder="168"
          type="number"
          value={lthr}
          onChange={(e) => onLthr(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="thresholdPace">Allure seuil (min:sec/km)</Label>
        <Input
          className={NUMERIC_INPUT_CLASS}
          id="thresholdPace"
          placeholder="4:15"
          value={thresholdPace}
          onChange={(e) => onThresholdPace(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="swimCss">Vitesse critique natation (min:sec/100m)</Label>
        <Input
          className={NUMERIC_INPUT_CLASS}
          id="swimCss"
          placeholder="1:38"
          value={swimCss}
          onChange={(e) => onSwimCss(e.target.value)}
        />
        <p className="text-muted-foreground/80 text-xs">
          Estimée depuis tes séances piscine. « Appliquer » la met à jour.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="defaultPoolLengthM">Longueur de bassin (m)</Label>
        <Input
          className={NUMERIC_INPUT_CLASS}
          id="defaultPoolLengthM"
          max={100}
          min={10}
          placeholder="25"
          type="number"
          value={poolLength}
          onChange={(e) => onPoolLength(e.target.value)}
        />
        <p className="text-muted-foreground/80 text-xs">
          Requis par Garmin pour envoyer une séance de natation. 25 m par défaut.
        </p>
      </div>
    </div>
  );
}

export type CalibrationEditorProps = {
  ftpW: string;
  maxHr: string;
  lthr: string;
  thresholdPace: string;
  swimCss: string;
  poolLength: string;
  vo2maxRunning: number | null;
  vo2maxCycling: number | null;
  preview: ThresholdApplyPreview | undefined;
  history: { id: string }[];
  offline: boolean;
  offlineLabel: string;
  guardDisabled: boolean;
  applyPending: boolean;
  onFtpW: (value: string) => void;
  onMaxHr: (value: string) => void;
  onLthr: (value: string) => void;
  onThresholdPace: (value: string) => void;
  onSwimCss: (value: string) => void;
  onPoolLength: (value: string) => void;
  onApplyEstimates: (fields: ThresholdField[]) => void;
  importing: boolean;
  syncedLabel: string | null;
  onGarminImport: () => void;
  hasThresholds: boolean;
  message: string | null;
  error: string | null;
  saving: boolean;
  dirty: boolean;
  canSave: boolean;
  onSubmit: (e: React.FormEvent) => void;
};

function CalibrationFeedback({ message, error }: { message: string | null; error: string | null }) {
  return (
    <>
      {message ? (
        <p aria-live="polite" className="text-primary text-sm">
          {message}
        </p>
      ) : null}
      {error ? (
        <p aria-live="assertive" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </>
  );
}

function CalibrationThresholdSection({
  preview,
  history,
  vo2maxRunning,
  vo2maxCycling,
  offline,
  offlineLabel,
  guardDisabled,
  applyPending,
  onApplyEstimates,
  children,
}: Pick<
  CalibrationEditorProps,
  | 'preview'
  | 'history'
  | 'vo2maxRunning'
  | 'vo2maxCycling'
  | 'offline'
  | 'offlineLabel'
  | 'guardDisabled'
  | 'applyPending'
  | 'onApplyEstimates'
> & { children: React.ReactNode }) {
  return (
    <ProfileFormSection
      description="Modification manuelle, estimations et historique."
      title="Ajuster les seuils"
      compact
    >
      {preview?.hasChanges ? (
        <ThresholdSuggestionCard
          applyLabel={offline ? offlineLabel : 'Appliquer'}
          disabled={guardDisabled}
          pending={applyPending}
          preview={preview}
          compact
          onApply={onApplyEstimates}
        />
      ) : null}
      {history.length > 0 ? <ThresholdHistoryPanel history={history} /> : null}
      <Vo2maxIndicators vo2maxCycling={vo2maxCycling} vo2maxRunning={vo2maxRunning} />
      {children}
    </ProfileFormSection>
  );
}

export function CalibrationEditor({
  ftpW,
  maxHr,
  lthr,
  thresholdPace,
  swimCss,
  poolLength,
  vo2maxRunning,
  vo2maxCycling,
  preview,
  history,
  offline,
  offlineLabel,
  guardDisabled,
  applyPending,
  onFtpW,
  onMaxHr,
  onLthr,
  onThresholdPace,
  onSwimCss,
  onPoolLength,
  onApplyEstimates,
  importing,
  syncedLabel,
  onGarminImport,
  hasThresholds,
  message,
  error,
  saving,
  dirty,
  canSave,
  onSubmit,
}: CalibrationEditorProps) {
  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground max-w-xl text-xs leading-relaxed">
          Ajuste ici les repères qui servent à interpréter l’intensité, estimer la charge et
          comparer tes progrès dans le temps.
        </p>
        <div className="flex flex-col items-end gap-0.5">
          <Button
            disabled={guardDisabled || importing}
            type="button"
            variant="outline"
            onClick={onGarminImport}
          >
            <Download className="size-3.5" aria-hidden />
            {guardedActionLabel(offline, offlineLabel, 'Garmin', {
              active: importing,
              label: 'Import…',
            })}
          </Button>
          {syncedLabel ? (
            <span className="text-muted-foreground text-label">
              Sync · <span className="text-data">{syncedLabel}</span>
            </span>
          ) : null}
        </div>
      </div>

      <ProfileFormSection
        description="Lecture rapide avant modification."
        title="Repères actuels"
        compact
      >
        <CalibrationSummaryGrid
          ftpW={ftpW}
          lthr={lthr}
          maxHr={maxHr}
          thresholdPace={thresholdPace}
        />
      </ProfileFormSection>

      <CalibrationThresholdSection
        applyPending={applyPending}
        guardDisabled={guardDisabled}
        history={history}
        offline={offline}
        offlineLabel={offlineLabel}
        preview={preview}
        vo2maxCycling={vo2maxCycling}
        vo2maxRunning={vo2maxRunning}
        onApplyEstimates={onApplyEstimates}
      >
        <CalibrationFormFields
          ftpW={ftpW}
          lthr={lthr}
          maxHr={maxHr}
          poolLength={poolLength}
          swimCss={swimCss}
          thresholdPace={thresholdPace}
          onFtpW={onFtpW}
          onLthr={onLthr}
          onMaxHr={onMaxHr}
          onPoolLength={onPoolLength}
          onSwimCss={onSwimCss}
          onThresholdPace={onThresholdPace}
        />
      </CalibrationThresholdSection>

      {!hasThresholds ? (
        <p className="text-muted-foreground text-xs">
          Aucun seuil manuel renseigné pour le moment. Tu peux commencer par Garmin ou par les
          estimations issues de tes records.
        </p>
      ) : null}
      <CalibrationFeedback error={error} message={message} />
      <Button disabled={guardDisabled || saving || !dirty || !canSave} type="submit">
        {guardedActionLabel(offline, offlineLabel, 'Enregistrer', {
          active: saving,
          label: 'Enregistrement…',
        })}
      </Button>
    </form>
  );
}
