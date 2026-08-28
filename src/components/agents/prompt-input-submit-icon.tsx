'use client';

import { ArrowUp, Square } from 'lucide-react';

export function PromptSubmitIcon({ loading }: { loading: boolean }) {
  if (loading) {
    return <Square className="size-3 fill-current" />;
  }
  return <ArrowUp className="size-4" />;
}
