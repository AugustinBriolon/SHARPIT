import { describe, expect, it } from 'vitest';
import {
  DEMO_LINK_ACTIVITY_TITLE,
  DEMO_SESSION_LINK_PLANNED_TITLE,
  isDemoSessionLinkActivityTitle,
  isDemoSessionLinkPlannedTitle,
} from '@/lib/demo/demo-session-link-markers';

describe('demo session link markers', () => {
  it('recognises demo link planned and activity titles', () => {
    expect(isDemoSessionLinkPlannedTitle(DEMO_SESSION_LINK_PLANNED_TITLE)).toBe(true);
    expect(isDemoSessionLinkPlannedTitle('Sortie longue')).toBe(false);
    expect(isDemoSessionLinkActivityTitle(DEMO_LINK_ACTIVITY_TITLE)).toBe(true);
    expect(isDemoSessionLinkActivityTitle('Footing récup — démo liaison')).toBe(false);
  });
});
