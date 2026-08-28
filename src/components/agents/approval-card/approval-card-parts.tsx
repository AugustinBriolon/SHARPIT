import type { ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardCheck,
  ListChecks,
  LoaderCircle,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { ActionSwapRollText } from '@/components/motion/action-swap-roll';
import { Button } from '@/components/motion/button';
import { SPRING_SWAP } from '@/lib/ease';
import { cn } from '@/lib/utils';
import {
  getApprovalStatusBadgeClass,
  getApprovalStatusIconClass,
  getApprovalStatusLabel,
} from './approval-card-status';
import { approvalCardCopy } from './copy';
import type { ApprovalCardProps, ApprovalCardStatus } from './types';

export const ICON_BUTTON_CLASS = 'min-h-11 min-w-11 rounded-full';

export function isAnswered(answer: { selected: string[]; custom?: string }) {
  return answer.selected.length > 0 || Boolean(answer.custom?.trim());
}

export function StatusIcon({
  busy,
  interactive,
  questionMode,
  reduceMotion,
  status,
}: {
  busy: boolean;
  interactive: boolean;
  questionMode: boolean;
  reduceMotion: boolean;
  status: ApprovalCardProps['status'];
}) {
  if (busy) {
    return <LoaderCircle className={cn('size-4', !reduceMotion && 'animate-spin')} />;
  }
  if (interactive && questionMode) {
    return <ListChecks className="size-4" />;
  }
  if (interactive) {
    return <ClipboardCheck className="size-4" />;
  }
  if (status === 'rejected') {
    return <X className="size-4" />;
  }
  return <Check className="size-4" />;
}

export function NextStepButtonContent({
  busy,
  isLastStep,
  reduceMotion,
  submitLabel,
}: {
  busy: boolean;
  isLastStep: boolean;
  reduceMotion: boolean;
  submitLabel: ApprovalCardProps['submitLabel'];
}) {
  if (busy) {
    return <LoaderCircle className={cn('size-4', !reduceMotion && 'animate-spin')} />;
  }
  if (isLastStep) {
    return (
      <>
        {submitLabel}
        <ArrowRight className="size-3.5" />
      </>
    );
  }
  return <ArrowRight className="size-4" />;
}

export function ProgressDots({
  current,
  ids,
  reduceMotion,
}: {
  current: number;
  ids: string[];
  reduceMotion: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      aria-valuemax={ids.length}
      aria-valuenow={current + 1}
      className="flex gap-1.5"
      role="progressbar"
    >
      {ids.map((id, index) => (
        <motion.span
          key={id}
          className="bg-foreground size-1.5 rounded-full"
          transition={reduceMotion ? { duration: 0 } : SPRING_SWAP}
          animate={{
            scale: index === current ? 1 : 0.75,
            opacity: index <= current ? 1 : 0.35,
          }}
          initial={{
            scale: index === current ? 1 : 0.75,
            opacity: index <= current ? 1 : 0.35,
          }}
        />
      ))}
    </span>
  );
}

export function ApprovalCardHeader({
  archived,
  controlsDisabled,
  currentAnswer,
  currentStep,
  dismissAriaLabel,
  displayTitle,
  interactive,
  onDismiss,
  questionMode,
  questionProgressLabel,
  questionStatusLabel,
  questionsLength,
  reduce,
  status,
  titleKey,
}: {
  archived: boolean;
  controlsDisabled: boolean;
  currentAnswer: { selected: string[]; custom?: string };
  currentStep: number;
  dismissAriaLabel: string;
  displayTitle: ReactNode;
  interactive: boolean;
  onDismiss?: () => void;
  questionMode: boolean;
  questionProgressLabel: string;
  questionStatusLabel: string;
  questionsLength: number;
  reduce: boolean;
  status: ApprovalCardStatus;
  titleKey: string;
}) {
  const statusLabel = getApprovalStatusLabel(status);
  const answered = isAnswered(currentAnswer);

  return (
    <div className="flex min-w-0 items-start gap-3">
      <h3 className="text-card-title text-foreground min-w-0 flex-1">
        <ActionSwapRollText value={titleKey}>{displayTitle}</ActionSwapRollText>
      </h3>
      {questionMode && interactive ? (
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={cn(
              'text-label rounded-full border px-2 py-0.5',
              answered
                ? 'border-border text-muted-foreground'
                : 'text-signal-caution border-signal-caution/30',
            )}
          >
            {questionStatusLabel}
          </span>
          <span
            aria-label={questionProgressLabel}
            className="text-muted-foreground text-instrument text-xs"
          >
            {currentStep + 1}/{questionsLength}
          </span>
        </div>
      ) : (
        <span
          role="status"
          className={cn(
            'text-label shrink-0 rounded-full border px-2 py-0.5 transition-colors',
            getApprovalStatusBadgeClass(status),
          )}
        >
          {statusLabel}
        </span>
      )}
      {onDismiss ? (
        <button
          aria-label={dismissAriaLabel}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring grid min-h-11 min-w-11 shrink-0 place-items-center rounded-full transition-colors outline-none focus-visible:ring-2"
          disabled={controlsDisabled}
          type="button"
          onClick={onDismiss}
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

function QuestionContinueButton({
  busy,
  controlsDisabled,
  currentAnswer,
  isLastStep,
  reduce,
  submitLabel,
  onContinue,
}: {
  busy: boolean;
  controlsDisabled: boolean;
  currentAnswer: { selected: string[]; custom?: string };
  isLastStep: boolean;
  reduce: boolean;
  submitLabel: ApprovalCardProps['submitLabel'];
  onContinue: () => void;
}) {
  return (
    <Button
      aria-label={isLastStep ? approvalCardCopy.submitResponse : approvalCardCopy.nextQuestion}
      className={cn('ml-auto', isLastStep ? 'min-h-11' : ICON_BUTTON_CLASS)}
      disabled={controlsDisabled || !isAnswered(currentAnswer)}
      size={isLastStep ? 'md' : 'icon'}
      onClick={onContinue}
    >
      <NextStepButtonContent
        busy={busy}
        isLastStep={isLastStep}
        reduceMotion={reduce}
        submitLabel={submitLabel}
      />
    </Button>
  );
}

export function ApprovalCardQuestionNav({
  busy,
  controlsDisabled,
  currentAnswer,
  currentStep,
  questions,
  reduce,
  submitLabel,
  onBack,
  onContinue,
}: {
  busy: boolean;
  controlsDisabled: boolean;
  currentAnswer: { selected: string[]; custom?: string };
  currentStep: number;
  questions: ApprovalCardProps['questions'];
  reduce: boolean;
  submitLabel: ApprovalCardProps['submitLabel'];
  onBack: () => void;
  onContinue: () => void;
}) {
  const questionProgressLabel = approvalCardCopy.questionProgress(
    currentStep + 1,
    questions?.length ?? 0,
  );
  const isLastStep = currentStep === (questions?.length ?? 0) - 1;

  return (
    <div className="mt-4 flex items-center gap-3">
      <Button
        aria-label={approvalCardCopy.previousQuestion}
        className={ICON_BUTTON_CLASS}
        disabled={controlsDisabled || currentStep === 0}
        size="icon"
        variant="ghost"
        onClick={onBack}
      >
        <ArrowLeft className="size-4" />
      </Button>
      <ProgressDots
        current={currentStep}
        ids={(questions ?? []).map((item) => item.id)}
        reduceMotion={reduce}
      />
      <span className="sr-only">{questionProgressLabel}</span>
      <QuestionContinueButton
        busy={busy}
        controlsDisabled={controlsDisabled}
        currentAnswer={currentAnswer}
        isLastStep={isLastStep}
        reduce={reduce}
        submitLabel={submitLabel}
        onContinue={onContinue}
      />
    </div>
  );
}

export function ApprovalCardDecisionActions({
  approveLabel,
  approveTone,
  consequence,
  controlsDisabled,
  onApprove,
  onReject,
  onRequestChanges,
  rejectLabel,
  requestChangesLabel,
}: {
  approveLabel: ApprovalCardProps['approveLabel'];
  approveTone: ApprovalCardProps['approveTone'];
  consequence?: ApprovalCardProps['consequence'];
  controlsDisabled: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  onRequestChanges?: () => void;
  rejectLabel: ApprovalCardProps['rejectLabel'];
  requestChangesLabel: ApprovalCardProps['requestChangesLabel'];
}) {
  return (
    <>
      {consequence ? (
        <p className="text-signal-risk mt-3 text-xs leading-relaxed">{consequence}</p>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          disabled={controlsDisabled}
          size="md"
          className={cn(
            'min-h-11 rounded-full',
            approveTone === 'destructive' && 'bg-signal-risk hover:bg-signal-risk/90 text-white',
          )}
          onClick={onApprove}
        >
          {approveLabel}
        </Button>
        {onRequestChanges ? (
          <Button
            className="min-h-11 rounded-full"
            disabled={controlsDisabled}
            size="md"
            variant="secondary"
            onClick={onRequestChanges}
          >
            {requestChangesLabel}
          </Button>
        ) : null}
        {onReject ? (
          <Button
            className="text-muted-foreground hover:text-signal-risk min-h-11 rounded-full"
            disabled={controlsDisabled}
            size="md"
            variant="ghost"
            onClick={onReject}
          >
            {rejectLabel}
          </Button>
        ) : null}
      </div>
      <p className="text-muted-foreground sr-only">{approvalCardCopy.keyboardHint}</p>
    </>
  );
}

export { getApprovalStatusIconClass };
