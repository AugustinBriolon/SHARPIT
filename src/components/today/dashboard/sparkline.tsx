export function buildSparkPaths(
  values: (number | null)[],
  W: number,
  H: number,
): { line: string; area: string } {
  const valid = values.filter((v): v is number => v !== null);
  if (valid.length < 2) return { line: '', area: '' };

  const minV = Math.min(...valid);
  const maxV = Math.max(...valid);
  const range = maxV - minV || 1;
  const pad = 2;

  const sx = (i: number) => pad + (i / (values.length - 1)) * (W - pad * 2);
  const sy = (v: number) => H - pad - ((v - minV) / range) * (H - pad * 2);

  let line = '';
  let area = '';
  let lastX = 0;
  let started = false;

  values.forEach((v, i) => {
    if (v === null) {
      started = false;
      return;
    }
    const x = sx(i);
    const y = sy(v);
    if (!started) {
      line += `M ${x} ${y}`;
      area += `M ${x} ${H} L ${x} ${y}`;
      started = true;
    } else {
      line += ` L ${x} ${y}`;
      area += ` L ${x} ${y}`;
    }
    lastX = x;
  });

  if (area) area += ` L ${lastX} ${H} Z`;
  return { line, area };
}

export function Sparkline({
  values,
  stroke,
  h = 32,
}: {
  values: (number | null)[];
  stroke: string;
  h?: number;
}) {
  const W = 200;
  const { line, area } = buildSparkPaths(values, W, h);
  if (!line) return null;

  return (
    <svg height={h} preserveAspectRatio="none" viewBox={`0 0 ${W} ${h}`} width="100%" aria-hidden>
      {area && <path d={area} fill={stroke} fillOpacity={0.12} />}
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
