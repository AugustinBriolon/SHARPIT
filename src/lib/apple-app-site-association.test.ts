import { describe, expect, it } from 'vitest';
import {
  APPLE_TEAM_ID_PLACEHOLDER,
  appleAppSiteAssociation,
} from '@/lib/apple-app-site-association';

describe('appleAppSiteAssociation', () => {
  it('associates the iOS app for universal links and credentials', () => {
    const aasa = appleAppSiteAssociation('ABCDE12345');
    expect(aasa.applinks.details[0].appIDs).toEqual(['ABCDE12345.app.sharpit.ios']);
    expect(aasa.webcredentials.apps).toEqual(['ABCDE12345.app.sharpit.ios']);
  });

  it('opens only the handoff callback in the app', () => {
    const paths = appleAppSiteAssociation('ABCDE12345').applinks.details[0].components.map(
      (component) => component['/'],
    );
    expect(paths).toEqual(['/connect/garmin/callback*']);
  });

  it('serves a marked placeholder rather than a guessed Team ID', () => {
    expect(appleAppSiteAssociation(undefined).webcredentials.apps).toEqual([
      `${APPLE_TEAM_ID_PLACEHOLDER}.app.sharpit.ios`,
    ]);
    expect(appleAppSiteAssociation('  ').webcredentials.apps[0]).toContain(
      APPLE_TEAM_ID_PLACEHOLDER,
    );
  });
});
