import { EASE_OUT } from '@/lib/ease';

export function previewRailCardMotion(reduce: boolean) {
  return {
    animate: reduce ? { opacity: 1 } : { opacity: 1, y: 0, filter: 'blur(0px)' },
    exit: reduce
      ? { opacity: 0 }
      : {
          opacity: 0,
          y: -2,
          filter: 'blur(4px)',
          transition: { duration: 0.12, ease: EASE_OUT },
        },
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 4, filter: 'blur(6px)' },
    transition: { duration: reduce ? 0 : 0.18, ease: EASE_OUT },
  };
}
