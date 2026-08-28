'use client';

import { AgentActivity } from '@/components/agents/agent-activity';
import { Message, MessageBubble, MessageBubbleContent } from '@/components/agents/message';
import { StreamingResponse } from '@/components/agents/streaming-response';
import { coachBeuiCopy } from '@/components/coach/beui/coach-beui-copy';
import { CoachBeuiLoadingStatus } from '@/components/coach/beui/coach-beui-loading';
import { coachBeuiTheme } from '@/components/coach/beui/coach-beui-theme';
import { toolPartsToAgentActivity } from '@/components/coach/beui/coach-tool-activity-items';
import { CoachMessage } from '@/components/coach/chat/coach-message';
import { CoachProvenanceChips } from '@/components/coach/chat/coach-provenance-chips';
import { CoachReasoning } from '@/components/coach/chat/coach-reasoning';
import type { CoachMappedRow } from '@/components/coach/beui/coach-message-mapper';
import { cn } from '@/lib/utils';

function AssistantAnswerBody({ live, text }: { live: boolean; text: string }) {
  if (text) {
    return (
      <StreamingResponse
        announce={false}
        showActions={false}
        status={live ? 'streaming' : 'complete'}
      >
        <CoachMessage streaming={live}>{text}</CoachMessage>
      </StreamingResponse>
    );
  }

  if (live) {
    return <CoachBeuiLoadingStatus label={coachBeuiCopy.drafting} />;
  }

  return null;
}

function CoachUserMessageRow({ row }: { row: Extract<CoachMappedRow, { kind: 'user' }> }) {
  return (
    <Message key={row.key} className={cn(!row.live && 'cv-auto')} from="user" animateIn>
      <MessageBubble variant="ghost">
        <MessageBubbleContent className={coachBeuiTheme.userBubble}>
          {row.text}
        </MessageBubbleContent>
      </MessageBubble>
    </Message>
  );
}

function CoachAssistantMessageRow({
  row,
  streamIdle,
  lastAssistantRowKey,
}: {
  row: Extract<CoachMappedRow, { kind: 'assistant' }>;
  streamIdle: boolean;
  lastAssistantRowKey: string | null;
}) {
  const activity = toolPartsToAgentActivity(row.toolParts, streamIdle);

  return (
    <Message
      key={row.key}
      className={cn(!row.live && row.key !== lastAssistantRowKey && 'cv-auto')}
      from="assistant"
    >
      <MessageBubble variant="ghost">
        <MessageBubbleContent className={coachBeuiTheme.assistantBubble}>
          <CoachReasoning
            hasAnswerText={row.text.length > 0}
            streaming={row.live}
            text={row.reasoning}
          />
          <AssistantAnswerBody live={row.live} text={row.text} />
          {activity.items.length > 0 ? (
            <AgentActivity
              activeLabel={coachBeuiCopy.agentToolsWorking}
              className={coachBeuiTheme.agentActivity}
              defaultOpen={false}
              items={activity.items}
              renderWorkingStatus={({ label }) => <CoachBeuiLoadingStatus label={String(label)} />}
              status={activity.status}
              summary={coachBeuiCopy.agentToolsComplete(activity.items.length)}
              collapseOnComplete
            />
          ) : null}
          {streamIdle && row.showProvenance ? <CoachProvenanceChips /> : null}
        </MessageBubbleContent>
      </MessageBubble>
    </Message>
  );
}

export function CoachChatTranscriptRows({
  mappedRows,
  streamIdle,
  lastAssistantRowKey,
}: {
  mappedRows: CoachMappedRow[];
  streamIdle: boolean;
  lastAssistantRowKey: string | null;
}) {
  return (
    <>
      {mappedRows.map((row) =>
        row.kind === 'user' ? (
          <CoachUserMessageRow key={row.key} row={row} />
        ) : (
          <CoachAssistantMessageRow
            key={row.key}
            lastAssistantRowKey={lastAssistantRowKey}
            row={row}
            streamIdle={streamIdle}
          />
        ),
      )}
    </>
  );
}
