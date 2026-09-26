'use client';

import { type ReactNode, useState } from 'react';
import { navigateToConnect } from '@/client/query/api-fetch';

/**
 * A provider connect link. The connect runs on `api.`, which needs the session as a Bearer a
 * plain link cannot carry: a click asks it for the next URL and navigates there. The `href`
 * stays for the same-origin fallback.
 */
export function ConnectLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <a
        className={className}
        href={href}
        onClick={(event) => {
          event.preventDefault();
          setError(null);
          navigateToConnect(href).catch((reason: unknown) =>
            setError(reason instanceof Error ? reason.message : 'Connexion impossible.'),
          );
        }}
      >
        {children}
      </a>
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}
