import type { DragEvent } from 'react';
import type { FlatResource } from './ai-sidebar-types';

type RowInteractionOptions = {
  acceptsChildren: boolean;
  renaming: boolean;
  disabled: boolean | undefined;
  draggedRef: React.MutableRefObject<boolean>;
  onToggle: () => void;
  onSelect: () => void;
  onRenameStart: () => void;
  onDragEnd: () => void;
  onDragStart: (event: DragEvent<HTMLDivElement>, id: string) => void;
  row: FlatResource;
};

export function createRowClickHandler(options: RowInteractionOptions) {
  const { acceptsChildren, renaming, disabled, draggedRef, onToggle, onSelect } = options;
  return (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || draggedRef.current || renaming || disabled) {
      return;
    }
    if (acceptsChildren) {
      onToggle();
    } else {
      onSelect();
    }
  };
}

export function createRowDoubleClickHandler(options: RowInteractionOptions) {
  const { acceptsChildren, disabled, onRenameStart } = options;
  return (event: React.MouseEvent<HTMLDivElement>) => {
    if (acceptsChildren || disabled) {
      return;
    }
    event.preventDefault();
    onRenameStart();
  };
}

export function createRowDragEndHandler(options: RowInteractionOptions) {
  const { draggedRef, onDragEnd } = options;
  return () => {
    onDragEnd();
    requestAnimationFrame(() => {
      draggedRef.current = false;
    });
  };
}

export function createRowDragStartHandler(options: RowInteractionOptions) {
  const { draggedRef, onDragStart, row } = options;
  return (event: DragEvent<HTMLDivElement>) => {
    draggedRef.current = true;
    onDragStart(event, row.item.id);
  };
}
