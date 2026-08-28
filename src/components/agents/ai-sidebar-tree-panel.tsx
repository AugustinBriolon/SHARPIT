import type { AISidebarProps } from './ai-sidebar';
import { handleResourceTreeKeyDown } from './ai-sidebar-keyboard';
import type { FlatResource } from './ai-sidebar-types';
import { SidebarTreeList } from './ai-sidebar-tree-list';

type SidebarTreePanelProps = {
  state: ReturnType<typeof import('./ai-sidebar-hooks').useSidebarState>;
  focusedRow: string | null;
  renderIcon?: AISidebarProps['renderIcon'];
  renderMenu?: AISidebarProps['renderMenu'];
  buildMoves: (row: FlatResource) => import('./ai-sidebar').SidebarResourceMoveCommands;
  focusRow: (id: string) => void;
  select: (id: string) => void;
  toggle: (id: string) => void;
  handleRenameCommit: (row: FlatResource, label: string) => void;
  dragDrop: ReturnType<typeof import('./ai-sidebar-hooks').useSidebarDragDrop>;
};

export function SidebarTreePanel({
  state,
  focusedRow,
  renderIcon,
  renderMenu,
  buildMoves,
  focusRow,
  select,
  toggle,
  handleRenameCommit,
  dragDrop,
}: SidebarTreePanelProps) {
  const keyboardCtx = {
    flat: state.flat,
    expandedIds: state.expandedIds,
    focusRow,
    performMove: state.performMove,
    select,
    toggle,
    setExpandedIds: state.setExpandedIds,
    setRenamingId: state.setRenamingId,
    setMenuOpenId: state.setMenuOpenId,
  };

  return (
    <SidebarTreeList
      buildMoveCommands={buildMoves}
      draggingId={state.draggingId}
      dropTarget={state.dropTarget}
      expandedIds={state.expandedIds}
      flat={state.flat}
      focusedRow={focusedRow}
      menuOpenId={state.menuOpenId}
      renamingId={state.renamingId}
      renderIcon={renderIcon}
      renderMenu={renderMenu}
      rowRefs={state.rowRefs}
      selectedId={state.selectedId}
      onFocusRow={focusRow}
      onKeyDown={(event, row) => handleResourceTreeKeyDown(event, row, keyboardCtx)}
      onRenameCancel={() => state.setRenamingId(null)}
      onRenameCommit={handleRenameCommit}
      onRenameStart={state.setRenamingId}
      onRowDragOver={dragDrop.handleRowDragOver}
      onRowDrop={dragDrop.handleRowDrop}
      onSelect={select}
      onToggle={toggle}
      onDragEnd={() => {
        state.setDraggingId(null);
        state.setDropTarget(null);
      }}
      onDragStart={(event, id) => {
        state.setDraggingId(id);
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', id);
      }}
      onMenuOpenChange={(rowId, open) => {
        state.setMenuOpenId(open ? rowId : null);
        if (!open) {
          focusRow(rowId);
        }
      }}
    />
  );
}
