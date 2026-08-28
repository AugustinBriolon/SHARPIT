'use client';

import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardCheck,
  ListChecks,
  LoaderCircle,
  X,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getApprovalStatusBadgeClass,
  getApprovalStatusIconClass,
  getApprovalStatusLabel,
} from '@/components/agents/approval-card/approval-card-status';
import { approvalCardCopy } from '@/components/agents/approval-card/copy';
import { AgentDisclosure } from '@/components/agents/agent-disclosure';
import { ActionSwapRollText } from '@/components/motion/action-swap-roll';
import { Button } from '@/components/motion/button';
import { Checkbox } from '@/components/motion/checkbox';
import { Input } from '@/components/motion/input';
import { RadioGroup, RadioGroupItem } from '@/components/motion/radio';
import { EASE_OUT, SPRING_SWAP } from '@/lib/ease';
import { cn } from '@/lib/utils';
import type {
  ApprovalCardAnswer,
  ApprovalCardAnswers,
  ApprovalCardProps,
  ApprovalCardQuestion,
} from './types';

export type {
  ApprovalCardAnswer,
  ApprovalCardAnswers,
  ApprovalCardOption,
  ApprovalCardProps,
  ApprovalCardQuestion,
  ApprovalCardStatus,
} from './types';

const EMPTY_ANSWER: ApprovalCardAnswer = { selected: [], custom: '' };
const ICON_BUTTON_CLASS = 'min-h-11 min-w-11 rounded-full';
const OPTION_ROW_CLASS = 'min-h-11 rounded-lg px-1.5 py-1';

function StatusIcon({
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

function NextStepButtonContent({
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

function isAnswered(answer: ApprovalCardAnswer) {
  return answer.selected.length > 0 || Boolean(answer.custom?.trim());
}

function QuestionOptions({
  question,
  answer,
  disabled,
  customPlaceholder,
  onChange,
  onSingleSelect,
}: {
  question: ApprovalCardQuestion;
  answer: ApprovalCardAnswer;
  disabled: boolean;
  customPlaceholder: string;
  onChange: (answer: ApprovalCardAnswer) => void;
  onSingleSelect?: () => void;
}) {
  const custom = answer.custom ?? '';
  const hasOptions = Boolean(question.options?.length);

  return (
    <div className="mt-3">
      {hasOptions && question.multiple ? (
        <div className="grid gap-0.5">
          {question.options!.map((option) => (
            <Checkbox
              key={option.value}
              checked={answer.selected.includes(option.value)}
              className={OPTION_ROW_CLASS}
              disabled={disabled || option.disabled}
              label={option.label}
              onCheckedChange={(checked) =>
                onChange({
                  ...answer,
                  selected: checked
                    ? [...answer.selected, option.value]
                    : answer.selected.filter((value) => value !== option.value),
                })
              }
            />
          ))}
        </div>
      ) : null}
      {hasOptions && !question.multiple ? (
        <RadioGroup
          className="gap-0.5"
          value={answer.selected[0] ?? ''}
          onValueChange={(value) => {
            onChange({ selected: [value], custom: '' });
            onSingleSelect?.();
          }}
        >
          {question.options!.map((option) => (
            <RadioGroupItem
              key={option.value}
              className={OPTION_ROW_CLASS}
              disabled={disabled || option.disabled}
              label={option.label}
              value={option.value}
            />
          ))}
        </RadioGroup>
      ) : null}

      {question.allowCustom ? (
        <Input
          className={cn('p-0.5', question.options?.length && 'mt-1.5')}
          disabled={disabled}
          placeholder={question.customPlaceholder ?? customPlaceholder}
          value={custom}
          classNames={{
            field: 'h-11 rounded-xl border-0 bg-background/70 focus-within:bg-background',
            input: 'px-3 text-sm',
          }}
          onChange={(value) =>
            onChange({
              selected: question.multiple ? answer.selected : [],
              custom: value,
            })
          }
        />
      ) : null}
    </div>
  );
}

function ProgressDots({
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

export function ApprovalCard({
  title = approvalCardCopy.title,
  description,
  children,
  questions = [],
  status = 'pending',
  answers,
  defaultAnswers = {},
  onAnswersChange,
  step,
  defaultStep = 0,
  onStepChange,
  onSubmit,
  onApprove,
  onReject,
  onRequestChanges,
  onDismiss,
  approveLabel = approvalCardCopy.approve,
  rejectLabel = approvalCardCopy.reject,
  requestChangesLabel = approvalCardCopy.requestChanges,
  submitLabel = approvalCardCopy.submit,
  dismissAriaLabel = approvalCardCopy.dismiss,
  approveTone = 'default',
  consequence,
  disabled = false,
  result,
  className,
}: ApprovalCardProps) {
  const reduce = useReducedMotion() ?? false;
  const cardRef = useRef<HTMLDivElement>(null);
  const [internalAnswers, setInternalAnswers] = useState<ApprovalCardAnswers>(defaultAnswers);
  const [internalStep, setInternalStep] = useState(defaultStep);
  const [liveMessage, setLiveMessage] = useState('');
  const autoAdvanceTimer = useRef<number | undefined>(undefined);
  const currentAnswers = answers ?? internalAnswers;
  const currentStep = Math.min(
    Math.max(0, step ?? internalStep),
    Math.max(0, questions.length - 1),
  );
  const question = questions[currentStep];
  const questionMode = questions.length > 0;
  const pending = status === 'pending';
  const busy = status === 'submitting';
  const interactive = (pending || busy) && !disabled;
  const archived = !interactive;
  const currentAnswer = question ? (currentAnswers[question.id] ?? EMPTY_ANSWER) : EMPTY_ANSWER;
  const displayTitle = question?.title ?? title;
  const titleKey = question?.id ?? String(status);
  const statusLabel = getApprovalStatusLabel(status);
  const questionProgressLabel = approvalCardCopy.questionProgress(
    currentStep + 1,
    questions.length,
  );
  const questionStatusLabel = isAnswered(currentAnswer)
    ? approvalCardCopy.status.pending
    : approvalCardCopy.status.inputRequired;
  const controlsDisabled = busy || disabled;

  const clearAutoAdvance = useCallback(() => {
    if (autoAdvanceTimer.current === undefined) {
      return;
    }
    window.clearTimeout(autoAdvanceTimer.current);
    autoAdvanceTimer.current = undefined;
  }, []);

  useEffect(() => clearAutoAdvance, [clearAutoAdvance]);

  useEffect(() => {
    if (questionMode && interactive) {
      setLiveMessage(approvalCardCopy.stepAnnouncement(currentStep + 1, questions.length));
      return;
    }
    if (archived) {
      setLiveMessage(approvalCardCopy.statusAnnouncement(statusLabel));
    }
  }, [archived, currentStep, interactive, questionMode, questions.length, statusLabel]);

  useEffect(() => {
    if (!interactive || questionMode) {
      return;
    }
    cardRef.current?.focus();
  }, [interactive, questionMode]);

  useEffect(() => {
    if (!interactive || questionMode) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && onApprove) {
        event.preventDefault();
        onApprove();
        return;
      }
      if (event.key === 'Escape' && onReject) {
        event.preventDefault();
        onReject();
      }
    };

    const node = cardRef.current;
    node?.addEventListener('keydown', handleKeyDown);
    return () => node?.removeEventListener('keydown', handleKeyDown);
  }, [interactive, onApprove, onReject, questionMode]);

  const setAnswers = useCallback(
    (next: ApprovalCardAnswers) => {
      if (answers === undefined) {
        setInternalAnswers(next);
      }
      onAnswersChange?.(next);
    },
    [answers, onAnswersChange],
  );

  const setStep = (next: number) => {
    clearAutoAdvance();
    if (step === undefined) {
      setInternalStep(next);
    }
    onStepChange?.(next);
  };

  const updateCurrentAnswer = (next: ApprovalCardAnswer) => {
    if (!question) {
      return;
    }
    setAnswers({ ...currentAnswers, [question.id]: next });
  };

  const continueQuestion = () => {
    if (currentStep < questions.length - 1) {
      setStep(currentStep + 1);
      return;
    }
    onSubmit?.(currentAnswers);
  };

  const queueAutoAdvance = () => {
    if (
      !question ||
      question.multiple ||
      question.autoAdvance !== true ||
      currentStep >= questions.length - 1 ||
      busy
    ) {
      return;
    }

    clearAutoAdvance();
    autoAdvanceTimer.current = window.setTimeout(() => {
      setStep(currentStep + 1);
    }, 240);
  };

  return (
    <div
      ref={cardRef}
      aria-busy={busy}
      aria-keyshortcuts={interactive && !questionMode ? 'Enter Escape' : undefined}
      data-state={status}
      tabIndex={interactive && !questionMode ? 0 : undefined}
      className={cn(
        'analysis-panel rounded-analysis focus-visible:ring-ring w-full overflow-hidden p-4 text-sm outline-none focus-visible:ring-2',
        archived && 'opacity-95',
        className,
      )}
    >
      <p aria-live="polite" className="sr-only">
        {liveMessage}
      </p>

      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={cn(
            'text-muted-foreground grid size-5 shrink-0 place-items-center',
            getApprovalStatusIconClass(status),
          )}
        >
          <StatusIcon
            busy={busy}
            interactive={interactive}
            questionMode={questionMode}
            reduceMotion={reduce}
            status={status}
          />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start gap-3">
            <h3 className="text-card-title text-foreground min-w-0 flex-1">
              <ActionSwapRollText value={titleKey}>{displayTitle}</ActionSwapRollText>
            </h3>
            {questionMode && interactive ? (
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={cn(
                    'text-label rounded-full border px-2 py-0.5',
                    isAnswered(currentAnswer)
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
                  {currentStep + 1}/{questions.length}
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

          {!questionMode && description ? (
            <p
              className={cn(
                'text-muted-foreground mt-1 leading-5',
                archived && 'text-muted-foreground/90',
              )}
            >
              {description}
            </p>
          ) : null}

          {!questionMode && children ? (
            <div className={cn('mt-3', archived && 'opacity-90')}>{children}</div>
          ) : null}

          <AgentDisclosure open={interactive && questionMode}>
            {questionMode && question ? (
              <AnimatePresence initial={false} mode="wait">
                <motion.div
                  key={question.id}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, x: -6 }}
                  initial={reduce ? { opacity: 1 } : { opacity: 0, x: 8 }}
                  transition={{ duration: reduce ? 0 : 0.2, ease: EASE_OUT }}
                >
                  {question.description ? (
                    <p className="text-muted-foreground mt-1 leading-5">{question.description}</p>
                  ) : null}
                  <QuestionOptions
                    answer={currentAnswer}
                    customPlaceholder={approvalCardCopy.customPlaceholder}
                    disabled={controlsDisabled}
                    question={question}
                    onChange={updateCurrentAnswer}
                    onSingleSelect={queueAutoAdvance}
                  />
                </motion.div>
              </AnimatePresence>
            ) : null}

            {questionMode ? (
              <div className="mt-4 flex items-center gap-3">
                <Button
                  aria-label={approvalCardCopy.previousQuestion}
                  className={ICON_BUTTON_CLASS}
                  disabled={controlsDisabled || currentStep === 0}
                  size="icon"
                  variant="ghost"
                  onClick={() => setStep(currentStep - 1)}
                >
                  <ArrowLeft className="size-4" />
                </Button>
                <ProgressDots
                  current={currentStep}
                  ids={questions.map((item) => item.id)}
                  reduceMotion={reduce}
                />
                <span className="sr-only">{questionProgressLabel}</span>
                <Button
                  disabled={controlsDisabled || !isAnswered(currentAnswer)}
                  size={currentStep === questions.length - 1 ? 'md' : 'icon'}
                  aria-label={
                    currentStep === questions.length - 1
                      ? approvalCardCopy.submitResponse
                      : approvalCardCopy.nextQuestion
                  }
                  className={cn(
                    'ml-auto',
                    currentStep === questions.length - 1 ? 'min-h-11' : ICON_BUTTON_CLASS,
                  )}
                  onClick={continueQuestion}
                >
                  <NextStepButtonContent
                    busy={busy}
                    isLastStep={currentStep === questions.length - 1}
                    reduceMotion={reduce}
                    submitLabel={submitLabel}
                  />
                </Button>
              </div>
            ) : null}
          </AgentDisclosure>

          {interactive && !questionMode ? (
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
                    approveTone === 'destructive' &&
                      'bg-signal-risk hover:bg-signal-risk/90 text-white',
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
          ) : null}

          {archived ? (
            <p className="text-muted-foreground mt-2 text-sm" role="status">
              {result ?? statusLabel}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
