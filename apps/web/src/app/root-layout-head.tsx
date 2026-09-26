import { THEME_INIT_SCRIPT } from '@sharpit/app/lib/theme/theme';

export function RootLayoutHead() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} id="theme-init" />
      <link crossOrigin="anonymous" href="https://basemaps.cartocdn.com" rel="preconnect" />
      <link href="https://basemaps.cartocdn.com" rel="dns-prefetch" />
      <link
        href="/apple-splash/iphone-notch"
        media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)"
        rel="apple-touch-startup-image"
      />
      <link
        href="/apple-splash/iphone-se"
        media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)"
        rel="apple-touch-startup-image"
      />
      <link
        href="/apple-splash/ipad-portrait"
        media="(device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        rel="apple-touch-startup-image"
      />
      <link
        href="/apple-splash/ipad-landscape"
        media="(device-width: 1180px) and (device-height: 820px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)"
        rel="apple-touch-startup-image"
      />
    </>
  );
}
