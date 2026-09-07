'use client';

import { AgentActivity } from '@/components/agents/agent-activity';
import { Message, MessageBubble, MessageBubbleContent } from '@/components/agents/message';
import { StreamingResponse } from '@/components/agents/streaming-response';
import { coachBeuiCopy } from '@/components/coach/beui/coach-beui-copy';
import { CoachBeuiLoadingStatus } from '@/components/coach/beui/coach-beui-loading';
import { coachBeuiTheme } from '@/components/coach/beui/coach-beui-theme';
import { toolPartsToAgentActivity } from '@/components/coach/beui/coach-tool-activity-items';
import { CoachMessage } from '@/components/coach/chat/transcript/coach-message';
import { CoachProvenanceChips } from '@/components/coach/chat/transcript/coach-provenance-chips';
import { CoachReasoning } from '@/components/coach/chat/transcript/coach-reasoning';
import { ToolActivityList } from '@/components/coach/chat/tools/tool-activity-list';
import type { CoachMappedRow } from '@/components/coach/beui/coach-message-mapper';
import type { ToolPartLite } from '@/lib/coach/chat/tools/coach-tool-parts';
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

/**
 * Beautiful UI Tool Chips / Task Rows:
 * - working → live task rows (AgentActivity expanded)
 * - complete → compact chip row (no accordion summary)
 */
function CoachAssistantTools({
  toolParts,
  streamIdle,
}: {
  toolParts: ToolPartLite[];
  streamIdle: boolean;
}) {
  if (toolParts.length === 0) {
    return null;
  }

  const activity = toolPartsToAgentActivity(toolParts, streamIdle);

  if (activity.status === 'working') {
    return (
      <AgentActivity
        activeLabel={coachBeuiCopy.agentToolsWorking}
        className={coachBeuiTheme.agentActivity}
        items={activity.items}
        renderWorkingStatus={({ label }) => <CoachBeuiLoadingStatus label={String(label)} />}
        status="working"
        summary={coachBeuiCopy.agentToolsComplete(activity.items.length)}
        defaultOpen
      />
    );
  }

  return (
    <div className={cn(coachBeuiTheme.agentActivity, 'pt-0.5')}>
      <ToolActivityList parts={toolParts} streamIdle={streamIdle} />
    </div>
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
  return (
    <Message
      key={row.key}
      animateIn={row.live}
      className={cn(!row.live && row.key !== lastAssistantRowKey && 'cv-auto')}
      from="assistant"
      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
    >
      <div className={coachBeuiTheme.assistantColumn}>
        <CoachReasoning
          hasAnswerText={row.text.length > 0}
          streaming={row.live}
          text={row.reasoning}
        />
        <div className={coachBeuiTheme.assistantProse}>
          <AssistantAnswerBody live={row.live} text={row.text} />
        </div>
        <CoachAssistantTools streamIdle={streamIdle} toolParts={row.toolParts} />
        {streamIdle && row.showProvenance ? <CoachProvenanceChips /> : null}
      </div>
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
