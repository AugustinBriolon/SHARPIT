'use client';

import { useReducedMotion } from 'motion/react';
import {
  ApprovalCardBody,
  ApprovalCardShell,
} from '@/components/coach/kit/approval-card/approval-card-layout';
import { useApprovalCard } from '@/components/coach/kit/approval-card/use-approval-card';
import type { ApprovalCardProps } from './types';

export type {
  ApprovalCardAnswer,
  ApprovalCardAnswers,
  ApprovalCardOption,
  ApprovalCardProps,
  ApprovalCardQuestion,
  ApprovalCardStatus,
} from './types';

export function ApprovalCard(props: ApprovalCardProps) {
  const { status = 'pending', className, chrome = 'instrument' } = props;
  const reduce = useReducedMotion() ?? false;
  const state = useApprovalCard(props);

  return (
    <ApprovalCardShell
      chrome={chrome}
      className={className}
      reduce={reduce}
      state={state}
      status={status}
    >
      <ApprovalCardBody props={props} reduce={reduce} state={state} />
    </ApprovalCardShell>
  );
}
