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
  /**
   * One button, for undoing what the toast just announced.
   *
   * A destructive or hard-to-reverse action is far cheaper to offer back than to
   * confirm up front: a confirm dialog taxes every correct action to protect
   * against the rare wrong one, while an undo taxes nothing and costs a click
   * only when it was actually needed.
   */
  actionProps?: React.ComponentPropsWithoutRef<'button'>;
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

/**
 * Sits above the mobile bottom nav (`--bottom-nav-offset`, declared in
 * `globals.css`) so a toast can never cover a nav tap target. The nav is
 * `lg:hidden`, so the offset is released at `lg` — not at `sm`, where the bar
 * is still on screen. `pointer-events-none` keeps the full-width band inert;
 * each toast Root re-enables its own pointer events.
 */
export const toastViewportClass =
  'pointer-events-none fixed top-auto right-4 bottom-[calc(var(--bottom-nav-offset)+0.75rem)] left-auto z-[100] mx-auto w-[calc(100vw-2rem)] outline-none sm:right-6 sm:w-90 lg:bottom-6';

/** Touch-first close target on mobile, dense on desktop — matches `Button size="icon"`. */
export const toastCloseClass =
  'text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-ring flex size-9 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:outline-2 focus-visible:-outline-offset-1 lg:size-7';

function ToastIcon({ type }: { type: string | undefined }) {
  switch (type) {
    case 'success':
      return <CircleCheckIcon className="text-primary size-5 shrink-0" aria-hidden />;
    case 'error':
      return <CircleXIcon className="text-destructive size-5 shrink-0" aria-hidden />;
    case 'loading':
      return (
        <LoaderIcon
          className="text-muted-foreground size-5 shrink-0 animate-spin motion-reduce:animate-none"
          aria-hidden
        />
      );
    case 'info':
      return <InfoIcon className="text-muted-foreground size-5 shrink-0" aria-hidden />;
    default:
      return null;
  }
}

/**
 * Motion (transform / opacity) lives on Root. Height lives on the inner shell
 * without a transition — stacking still snaps to `--toast-height` on expand,
 * compositor-only animation stays off the layout path.
 */
function ToastList() {
  const { toasts } = ToastPrimitive.useToastManager();

  return toasts.map((item) => (
    <ToastPrimitive.Root
      key={item.id}
      className="group/toast toast-motion pointer-events-auto absolute right-0 bottom-0 left-auto z-[calc(1000-var(--toast-index))] mr-0 w-full origin-bottom [transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--peek))-(var(--shrink)*var(--height))))_scale(var(--scale))] select-none [--gap:0.75rem] [--height:var(--toast-frontmost-height,var(--toast-height))] [--offset-y:calc(var(--toast-offset-y)*-1+calc(var(--toast-index)*var(--gap)*-1)+var(--toast-swipe-movement-y))] [--peek:0.75rem] [--scale:calc(max(0,1-(var(--toast-index)*0.1)))] [--shrink:calc(1-var(--scale))] data-ending-style:opacity-0 data-expanded:[transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--offset-y)))] data-limited:opacity-0 data-starting-style:[transform:translateY(150%)] data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))] data-expanded:data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))] data-ending-style:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))] data-expanded:data-ending-style:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))] data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))] data-expanded:data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))] data-ending-style:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))] data-expanded:data-ending-style:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))] [&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:[transform:translateY(150%)]"
      toast={item}
    >
      <span
        className="absolute top-full left-0 w-full"
        style={{ height: 'calc(var(--gap) + 1px)' }}
        aria-hidden
      />
      <div className="bg-popover text-popover-foreground ring-foreground/10 h-(--height) overflow-hidden rounded-xl border shadow-none ring-1 group-data-expanded/toast:h-[var(--toast-height)]">
        <ToastPrimitive.Content className="flex h-full items-center gap-3 overflow-hidden p-3 transition-opacity duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] data-behind:opacity-0 data-expanded:opacity-100 motion-reduce:transition-none">
          <ToastIcon type={item.type} />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            {item.title && (
              <ToastPrimitive.Title className="font-heading text-sm leading-snug font-medium wrap-break-word" />
            )}
            {item.description && (
              <ToastPrimitive.Description className="text-muted-foreground text-sm leading-snug wrap-break-word" />
            )}
          </div>
          {item.actionProps ? (
            <ToastPrimitive.Action
              className={cn(
                'border-analysis-border/70 text-foreground hover:border-primary/40 shrink-0',
                'inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-medium',
                'focus-visible:ring-primary/35 transition-colors focus-visible:ring-2 focus-visible:outline-hidden',
              )}
            />
          ) : null}
          <ToastPrimitive.Close aria-label="Fermer" className={toastCloseClass}>
            <XIcon className="size-4" aria-hidden />
          </ToastPrimitive.Close>
        </ToastPrimitive.Content>
      </div>
    </ToastPrimitive.Root>
  ));
}

export function Toaster() {
  return (
    <ToastPrimitive.Provider toastManager={toastManager}>
      <ToastPrimitive.Portal>
        <ToastPrimitive.Viewport className={toastViewportClass}>
          <ToastList />
        </ToastPrimitive.Viewport>
      </ToastPrimitive.Portal>
    </ToastPrimitive.Provider>
  );
}
