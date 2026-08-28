'use client';

import { Checkbox } from '@/components/motion/checkbox';
import { Input } from '@/components/motion/input';
import { RadioGroup, RadioGroupItem } from '@/components/motion/radio';
import { cn } from '@/lib/utils';
import type { ApprovalCardAnswer, ApprovalCardQuestion } from './types';

const OPTION_ROW_CLASS = 'min-h-11 rounded-lg px-1.5 py-1';

function MultipleQuestionOptions({
  question,
  answer,
  disabled,
  onChange,
}: {
  question: ApprovalCardQuestion;
  answer: ApprovalCardAnswer;
  disabled: boolean;
  onChange: (answer: ApprovalCardAnswer) => void;
}) {
  return (
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
  );
}

function SingleQuestionOptions({
  question,
  answer,
  disabled,
  onChange,
  onSingleSelect,
}: {
  question: ApprovalCardQuestion;
  answer: ApprovalCardAnswer;
  disabled: boolean;
  onChange: (answer: ApprovalCardAnswer) => void;
  onSingleSelect?: () => void;
}) {
  return (
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
  );
}

function CustomQuestionInput({
  question,
  answer,
  customPlaceholder,
  disabled,
  onChange,
}: {
  question: ApprovalCardQuestion;
  answer: ApprovalCardAnswer;
  customPlaceholder: string;
  disabled: boolean;
  onChange: (answer: ApprovalCardAnswer) => void;
}) {
  const custom = answer.custom ?? '';

  return (
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
  );
}

export function QuestionOptions({
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
  const hasOptions = Boolean(question.options?.length);

  return (
    <div className="mt-3">
      {hasOptions && question.multiple ? (
        <MultipleQuestionOptions
          answer={answer}
          disabled={disabled}
          question={question}
          onChange={onChange}
        />
      ) : null}
      {hasOptions && !question.multiple ? (
        <SingleQuestionOptions
          answer={answer}
          disabled={disabled}
          question={question}
          onChange={onChange}
          onSingleSelect={onSingleSelect}
        />
      ) : null}
      {question.allowCustom ? (
        <CustomQuestionInput
          answer={answer}
          customPlaceholder={customPlaceholder}
          disabled={disabled}
          question={question}
          onChange={onChange}
        />
      ) : null}
    </div>
  );
}
