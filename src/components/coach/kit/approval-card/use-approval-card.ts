'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { approvalCardCopy } from './copy';
import { deriveApprovalCardView } from './approval-card-state';
import type { ApprovalCardAnswer, ApprovalCardAnswers, ApprovalCardProps } from './types';

export function useApprovalCard(props: ApprovalCardProps) {
  const {
    answers,
    defaultAnswers = {},
    defaultStep = 0,
    disabled = false,
    onAnswersChange,
    onApprove,
    onReject,
    onStepChange,
    onSubmit,
    questions = [],
    status = 'pending',
    step,
    title,
  } = props;

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

  const view = deriveApprovalCardView({
    answers: currentAnswers,
    currentStep,
    disabled,
    questions,
    status,
    title,
  });

  useEffect(() => {
    if (view.questionMode && view.interactive) {
      setLiveMessage(approvalCardCopy.stepAnnouncement(currentStep + 1, questions.length));
      return;
    }
    if (view.archived) {
      setLiveMessage(approvalCardCopy.statusAnnouncement(view.statusLabel));
    }
  }, [
    view.archived,
    view.interactive,
    view.questionMode,
    view.statusLabel,
    currentStep,
    questions.length,
  ]);

  useApprovalCardFocusAndKeys({
    cardRef,
    interactive: view.interactive,
    onApprove,
    onReject,
    questionMode: view.questionMode,
  });

  const clearAutoAdvance = useCallback(() => {
    if (autoAdvanceTimer.current === undefined) {
      return;
    }
    window.clearTimeout(autoAdvanceTimer.current);
    autoAdvanceTimer.current = undefined;
  }, []);

  useEffect(() => clearAutoAdvance, [clearAutoAdvance]);

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
    if (!view.question) {
      return;
    }
    setAnswers({ ...currentAnswers, [view.question.id]: next });
  };

  const continueQuestion = () => {
    if (currentStep < questions.length - 1) {
      setStep(currentStep + 1);
      return;
    }
    onSubmit?.(currentAnswers);
  };

  const queueAutoAdvance = () => {
    const { question, busy } = view;
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

  return {
    cardRef,
    currentStep,
    liveMessage,
    ...view,
    continueQuestion,
    queueAutoAdvance,
    setStep,
    updateCurrentAnswer,
  };
}

function useApprovalCardFocusAndKeys({
  cardRef,
  interactive,
  onApprove,
  onReject,
  questionMode,
}: {
  cardRef: React.RefObject<HTMLDivElement | null>;
  interactive: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  questionMode: boolean;
}) {
  useEffect(() => {
    if (!interactive || questionMode) {
      return;
    }
    cardRef.current?.focus();
  }, [cardRef, interactive, questionMode]);

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
  }, [cardRef, interactive, onApprove, onReject, questionMode]);
}
