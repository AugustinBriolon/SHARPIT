"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  TileLayer,
  useMap,
} from "react-leaflet";

type Path = [number, number][];

function FitBounds({ path }: { path: Path }) {
  const map = useMap();
  useEffect(() => {
    if (path.length > 1) {
      map.fitBounds(L.latLngBounds(path), { padding: [24, 24] });
    }
  }, [map, path]);
  return null;
}

export default function RouteMapInner({ path }: { path: Path }) {
  const start = path[0];
  const end = path[path.length - 1];

  return (
    <MapContainer
      center={start}
      zoom={13}
      scrollWheelZoom={false}
      attributionControl={false}
      className="h-full w-full"
      style={{ background: "transparent" }}
    >
      <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
      <Polyline
        positions={path}
        pathOptions={{ color: "#22d3ee", weight: 4, opacity: 0.95 }}
      />
      <CircleMarker
        center={start}
        radius={6}
        pathOptions={{
          color: "#fff",
          weight: 2,
          fillColor: "#10b981",
          fillOpacity: 1,
        }}
      />
      <CircleMarker
        center={end}
        radius={6}
        pathOptions={{
          color: "#fff",
          weight: 2,
          fillColor: "#f43f5e",
          fillOpacity: 1,
        }}
      />
      <FitBounds path={path} />
    </MapContainer>
  );
}
