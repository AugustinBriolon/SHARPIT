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

function ApprovalCardHeaderStatusArea({
  answered,
  currentStep,
  hidePendingBadge,
  interactive,
  questionMode,
  questionProgressLabel,
  questionStatusLabel,
  questionsLength,
  status,
}: {
  answered: boolean;
  currentStep: number;
  hidePendingBadge: boolean;
  interactive: boolean;
  questionMode: boolean;
  questionProgressLabel: string;
  questionStatusLabel: string;
  questionsLength: number;
  status: ApprovalCardStatus;
}) {
  if (questionMode && interactive) {
    return (
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
    );
  }
  if (hidePendingBadge) {
    return null;
  }
  return (
    <span
      role="status"
      className={cn(
        'text-label shrink-0 rounded-full border px-2 py-0.5 transition-colors',
        getApprovalStatusBadgeClass(status),
      )}
    >
      {getApprovalStatusLabel(status)}
    </span>
  );
}

function ApprovalCardDismissButton({
  controlsDisabled,
  dismissAriaLabel,
  onDismiss,
}: {
  controlsDisabled: boolean;
  dismissAriaLabel: string;
  onDismiss?: () => void;
}) {
  if (!onDismiss) {
    return null;
  }
  return (
    <button
      aria-label={dismissAriaLabel}
      className="text-muted-foreground hover:text-foreground focus-visible:ring-ring grid min-h-11 min-w-11 shrink-0 place-items-center rounded-full transition-colors outline-none focus-visible:ring-2"
      disabled={controlsDisabled}
      type="button"
      onClick={onDismiss}
    >
      <X className="size-4" />
    </button>
  );
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
  archived: _archived,
  chrome = 'instrument',
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
  reduce: _reduce,
  status,
  titleKey,
}: {
  archived: boolean;
  chrome?: ApprovalCardProps['chrome'];
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
  const answered = isAnswered(currentAnswer);
  const isInstrument = chrome === 'instrument';
  const hidePendingBadge = isInstrument && status === 'pending' && !questionMode;

  return (
    <div className="flex min-w-0 items-start gap-3">
      <h3
        className={cn(
          'text-foreground min-w-0 flex-1 text-pretty',
          isInstrument ? 'text-sm leading-snug font-medium' : 'text-card-title',
        )}
      >
        <ActionSwapRollText value={titleKey}>{displayTitle}</ActionSwapRollText>
      </h3>
      <ApprovalCardHeaderStatusArea
        answered={answered}
        currentStep={currentStep}
        hidePendingBadge={hidePendingBadge}
        interactive={interactive}
        questionMode={questionMode}
        questionProgressLabel={questionProgressLabel}
        questionsLength={questionsLength}
        questionStatusLabel={questionStatusLabel}
        status={status}
      />
      <ApprovalCardDismissButton
        controlsDisabled={controlsDisabled}
        dismissAriaLabel={dismissAriaLabel}
        onDismiss={onDismiss}
      />
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

function getApprovalDecisionButtonSize(chrome?: ApprovalCardProps['chrome']) {
  return chrome === 'instrument' ? 'sm' : 'md';
}

function getApprovalApproveVariant(
  chrome?: ApprovalCardProps['chrome'],
  approveTone?: ApprovalCardProps['approveTone'],
) {
  if (chrome === 'instrument') {
    return approveTone === 'destructive' ? 'ghost' : 'outline';
  }
  return 'primary';
}

function getApprovalApproveClassName(
  chrome?: ApprovalCardProps['chrome'],
  approveTone?: ApprovalCardProps['approveTone'],
) {
  const isInstrument = chrome === 'instrument';
  const isDestructive = approveTone === 'destructive';
  return cn(
    !isInstrument && 'min-h-11 rounded-full',
    !isInstrument && isDestructive && 'bg-signal-risk hover:bg-signal-risk/90 text-white',
    isInstrument && isDestructive && 'text-signal-risk hover:text-signal-risk',
  );
}

function getApprovalSecondaryButtonClassName(chrome?: ApprovalCardProps['chrome']) {
  return cn(chrome !== 'instrument' && 'min-h-11 rounded-full');
}

function getApprovalRejectButtonClassName(chrome?: ApprovalCardProps['chrome']) {
  return cn(
    'text-muted-foreground',
    chrome !== 'instrument' && 'hover:text-signal-risk min-h-11 rounded-full',
  );
}

function ApprovalCardApproveButton({
  approveLabel,
  approveTone,
  chrome,
  controlsDisabled,
  onApprove,
}: {
  approveLabel: ApprovalCardProps['approveLabel'];
  approveTone: ApprovalCardProps['approveTone'];
  chrome?: ApprovalCardProps['chrome'];
  controlsDisabled: boolean;
  onApprove?: () => void;
}) {
  return (
    <Button
      className={getApprovalApproveClassName(chrome, approveTone)}
      disabled={controlsDisabled}
      size={getApprovalDecisionButtonSize(chrome)}
      variant={getApprovalApproveVariant(chrome, approveTone)}
      onClick={onApprove}
    >
      {approveLabel}
    </Button>
  );
}

function ApprovalCardRequestChangesButton({
  chrome,
  controlsDisabled,
  onRequestChanges,
  requestChangesLabel,
}: {
  chrome?: ApprovalCardProps['chrome'];
  controlsDisabled: boolean;
  onRequestChanges: () => void;
  requestChangesLabel: ApprovalCardProps['requestChangesLabel'];
}) {
  return (
    <Button
      className={getApprovalSecondaryButtonClassName(chrome)}
      disabled={controlsDisabled}
      size={getApprovalDecisionButtonSize(chrome)}
      variant="secondary"
      onClick={onRequestChanges}
    >
      {requestChangesLabel}
    </Button>
  );
}

function ApprovalCardRejectButton({
  chrome,
  controlsDisabled,
  onReject,
  rejectLabel,
}: {
  chrome?: ApprovalCardProps['chrome'];
  controlsDisabled: boolean;
  onReject: () => void;
  rejectLabel: ApprovalCardProps['rejectLabel'];
}) {
  return (
    <Button
      className={getApprovalRejectButtonClassName(chrome)}
      disabled={controlsDisabled}
      size={getApprovalDecisionButtonSize(chrome)}
      variant="ghost"
      onClick={onReject}
    >
      {rejectLabel}
    </Button>
  );
}

export function ApprovalCardDecisionActions({
  approveLabel,
  approveTone,
  chrome = 'instrument',
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
  chrome?: ApprovalCardProps['chrome'];
  consequence?: ApprovalCardProps['consequence'];
  controlsDisabled: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  onRequestChanges?: () => void;
  rejectLabel: ApprovalCardProps['rejectLabel'];
  requestChangesLabel: ApprovalCardProps['requestChangesLabel'];
}) {
  const isInstrument = chrome === 'instrument';

  return (
    <>
      {consequence ? (
        <p className="text-signal-risk mt-2 text-xs leading-relaxed">{consequence}</p>
      ) : null}
      <div className={cn('flex flex-wrap items-center gap-2', isInstrument ? 'mt-2' : 'mt-4')}>
        <ApprovalCardApproveButton
          approveLabel={approveLabel}
          approveTone={approveTone}
          chrome={chrome}
          controlsDisabled={controlsDisabled}
          onApprove={onApprove}
        />
        {onRequestChanges ? (
          <ApprovalCardRequestChangesButton
            chrome={chrome}
            controlsDisabled={controlsDisabled}
            requestChangesLabel={requestChangesLabel}
            onRequestChanges={onRequestChanges}
          />
        ) : null}
        {onReject ? (
          <ApprovalCardRejectButton
            chrome={chrome}
            controlsDisabled={controlsDisabled}
            rejectLabel={rejectLabel}
            onReject={onReject}
          />
        ) : null}
      </div>
      <p className="text-muted-foreground sr-only">{approvalCardCopy.keyboardHint}</p>
    </>
  );
}

export { getApprovalStatusIconClass };
