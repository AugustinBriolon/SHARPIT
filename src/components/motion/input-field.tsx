'use client';

import { useInputField } from '@/components/motion/use-input-field';
import { InputErrorMessage } from '@/components/motion/input-parts';
import { InputFieldShell } from '@/components/motion/input-field-shell';
import { MotionInputControl } from '@/components/motion/motion-input-control';
import type { InputProps } from '@/components/motion/input-types';
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

function MotionInputLabel({
  id,
  label,
  className,
}: {
  id: string;
  label: string;
  className?: string;
}) {
  return (
    <label className={cn('text-foreground px-1 text-sm font-medium', className)} htmlFor={id}>
      {label}
    </label>
  );
}

export const MotionInputField = forwardRef<HTMLInputElement, InputProps>(
  function MotionInputField(props, ref) {
    const {
      label,
      success,
      leftIcon,
      className,
      classNames,
      disabled,
      type,
      onFocus,
      onBlur,
      ...rest
    } = props;
    const field = useInputField(props);

    return (
      <div className={cn('flex flex-col gap-1.5', className, classNames?.root)}>
        {label ? (
          <MotionInputLabel className={classNames?.label} id={field.id} label={label} />
        ) : null}

        <InputFieldShell
          classNames={classNames}
          disabled={disabled}
          fieldRef={field.fieldRef}
          focused={field.focused}
          hasError={field.hasError}
          leftIcon={leftIcon}
          reduce={field.reduce}
          rightSlot={field.rightSlot}
          success={success}
        >
          <MotionInputControl
            ref={ref}
            classNames={classNames}
            disabled={disabled}
            errorMessage={field.errorMessage}
            hasError={field.hasError}
            id={field.id}
            leftIcon={leftIcon}
            rightSlot={field.rightSlot}
            success={success}
            type={type}
            value={field.value}
            onBlur={onBlur}
            onFocus={onFocus}
            onFocusChange={(focused) => field.setFocused(focused)}
            onValueChange={field.handleChange}
            {...(rest as Omit<
              React.InputHTMLAttributes<HTMLInputElement>,
              'value' | 'defaultValue' | 'onChange'
            >)}
          />
        </InputFieldShell>

        {field.errorMessage ? (
          <InputErrorMessage
            classNames={classNames}
            errorMessage={field.errorMessage}
            id={field.id}
            reduce={field.reduce}
          />
        ) : null}
      </div>
    );
  },
);
