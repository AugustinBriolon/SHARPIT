'use client';

import { BrickEvaluationDialog } from './brick-evaluation-dialog';
import { BrickEvaluationSummary } from './brick-evaluation-summary';
import { useBrickEvaluationEditor } from './use-brick-evaluation-editor';

export function BrickEvaluationSection({
  brickGroupId,
  disabled,
}: {
  brickGroupId: string;
  disabled: boolean;
}) {
  const editor = useBrickEvaluationEditor(brickGroupId);
  return (
    <>
      <BrickEvaluationSummary
        disabled={disabled}
        evaluation={editor.evaluation}
        onEdit={editor.openEditor}
      />
      <BrickEvaluationDialog
        draft={editor.draft}
        isSaving={editor.isSaving}
        open={editor.open}
        onDraftChange={editor.patchDraft}
        onOpenChange={editor.setOpen}
        onSave={editor.handleSave}
      />
    </>
  );
}
