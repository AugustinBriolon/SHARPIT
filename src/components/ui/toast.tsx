'use client';

import { Toast as ToastPrimitive } from '@base-ui/react/toast';
import { CircleCheckIcon, CircleXIcon, InfoIcon, LoaderIcon, XIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Manager global : permet de déclencher des toasts depuis n'importe où, y
 * compris en dehors d'un composant React (et même si le composant à l'origine
 * de l'appel est démonté, par ex. après avoir quitté la page).
 */
export const toastManager = ToastPrimitive.createToastManager();

type ToastInput = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  timeout?: number;
};

export const toast = {
  add: toastManager.add,
  close: toastManager.close,
  update: toastManager.update,
  promise: toastManager.promise,
  success: (title: React.ReactNode, options?: ToastInput) =>
    toastManager.add({ type: 'success', title, ...options }),
  error: (title: React.ReactNode, options?: ToastInput) =>
    toastManager.add({ type: 'error', title, ...options }),
  info: (title: React.ReactNode, options?: ToastInput) =>
    toastManager.add({ type: 'info', title, ...options }),
  loading: (title: React.ReactNode, options?: ToastInput) =>
    toastManager.add({ type: 'loading', title, timeout: 0, ...options }),
};

function ToastIcon({ type }: { type: string | undefined }) {
  switch (type) {
    case 'success':
      return <CircleCheckIcon className="text-primary size-5 shrink-0" />;
    case 'error':
      return <CircleXIcon className="text-destructive size-5 shrink-0" />;
    case 'loading':
      return <LoaderIcon className="text-muted-foreground size-5 shrink-0 animate-spin" />;
    case 'info':
      return <InfoIcon className="text-muted-foreground size-5 shrink-0" />;
    default:
      return null;
  }
}

function ToastList() {
  const { toasts } = ToastPrimitive.useToastManager();

  return toasts.map((item) => (
    <ToastPrimitive.Root
      key={item.id}
      className="bg-popover text-popover-foreground ring-foreground/10 absolute right-0 bottom-0 left-auto z-[calc(1000-var(--toast-index))] mr-0 h-[var(--height)] w-full origin-bottom [transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--peek))-(var(--shrink)*var(--height))))_scale(var(--scale))] rounded-xl border shadow-lg ring-1 select-none [--gap:0.75rem] [--height:var(--toast-frontmost-height,var(--toast-height))] [--offset-y:calc(var(--toast-offset-y)*-1+calc(var(--toast-index)*var(--gap)*-1)+var(--toast-swipe-movement-y))] [--peek:0.75rem] [--scale:calc(max(0,1-(var(--toast-index)*0.1)))] [--shrink:calc(1-var(--scale))] [transition:transform_0.5s_cubic-bezier(0.22,1,0.36,1),opacity_0.5s,height_0.15s] after:absolute after:top-full after:left-0 after:h-[calc(var(--gap)+1px)] after:w-full after:content-[''] data-ending-style:opacity-0 data-expanded:h-[var(--toast-height)] data-expanded:[transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--offset-y)))] data-limited:opacity-0 data-starting-style:[transform:translateY(150%)] data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))] data-expanded:data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))] data-ending-style:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))] data-expanded:data-ending-style:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))] data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))] data-expanded:data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))] data-ending-style:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))] data-expanded:data-ending-style:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))] [&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:[transform:translateY(150%)]"
      toast={item}
    >
      <ToastPrimitive.Content className="flex h-full items-start gap-3 overflow-hidden p-3 transition-opacity duration-[250ms] ease-[cubic-bezier(0.22,1,0.36,1)] data-behind:opacity-0 data-expanded:opacity-100">
        <ToastIcon type={item.type} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {item.title && (
            <ToastPrimitive.Title className="font-heading text-sm leading-snug font-medium" />
          )}
          {item.description && (
            <ToastPrimitive.Description className="text-muted-foreground text-sm leading-snug" />
          )}
        </div>
        <ToastPrimitive.Close
          aria-label="Fermer"
          className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-ring -mt-1 -mr-1 flex size-7 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:outline-2 focus-visible:-outline-offset-1"
        >
          <XIcon className="size-4" />
        </ToastPrimitive.Close>
      </ToastPrimitive.Content>
    </ToastPrimitive.Root>
  ));
}

export function Toaster() {
  return (
    <ToastPrimitive.Provider toastManager={toastManager}>
      <ToastPrimitive.Portal>
        <ToastPrimitive.Viewport className="fixed top-auto right-4 bottom-4 left-auto z-[100] mx-auto w-[calc(100vw-2rem)] outline-none sm:right-6 sm:bottom-6 sm:w-90">
          <ToastList />
        </ToastPrimitive.Viewport>
      </ToastPrimitive.Portal>
    </ToastPrimitive.Provider>
  );
}
