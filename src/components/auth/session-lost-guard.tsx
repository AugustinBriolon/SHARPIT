'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useRef } from 'react';

const clerkBypassEnabled =
  process.env.NEXT_PUBLIC_DEV_BYPASS_CLERK === 'true' && process.env.NODE_ENV === 'development';

/**
 * When a session this tab held disappears — account deleted from another tab or
 * device, session revoked, sign-out elsewhere — leave for the teaser instead of letting
 * every next request fail into an error page. Only a signed-in → signed-out transition
 * counts: demo visitors never had a session and stay put.
 */
function SessionLostGuardWithClerk() {
  const { isLoaded, isSignedIn } = useAuth();
  const wasSignedIn = useRef(false);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }
    if (isSignedIn) {
      wasSignedIn.current = true;
      return;
    }
    if (wasSignedIn.current) {
      window.location.replace('/welcome');
    }
  }, [isLoaded, isSignedIn]);

  return null;
}

export function SessionLostGuard() {
  if (clerkBypassEnabled) {
    return null;
  }
  return <SessionLostGuardWithClerk />;
}
