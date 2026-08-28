'use client';

import { ChevronDown } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { type CitationItem, CitationList, CitationStack } from '@/components/agents/citations';
import { AgentDisclosure } from '@/components/agents/agent-disclosure';
import { SPRING_SWAP } from '@/lib/ease';

export function StreamingSourcesToggle({
  currentSourcesOpen,
  onSourcesOpenChange,
  sources,
  sourcesContentId,
}: {
  currentSourcesOpen: boolean;
  onSourcesOpenChange: (open: boolean) => void;
  sources: CitationItem[];
  sourcesContentId: string;
}) {
  const reduce = useReducedMotion() ?? false;

  return (
    <button
      aria-controls={sourcesContentId}
      aria-expanded={currentSourcesOpen}
      className="group text-muted-foreground hover:text-foreground focus-visible:ring-ring ml-1 inline-flex min-h-7 items-center gap-2 rounded-md px-1.5 text-xs transition-colors outline-none focus-visible:ring-2"
      type="button"
      onClick={() => onSourcesOpenChange(!currentSourcesOpen)}
    >
      <CitationStack citations={sources} />
      <span className="tabular-nums">
        {sources.length} {sources.length === 1 ? 'source' : 'sources'}
      </span>
      <motion.span
        animate={{ rotate: currentSourcesOpen ? 180 : 0 }}
        aria-hidden="true"
        className="text-muted-foreground/50 group-hover:text-muted-foreground"
        transition={reduce ? { duration: 0 } : SPRING_SWAP}
      >
        <ChevronDown className="size-3" />
      </motion.span>
    </button>
  );
}

export function StreamingSourcesPanel({
  currentSourcesOpen,
  resolvedSourcePrefix,
  sources,
  sourcesContentId,
}: {
  currentSourcesOpen: boolean;
  resolvedSourcePrefix: string;
  sources: CitationItem[];
  sourcesContentId: string;
}) {
  return (
    <AgentDisclosure id={sourcesContentId} open={currentSourcesOpen}>
      <CitationList
        citations={sources}
        className="bg-muted mt-2 rounded-xl p-2"
        idPrefix={resolvedSourcePrefix}
      />
    </AgentDisclosure>
  );
}
