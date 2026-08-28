const SELECT_KEYS = new Set([' ', 'Enter']);

export function handleRadioGroupKeyDown(
  event: React.KeyboardEvent<HTMLButtonElement>,
  index: number,
  count: number,
  selectAt: (index: number) => void,
) {
  const navByKey: Record<string, (current: number) => number> = {
    ArrowDown: (current) => (current + 1) % count,
    ArrowRight: (current) => (current + 1) % count,
    ArrowUp: (current) => (current - 1 + count) % count,
    ArrowLeft: (current) => (current - 1 + count) % count,
    Home: () => 0,
    End: () => count - 1,
  };

  const nav = navByKey[event.key];
  if (nav) {
    event.preventDefault();
    selectAt(nav(index));
    return;
  }
  if (SELECT_KEYS.has(event.key)) {
    event.preventDefault();
    selectAt(index);
  }
}
