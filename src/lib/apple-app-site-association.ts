import { CONNECT_GARMIN_CALLBACK_PATH } from '@/lib/integrations/garmin/garmin-connect-handoff';

/** Bundle id of SHARPIT-APP (see its project.pbxproj). */
const IOS_BUNDLE_ID = 'app.sharpit.ios';

/**
 * Deliberately not a Team ID: the real value is set in Vercel (`APPLE_TEAM_ID`) during
 * the sharpit.app cutover. Until then the file is served, but no app matches it.
 */
export const APPLE_TEAM_ID_PLACEHOLDER = 'APPLE_TEAM_ID_NOT_SET';

export function appleAppSiteAssociation(teamId: string | undefined) {
  const appId = `${teamId?.trim() || APPLE_TEAM_ID_PLACEHOLDER}.${IOS_BUNDLE_ID}`;
  return {
    applinks: {
      details: [
        {
          appIDs: [appId],
          // Only the end of the Garmin handoff reopens the app. `/connect/garmin` itself
          // must stay a web page: as a universal link, the app's own CTA would bounce
          // straight back into the app instead of opening the sign-in.
          components: [
            {
              '/': `${CONNECT_GARMIN_CALLBACK_PATH}*`,
              comment: 'Garmin handoff outcome (ADR-040)',
            },
          ],
        },
      ],
    },
    webcredentials: {
      apps: [appId],
    },
  };
}
