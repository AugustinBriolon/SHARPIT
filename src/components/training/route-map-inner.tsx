'use client';

import MapLibreGL from 'maplibre-gl';
import { useEffect, useMemo, useState } from 'react';
import { Map, MapMarker, MapRoute, MarkerContent, useMap } from '@/components/ui/map';

type Path = [number, number][];

type LngLat = [number, number];

function toLngLat(path: Path): LngLat[] {
  // Le repo stocke les coordonnées en [lat, lng] (Leaflet). MapLibre attend [lng, lat].
  return path.map(([lat, lng]) => [lng, lat]);
}

function FitBounds({ coordinates }: { coordinates: LngLat[] }) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!isLoaded || !map) return;
    if (coordinates.length < 2) return;

    const bounds = new MapLibreGL.LngLatBounds(coordinates[0], coordinates[0]);
    for (const [lng, lat] of coordinates) bounds.extend([lng, lat]);

    map.fitBounds(bounds, { padding: 24, maxZoom: 15 });
  }, [coordinates, isLoaded, map]);

  return null;
}

export default function RouteMapInner({
  path,
  lineColor = 'var(--primary)',
}: {
  path: Path;
  lineColor?: string;
}) {
  const coordinates = useMemo(() => toLngLat(path), [path]);
  const start = path[0] ?? [0, 0];
  const end = path[path.length - 1] ?? start;
  const [startLat, startLng] = start;
  const [endLat, endLng] = end;
  const [hovered, setHovered] = useState(false);

  return (
    <Map
      attributionControl={false}
      center={coordinates[0] ?? [0, 0]}
      className="h-full w-full"
      scrollZoom={false}
      zoom={13}
    >
      <FitBounds coordinates={coordinates} />
      <MapRoute
        color={lineColor}
        coordinates={coordinates}
        opacity={hovered ? 1 : 0.9}
        width={hovered ? 6 : 4}
        interactive
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />
      <MapMarker latitude={startLat} longitude={startLng}>
        <MarkerContent>
          <div className="border-background h-3.5 w-3.5 rounded-full border-2 bg-emerald-500 shadow-none" />
        </MarkerContent>
      </MapMarker>
      <MapMarker latitude={endLat} longitude={endLng}>
        <MarkerContent>
          <div className="border-background h-3.5 w-3.5 rounded-full border-2 bg-rose-500 shadow-none" />
        </MarkerContent>
      </MapMarker>
    </Map>
  );
}
