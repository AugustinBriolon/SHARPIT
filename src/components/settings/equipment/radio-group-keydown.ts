const KEY_HANDLERS: Record<string, 'advance' | 'retreat' | 'home' | 'end' | 'select'> = {
  ArrowDown: 'advance',
  ArrowRight: 'advance',
  ArrowUp: 'retreat',
  ArrowLeft: 'retreat',
  Home: 'home',
  End: 'end',
  ' ': 'select',
  Enter: 'select',
};

export function handleRadioGroupKeyDown(
  event: React.KeyboardEvent<HTMLButtonElement>,
  index: number,
  optionCount: number,
  selectAt: (index: number) => void,
): void {
  const action = KEY_HANDLERS[event.key];
  if (!action) {
    return;
  }

  event.preventDefault();
  if (action === 'advance') {
    selectAt((index + 1) % optionCount);
    return;
  }
  if (action === 'retreat') {
    selectAt((index - 1 + optionCount) % optionCount);
    return;
  }
  if (action === 'home') {
    selectAt(0);
    return;
  }
  if (action === 'end') {
    selectAt(optionCount - 1);
    return;
  }
  selectAt(index);
}
