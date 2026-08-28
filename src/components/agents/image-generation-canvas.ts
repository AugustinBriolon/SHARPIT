const TWO_PI = Math.PI * 2;

type PointerState = {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  inside: boolean;
};

type DrawDitherDotGridOptions = {
  context: CanvasRenderingContext2D;
  pointer: PointerState;
  width: number;
  height: number;
  dotGap: number;
  dotColor: string;
};

export function drawDitherDotGrid({
  context,
  pointer,
  width,
  height,
  dotGap,
  dotColor,
}: DrawDitherDotGridOptions): void {
  const radius = Math.min(width, height) * 0.38;
  const columns = Math.ceil(width / dotGap) + 1;
  const rows = Math.ceil(height / dotGap) + 1;
  const offsetX = (width - (columns - 1) * dotGap) / 2;
  const offsetY = (height - (rows - 1) * dotGap) / 2;

  context.fillStyle = dotColor;

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const anchorX = offsetX + column * dotGap;
      const anchorY = offsetY + row * dotGap;
      const deltaX = anchorX - pointer.x;
      const deltaY = anchorY - pointer.y;
      const distance = Math.hypot(deltaX, deltaY);
      const proximity = Math.max(0, 1 - distance / radius);
      const influence = proximity * proximity * (3 - 2 * proximity);
      const displacement = influence * influence * 9;
      const directionX = distance > 0 ? deltaX / distance : 0;
      const directionY = distance > 0 ? deltaY / distance : 0;
      const x = anchorX + directionX * displacement;
      const y = anchorY + directionY * displacement;
      const dotRadius = 0.65 + influence * 0.85;

      context.globalAlpha = 0.17 + influence * 0.72;
      context.beginPath();
      context.arc(x, y, dotRadius, 0, TWO_PI);
      context.fill();
    }
  }

  context.globalAlpha = 1;
}
