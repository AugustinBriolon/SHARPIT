'use client';

import { useEffect, useRef, useState } from 'react';
import { LoaderIcon, RefreshCw } from 'lucide-react';
import { useServiceWorkerUpdate } from '@/hooks/use-sw-update';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import {
  SW_UPDATE_APPLY_LABEL,
  SW_UPDATE_APPLYING_LABEL,
  SW_UPDATE_AVAILABLE_TITLE,
  buildApplyingUpdateToastOptions,
} from '@/lib/pwa/sw-update-feedback';

/**
 * Never activates automatically — the athlete must tap Update. Until then, the
 * previously-installed service worker keeps serving the current session, so no
 * open form or coaching dialog is ever interrupted by a version swap.
 *
 * Surfaced as a persistent toast rather than a fixed top banner: a version
 * update is low-urgency and shouldn't claim the top of the screen or overlap
 * page content the way a `position: fixed` banner does.
 *
 * Tap feedback is intentional and immediate: pressed scale → local spinner →
 * toast morphs to loading. Never a silent wait until `controllerchange` reloads.
 */
export function UpdateAvailableToast() {
  const { updateAvailable, applyUpdate } = useServiceWorkerUpdate();
  const toastIdRef = useRef<string | null>(null);
  const applyUpdateRef = useRef(applyUpdate);
  applyUpdateRef.current = applyUpdate;

  useEffect(() => {
    if (!updateAvailable || toastIdRef.current) {
      return;
    }

    const toastId = toast.info(SW_UPDATE_AVAILABLE_TITLE, {
      description: (
        <UpdateActionButton
          onApply={() => {
            const applying = buildApplyingUpdateToastOptions();
            const id = toastIdRef.current;
            if (id) {
              // Morph in place — spinner on toast chrome + French applying copy.
              toast.update(id, applying);
            } else {
              toast.loading(applying.title, { description: applying.description });
            }
            applyUpdateRef.current();
          }}
        />
      ),
      timeout: 0,
    });
    toastIdRef.current = toastId;
  }, [updateAvailable]);

  return null;
}

function UpdateActionButton({ onApply }: { onApply: () => void }) {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      aria-busy={pending || undefined}
      className={cn(
        'text-primary pressable mt-1 inline-flex items-center gap-1.5 text-sm font-semibold underline-offset-2',
        'hover:underline disabled:pointer-events-none disabled:opacity-70 disabled:no-underline',
      )}
      onClick={() => {
        if (pending) {
          return;
        }
        // Synchronous pending flip — pressed + spinner before any SW work.
        setPending(true);
        onApply();
      }}
    >
      {pending ? (
        <LoaderIcon className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden />
      ) : (
        <RefreshCw className="size-3.5" aria-hidden />
      )}
      {pending ? SW_UPDATE_APPLYING_LABEL : SW_UPDATE_APPLY_LABEL}
    </button>
  );
}
