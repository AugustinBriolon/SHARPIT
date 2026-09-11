import type { ApprovalCardAnswer, ApprovalCardAnswers, ApprovalCardProps } from './types';
import type { ApprovalCardStatus } from './types';
import { getApprovalStatusLabel } from './approval-card-status';
import { approvalCardCopy } from './copy';
import { isAnswered } from './approval-card-parts';

const EMPTY_ANSWER: ApprovalCardAnswer = { selected: [], custom: '' };

function interactionFlags(status: ApprovalCardProps['status'], disabled: boolean) {
  const pending = status === 'pending';
  const busy = status === 'submitting';
  const interactive = (pending || busy) && !disabled;
  return { archived: !interactive, busy, interactive };
}

function questionStatusLabelFor(answer: ApprovalCardAnswer) {
  return isAnswered(answer)
    ? approvalCardCopy.status.pending
    : approvalCardCopy.status.inputRequired;
}

export function deriveApprovalCardView(props: {
  answers: ApprovalCardAnswers;
  currentStep: number;
  disabled: boolean;
  questions: NonNullable<ApprovalCardProps['questions']>;
  status: ApprovalCardStatus;
  title?: ApprovalCardProps['title'];
}) {
  const { answers, currentStep, disabled, questions, status, title } = props;
  const question = questions[currentStep];
  const questionMode = questions.length > 0;
  const flags = interactionFlags(status, disabled);
  const currentAnswer = question ? (answers[question.id] ?? EMPTY_ANSWER) : EMPTY_ANSWER;

  return {
    ...flags,
    controlsDisabled: flags.busy || disabled,
    currentAnswer,
    displayTitle: question?.title ?? title,
    question,
    questionMode,
    questionProgressLabel: approvalCardCopy.questionProgress(currentStep + 1, questions.length),
    questionStatusLabel: questionStatusLabelFor(currentAnswer),
    statusLabel: getApprovalStatusLabel(status),
    titleKey: question?.id ?? String(status),
  };
}
