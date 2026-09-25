import type { ReactNode } from 'react';

export function PlanSectionHeading({
  action,
  heading: Tag = 'h3',
  id,
  title,
}: {
  action?: ReactNode;
  heading?: 'h2' | 'h3';
  id?: string;
  title: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Tag className="text-section-title min-w-0 text-pretty" id={id}>
        {title}
      </Tag>
      {action}
    </div>
  );
}
