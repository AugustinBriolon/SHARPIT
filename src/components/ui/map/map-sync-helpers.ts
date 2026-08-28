import type { AddLayerObject, Map as MapLibreMap, Marker } from 'maplibre-gl';

type ViewportState = {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
};

export function buildViewportUpdate(
  viewport: Partial<ViewportState>,
  current: ViewportState,
): ViewportState {
  return {
    center: viewport.center ?? current.center,
    zoom: viewport.zoom ?? current.zoom,
    bearing: viewport.bearing ?? current.bearing,
    pitch: viewport.pitch ?? current.pitch,
  };
}

export function isViewportUnchanged(next: ViewportState, current: ViewportState) {
  return (
    next.center[0] === current.center[0] &&
    next.center[1] === current.center[1] &&
    next.zoom === current.zoom &&
    next.bearing === current.bearing &&
    next.pitch === current.pitch
  );
}

export function syncControlledViewport(
  mapInstance: MapLibreMap,
  viewport: Partial<ViewportState>,
  getViewport: (map: MapLibreMap) => ViewportState,
  internalUpdateRef: { current: boolean },
) {
  if (mapInstance.isMoving()) {
    return;
  }
  const current = getViewport(mapInstance);
  const next = buildViewportUpdate(viewport, current);
  if (isViewportUnchanged(next, current)) {
    return;
  }
  internalUpdateRef.current = true;
  mapInstance.jumpTo(next);
  internalUpdateRef.current = false;
}

type MarkerOptions = {
  offset?: [number, number] | { x: number; y: number };
  rotation?: number;
  rotationAlignment?: 'map' | 'viewport' | 'auto';
  pitchAlignment?: 'map' | 'viewport' | 'auto';
};

function syncMarkerPosition(marker: Marker, longitude: number, latitude: number) {
  const current = marker.getLngLat();
  if (current.lng !== longitude || current.lat !== latitude) {
    marker.setLngLat([longitude, latitude]);
  }
}

function syncMarkerOffset(marker: Marker, offset?: MarkerOptions['offset']) {
  const currentOffset = marker.getOffset();
  const newOffset = offset ?? [0, 0];
  const [newOffsetX, newOffsetY] = Array.isArray(newOffset)
    ? newOffset
    : [newOffset.x, newOffset.y];
  if (currentOffset.x !== newOffsetX || currentOffset.y !== newOffsetY) {
    marker.setOffset([newOffsetX, newOffsetY]);
  }
}

function setMarkerRotation(marker: Marker, rotation: number | undefined) {
  if (marker.getRotation() !== (rotation ?? 0)) {
    marker.setRotation(rotation ?? 0);
  }
}

function setMarkerRotationAlignment(
  marker: Marker,
  rotationAlignment: MarkerOptions['rotationAlignment'],
) {
  if (marker.getRotationAlignment() !== (rotationAlignment ?? 'auto')) {
    marker.setRotationAlignment(rotationAlignment ?? 'auto');
  }
}

function setMarkerPitchAlignment(marker: Marker, pitchAlignment: MarkerOptions['pitchAlignment']) {
  if (marker.getPitchAlignment() !== (pitchAlignment ?? 'auto')) {
    marker.setPitchAlignment(pitchAlignment ?? 'auto');
  }
}

function syncMarkerRotation(marker: Marker, options: MarkerOptions) {
  setMarkerRotation(marker, options.rotation);
  setMarkerRotationAlignment(marker, options.rotationAlignment);
  setMarkerPitchAlignment(marker, options.pitchAlignment);
}

export function syncMarkerFromOptions(options: {
  marker: Marker;
  longitude: number;
  latitude: number;
  draggable: boolean;
  markerOptions: MarkerOptions;
}) {
  const { marker, longitude, latitude, draggable, markerOptions } = options;
  syncMarkerPosition(marker, longitude, latitude);
  if (marker.isDraggable() !== draggable) {
    marker.setDraggable(draggable);
  }
  syncMarkerOffset(marker, markerOptions.offset);
  syncMarkerRotation(marker, markerOptions);
}

export function requestMapLocation(
  map: MapLibreMap | null | undefined,
  onLocate: ((coords: { longitude: number; latitude: number }) => void) | undefined,
  setWaiting: (waiting: boolean) => void,
) {
  setWaiting(true);
  if (!('geolocation' in navigator)) {
    setWaiting(false);
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const coords = {
        longitude: pos.coords.longitude,
        latitude: pos.coords.latitude,
      };
      map?.flyTo({
        center: [coords.longitude, coords.latitude],
        zoom: 14,
        duration: 1500,
      });
      onLocate?.(coords);
      setWaiting(false);
    },
    (error) => {
      console.error('Error getting location:', error);
      setWaiting(false);
    },
  );
}

export function toggleMapFullscreen(map: MapLibreMap | null | undefined) {
  const container = map?.getContainer();
  if (!container) {
    return;
  }
  if (document.fullscreenElement) {
    document.exitFullscreen();
    return;
  }
  container.requestFullscreen();
}

type GeoJsonSource = {
  setData: (data: GeoJSON.Feature<GeoJSON.LineString>) => void;
};

export function setRouteLineData(source: GeoJsonSource, points: [number, number][]) {
  source.setData({
    type: 'Feature',
    properties: {},
    geometry: { type: 'LineString', coordinates: points },
  });
}

type RouteRevealOptions = {
  source: GeoJsonSource;
  coordinates: [number, number][];
  animate: boolean;
  shouldAnimateMotion: boolean;
  durationMs: (count: number) => number;
  revealedCount: (elapsed: number, duration: number, total: number) => number;
  isComplete: (elapsed: number, duration: number) => boolean;
};

export function startRouteRevealAnimation(options: RouteRevealOptions): (() => void) | undefined {
  const {
    source,
    coordinates,
    animate,
    shouldAnimateMotion,
    durationMs,
    revealedCount,
    isComplete,
  } = options;
  if (!animate || !shouldAnimateMotion) {
    setRouteLineData(source, coordinates);
    return undefined;
  }

  let frameId: number;
  const startedAt = performance.now();
  const duration = durationMs(coordinates.length);

  const step = (now: number) => {
    const elapsed = now - startedAt;
    setRouteLineData(
      source,
      coordinates.slice(0, revealedCount(elapsed, duration, coordinates.length)),
    );
    if (!isComplete(elapsed, duration)) {
      frameId = requestAnimationFrame(step);
    }
  };

  frameId = requestAnimationFrame(step);
  return () => cancelAnimationFrame(frameId);
}

type LayerPaint = Record<string, unknown>;

type LayerEnsureOptions = {
  map: MapLibreMap;
  sourceId: string;
  layerId: string;
  show: boolean;
  paint: LayerPaint;
  type: 'fill' | 'line';
  beforeId?: string;
};

function ensureGeoJsonLayer(options: LayerEnsureOptions) {
  const { map, sourceId, layerId, show, paint, type, beforeId } = options;
  if (show && !map.getLayer(layerId)) {
    map.addLayer(
      { id: layerId, type, source: sourceId, paint: paint as never } as AddLayerObject,
      beforeId,
    );
    return;
  }
  if (!show && map.getLayer(layerId)) {
    map.removeLayer(layerId);
  }
}

function applyLayerPaint(map: MapLibreMap, layerId: string, paint: LayerPaint) {
  if (!map.getLayer(layerId)) {
    return;
  }
  for (const [key, value] of Object.entries(paint)) {
    map.setPaintProperty(layerId, key, value as never);
  }
}

export function syncMapGeoJsonLayerVisibility(options: {
  map: MapLibreMap;
  sourceId: string;
  fillLayerId: string;
  lineLayerId: string;
  showFill: boolean;
  showLine: boolean;
  mergedFillPaint: LayerPaint;
  mergedLinePaint: LayerPaint;
  beforeId?: string;
}) {
  const {
    map,
    sourceId,
    fillLayerId,
    lineLayerId,
    showFill,
    showLine,
    mergedFillPaint,
    mergedLinePaint,
    beforeId,
  } = options;

  ensureGeoJsonLayer({
    map,
    sourceId,
    layerId: fillLayerId,
    show: showFill,
    paint: mergedFillPaint,
    type: 'fill',
    beforeId,
  });
  ensureGeoJsonLayer({
    map,
    sourceId,
    layerId: lineLayerId,
    show: showLine,
    paint: mergedLinePaint,
    type: 'line',
    beforeId,
  });
  if (showFill) {
    applyLayerPaint(map, fillLayerId, mergedFillPaint);
  }
  if (showLine) {
    applyLayerPaint(map, lineLayerId, mergedLinePaint);
  }
}
