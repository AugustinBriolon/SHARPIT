'use client';

import { AnimatePresence, motion } from 'motion/react';
import { AgentDisclosure } from '@/components/agents/agent-disclosure';
import { QuestionOptions } from '@/components/agents/approval-card/approval-card-options';
import {
  ApprovalCardDecisionActions,
  ApprovalCardHeader,
  ApprovalCardQuestionNav,
} from '@/components/agents/approval-card/approval-card-parts';
import { approvalCardCopy } from '@/components/agents/approval-card/copy';
import { EASE_OUT } from '@/lib/ease';
import { cn } from '@/lib/utils';
import type { ApprovalCardAnswer, ApprovalCardProps } from './types';

function QuestionStepPanel({
  question,
  reduce,
  controlsDisabled,
  currentAnswer,
  onAnswerChange,
  onSingleSelect,
}: {
  question: NonNullable<ApprovalCardProps['questions']>[number];
  reduce: boolean;
  controlsDisabled: boolean;
  currentAnswer: ApprovalCardAnswer;
  onAnswerChange: (answer: ApprovalCardAnswer) => void;
  onSingleSelect: () => void;
}) {
  return (
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
          onChange={onAnswerChange}
          onSingleSelect={onSingleSelect}
        />
      </motion.div>
    </AnimatePresence>
  );
}

export function ApprovalCardQuestionFlow({
  busy,
  controlsDisabled,
  currentAnswer,
  currentStep,
  interactive,
  question,
  questionMode,
  questions,
  reduce,
  submitLabel,
  onContinue,
  onBack,
  onAnswerChange,
  onSingleSelect,
}: {
  busy: boolean;
  controlsDisabled: boolean;
  currentAnswer: ApprovalCardAnswer;
  currentStep: number;
  interactive: boolean;
  question: NonNullable<ApprovalCardProps['questions']>[number] | undefined;
  questionMode: boolean;
  questions: NonNullable<ApprovalCardProps['questions']>;
  reduce: boolean;
  submitLabel: ApprovalCardProps['submitLabel'];
  onContinue: () => void;
  onBack: () => void;
  onAnswerChange: (answer: ApprovalCardAnswer) => void;
  onSingleSelect: () => void;
}) {
  return (
    <AgentDisclosure open={interactive && questionMode}>
      {questionMode && question ? (
        <QuestionStepPanel
          controlsDisabled={controlsDisabled}
          currentAnswer={currentAnswer}
          question={question}
          reduce={reduce}
          onAnswerChange={onAnswerChange}
          onSingleSelect={onSingleSelect}
        />
      ) : null}

      {questionMode ? (
        <ApprovalCardQuestionNav
          busy={busy}
          controlsDisabled={controlsDisabled}
          currentAnswer={currentAnswer}
          currentStep={currentStep}
          questions={questions}
          reduce={reduce}
          submitLabel={submitLabel}
          onBack={onBack}
          onContinue={onContinue}
        />
      ) : null}
    </AgentDisclosure>
  );
}

export function ApprovalCardStaticContent({
  archived,
  children,
  description,
  questionMode,
}: {
  archived: boolean;
  children?: ApprovalCardProps['children'];
  description?: ApprovalCardProps['description'];
  questionMode: boolean;
}) {
  return (
    <>
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
    </>
  );
}

export function ApprovalCardFooter({
  archived,
  interactive,
  questionMode,
  result,
  statusLabel,
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
  archived: boolean;
  interactive: boolean;
  questionMode: boolean;
  result?: ApprovalCardProps['result'];
  statusLabel: string;
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
      {interactive && !questionMode ? (
        <ApprovalCardDecisionActions
          approveLabel={approveLabel}
          approveTone={approveTone}
          consequence={consequence}
          controlsDisabled={controlsDisabled}
          rejectLabel={rejectLabel}
          requestChangesLabel={requestChangesLabel}
          onApprove={onApprove}
          onReject={onReject}
          onRequestChanges={onRequestChanges}
        />
      ) : null}
      {archived ? (
        <p className="text-muted-foreground mt-2 text-sm" role="status">
          {result ?? statusLabel}
        </p>
      ) : null}
    </>
  );
}
