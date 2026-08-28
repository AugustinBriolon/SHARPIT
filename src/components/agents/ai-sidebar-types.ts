import type { SidebarResource } from './ai-sidebar';

export interface FlatResource {
  item: SidebarResource;
  depth: number;
  parentId: string | null;
}

export interface DropTarget {
  id: string | null;
  position: 'before' | 'inside' | 'after';
}
