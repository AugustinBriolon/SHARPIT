export type PresentationConfidenceTone = 'good' | 'warn' | 'neutral' | 'bad';

export type PresentationConfidence = {
  /** 0..1 */
  pct: number | null;
  label: string | null;
  tone: PresentationConfidenceTone;
};

export type PresentationEmptyState = {
  title: string;
  description?: string;
  action?: {
    label: string;
    href: string;
  };
};

export type PresentationNavigationTarget = {
  label: string;
  href: string;
};

export type PresentationAction = {
  label: string;
  href: string;
};

export type PresentationSection = {
  id: string;
  type:
    | 'hero'
    | 'decision'
    | 'signals'
    | 'insights'
    | 'evidence'
    | 'trends'
    | 'charts'
    | 'dimensions'
    | 'alerts'
    | 'trajectory'
    | 'actionRow'
    | 'bodyInsights'
    | 'misc';
  data: unknown;
};

export type PresentationHierarchy = {
  rootId: string;
  order: string[];
};
