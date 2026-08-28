'use client';

import {
  ApprovalCardFooter,
  ApprovalCardQuestionFlow,
  ApprovalCardStaticContent,
} from '@/components/agents/approval-card/approval-card-sections';
import {
  ApprovalCardHeader,
  StatusIcon,
  getApprovalStatusIconClass,
} from '@/components/agents/approval-card/approval-card-parts';
import { resolveApprovalCardContentProps } from '@/components/agents/approval-card/approval-card-props';
import type { ApprovalCardStatus } from './types';
import type { ApprovalCardProps } from './types';
import { cn } from '@/lib/utils';

export function ApprovalCardBody({
  props,
  reduce,
  state,
}: {
  props: ApprovalCardProps;
  reduce: boolean;
  state: ReturnType<typeof import('./use-approval-card').useApprovalCard>;
}) {
  const content = resolveApprovalCardContentProps(props);

  return (
    <div className="min-w-0 flex-1">
      <ApprovalCardHeader
        archived={state.archived}
        controlsDisabled={state.controlsDisabled}
        currentAnswer={state.currentAnswer}
        currentStep={state.currentStep}
        dismissAriaLabel={content.dismissAriaLabel}
        displayTitle={state.displayTitle}
        interactive={state.interactive}
        questionMode={state.questionMode}
        questionProgressLabel={state.questionProgressLabel}
        questionsLength={content.questions.length}
        questionStatusLabel={state.questionStatusLabel}
        reduce={reduce}
        status={content.status}
        titleKey={state.titleKey}
        onDismiss={content.onDismiss}
      />

      <ApprovalCardStaticContent
        archived={state.archived}
        description={content.description}
        questionMode={state.questionMode}
      >
        {content.children}
      </ApprovalCardStaticContent>

      <ApprovalCardQuestionFlow
        busy={state.busy}
        controlsDisabled={state.controlsDisabled}
        currentAnswer={state.currentAnswer}
        currentStep={state.currentStep}
        interactive={state.interactive}
        question={state.question}
        questionMode={state.questionMode}
        questions={content.questions}
        reduce={reduce}
        submitLabel={content.submitLabel}
        onAnswerChange={state.updateCurrentAnswer}
        onBack={() => state.setStep(state.currentStep - 1)}
        onContinue={state.continueQuestion}
        onSingleSelect={state.queueAutoAdvance}
      />

      <ApprovalCardFooter
        approveLabel={content.approveLabel}
        approveTone={content.approveTone}
        archived={state.archived}
        consequence={content.consequence}
        controlsDisabled={state.controlsDisabled}
        interactive={state.interactive}
        questionMode={state.questionMode}
        rejectLabel={content.rejectLabel}
        requestChangesLabel={content.requestChangesLabel}
        result={content.result}
        statusLabel={state.statusLabel}
        onApprove={content.onApprove}
        onReject={content.onReject}
        onRequestChanges={content.onRequestChanges}
      />
    </div>
  );
}

export function ApprovalCardShell({
  className,
  reduce,
  state,
  status,
  children,
}: {
  className?: string;
  reduce: boolean;
  state: ReturnType<typeof import('./use-approval-card').useApprovalCard>;
  status: ApprovalCardStatus;
  children: React.ReactNode;
}) {
  return (
    <div
      ref={state.cardRef}
      aria-busy={state.busy}
      aria-keyshortcuts={state.interactive && !state.questionMode ? 'Enter Escape' : undefined}
      data-state={status}
      tabIndex={state.interactive && !state.questionMode ? 0 : undefined}
      className={cn(
        'analysis-panel rounded-analysis focus-visible:ring-ring w-full overflow-hidden p-4 text-sm outline-none focus-visible:ring-2',
        state.archived && 'opacity-95',
        className,
      )}
    >
      <p aria-live="polite" className="sr-only">
        {state.liveMessage}
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
            busy={state.busy}
            interactive={state.interactive}
            questionMode={state.questionMode}
            reduceMotion={reduce}
            status={status}
          />
        </span>
        {children}
      </div>
    </div>
  );
}
