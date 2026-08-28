'use client';

import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ClientConversationSummary } from '@/lib/query/fetchers';

function conversationLabel(c: ClientConversationSummary): string {
  const title = c.title.trim();
  return title || 'Nouvelle conversation';
}

const mobileSelectTriggerClassName = cn(
  'border-input flex min-h-11 w-full min-w-0 items-center justify-between gap-1.5 rounded-lg border',
  'bg-transparent py-2 pr-2 pl-2.5 text-sm lg:min-h-9',
);

function MobileDraftConversationRow() {
  return (
    <div aria-label="Conversation active" className={mobileSelectTriggerClassName}>
      <span className="truncate">Nouvelle conversation</span>
      <ChevronDownIcon className="text-muted-foreground size-4 shrink-0 opacity-50" aria-hidden />
    </div>
  );
}

function DraftConversationSelect({
  conversations,
  onSelect,
}: {
  conversations: ClientConversationSummary[];
  onSelect: (id: string) => void;
}) {
  if (conversations.length === 0) {
    return <MobileDraftConversationRow />;
  }

  return (
    <Select
      value="__draft__"
      onValueChange={(value) => {
        if (value && value !== '__draft__') {
          onSelect(value);
        }
      }}
    >
      <SelectTrigger aria-label="Conversation active" className="min-h-11 w-full min-w-0 lg:h-9">
        <SelectValue>Nouvelle conversation</SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-64 w-(--anchor-width) max-w-(--anchor-width)">
        <SelectItem className="min-w-0" value="__draft__">
          Nouvelle conversation
        </SelectItem>
        {conversations.map((c) => (
          <SelectItem key={c.id} className="min-w-0" value={c.id}>
            <span className="block min-w-0 truncate">{conversationLabel(c)}</span>
            <span className="text-muted-foreground block min-w-0 truncate text-xs">
              {formatDistanceToNow(c.updatedAt, { addSuffix: true, locale: fr })}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ActiveConversationSelect({
  conversations,
  selected,
  selectedId,
  onSelect,
}: {
  conversations: ClientConversationSummary[];
  selected: ClientConversationSummary | undefined;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <Select
      value={selectedId}
      onValueChange={(value) => {
        if (value) {
          onSelect(value);
        }
      }}
    >
      <SelectTrigger aria-label="Conversation active" className="min-h-11 w-full min-w-0 lg:h-9">
        <SelectValue placeholder="Nouvelle conversation">
          {selected ? conversationLabel(selected) : 'Nouvelle conversation'}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-64 w-(--anchor-width) max-w-(--anchor-width)">
        {conversations.map((c) => (
          <SelectItem key={c.id} className="min-w-0" value={c.id}>
            <span className="block min-w-0 truncate">{conversationLabel(c)}</span>
            <span className="text-muted-foreground block min-w-0 truncate text-xs">
              {formatDistanceToNow(c.updatedAt, { addSuffix: true, locale: fr })}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function CoachConversationMobilePicker({
  isDraft,
  conversations,
  selected,
  selectedId,
  onSelect,
}: {
  isDraft: boolean;
  conversations: ClientConversationSummary[];
  selected: ClientConversationSummary | undefined;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  if (isDraft) {
    return <DraftConversationSelect conversations={conversations} onSelect={onSelect} />;
  }

  return (
    <ActiveConversationSelect
      conversations={conversations}
      selected={selected}
      selectedId={selectedId}
      onSelect={onSelect}
    />
  );
}

export { conversationLabel };
