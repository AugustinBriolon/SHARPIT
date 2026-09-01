import type { RefObject } from 'react';
import { useEffect } from 'react';
import { attachIosIframeFocusZoomGuard } from '@/lib/integrations/garmin/ios-iframe-focus-zoom';

/**
 * Temporarily caps maximum-scale while the athlete types in the cross-origin
 * Garmin SSO iframe (iOS focus-zoom), then restores pinch-zoom.
 */
export function useIosIframeFocusZoomGuard(
  iframeRef: RefObject<HTMLIFrameElement | null>,
  enabled: boolean,
): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }
    const iframe = iframeRef.current;
    if (!iframe) {
      return;
    }
    return attachIosIframeFocusZoomGuard(iframe);
  }, [enabled, iframeRef]);
}
