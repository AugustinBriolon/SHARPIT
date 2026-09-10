/**
 * One grid for domain headers, dumbbell rows and distribution strips. The track
 * cell has the same width and origin everywhere, so axis ticks and points align.
 * Mobile: label and gap on the first line, track indented under the label
 * (ps-11 = icon well 2rem + gap 0.75rem). Wide: [label 186px] [track] [gap 118px].
 */
export const DUMBBELL_GRID =
  'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 px-3 wide:grid-cols-[186px_minmax(0,1fr)_118px] wide:gap-y-0';

export const DUMBBELL_LABEL_CELL = 'col-start-1 row-start-1 min-w-0';

export const DUMBBELL_DELTA_CELL = 'col-start-2 row-start-1 justify-self-end wide:col-start-3';

export const DUMBBELL_TRACK_CELL =
  'col-span-2 col-start-1 row-start-2 block ps-11 wide:col-span-1 wide:col-start-2 wide:row-start-1 wide:ps-0';

/** Positioning box inside the track cell — the inset leaves room for edge points and overflow marks. */
export const DUMBBELL_TRACK_BOX = 'relative mx-3 block';
