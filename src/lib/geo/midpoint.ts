export function midpointFromLatLng(
  latlng: unknown,
): { latitude: number; longitude: number } | null {
  if (!Array.isArray(latlng) || latlng.length === 0) return null;
  const points = latlng.filter(
    (p): p is [number, number] =>
      Array.isArray(p) && p.length >= 2 && typeof p[0] === 'number' && typeof p[1] === 'number',
  );
  if (points.length === 0) return null;
  const mid = points[Math.floor(points.length / 2)];
  return { latitude: mid[0], longitude: mid[1] };
}
