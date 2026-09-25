const VARIANT_COUNT = 3;

const NAV_INDEX: Record<string, (index: number) => number> = {
  ArrowDown: (index) => (index + 1) % VARIANT_COUNT,
  ArrowRight: (index) => (index + 1) % VARIANT_COUNT,
  ArrowUp: (index) => (index - 1 + VARIANT_COUNT) % VARIANT_COUNT,
  ArrowLeft: (index) => (index - 1 + VARIANT_COUNT) % VARIANT_COUNT,
  Home: () => 0,
  End: () => VARIANT_COUNT - 1,
};

const SELECT_KEYS = new Set([' ', 'Enter']);

export function handleVariantKeyDown(
  event: React.KeyboardEvent<HTMLButtonElement>,
  index: number,
  selectVariantAt: (index: number) => void,
) {
  const nav = NAV_INDEX[event.key];
  if (nav) {
    event.preventDefault();
    selectVariantAt(nav(index));
    return;
  }
  if (SELECT_KEYS.has(event.key)) {
    event.preventDefault();
    selectVariantAt(index);
  }
}
