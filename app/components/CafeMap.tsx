"use client";

import { useEffect } from "react";
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap } from "@vis.gl/react-google-maps";

const DEFAULT_CENTER = { lat: 20, lng: 0 };
const DEFAULT_ZOOM = 2;

type Cafe = {
  id: string;
  displayName: { text: string };
  location?: { latitude: number; longitude: number };
};

type CafeMapProps = {
  cafes: Cafe[];
  selectedCafeId?: string | null;
  onSelectCafe?: (cafeId: string) => void;
};

function FitBoundsToResults({ cafes }: { cafes: Cafe[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const validCafes = cafes.filter((cafe) => cafe.location);
    if (validCafes.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    validCafes.forEach((cafe) => {
      bounds.extend({
        lat: cafe.location!.latitude,
        lng: cafe.location!.longitude,
      });
    });

    map.fitBounds(bounds);
  }, [map, cafes]);

  return null;
}

function ZoomToSelected({ cafes, selectedCafeId }: { cafes: Cafe[]; selectedCafeId?: string | null }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !selectedCafeId) return;

    const cafe = cafes.find((c) => c.id === selectedCafeId);
    if (!cafe?.location) return;

    map.panTo({ lat: cafe.location.latitude, lng: cafe.location.longitude });
    map.setZoom(16);
  }, [map, selectedCafeId, cafes]);

  return null;
}

function CoffeePin() {
  return (
    <div
      style={{
        width: 30,
        height: 30,
        borderRadius: "50% 50% 50% 4px",
        background: "#6f4e37",
        transform: "rotate(-45deg)",
        boxShadow: "0 1px 2px rgba(59,42,33,.15), 0 4px 10px rgba(59,42,33,.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: "#fff",
          transform: "rotate(45deg)",
        }}
      />
    </div>
  );
}

export default function CafeMap({ cafes, selectedCafeId, onSelectCafe }: CafeMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <p className="text-center text-red-600 dark:text-red-400">
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set
      </p>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <div className="w-full h-96">
        <Map
          defaultCenter={DEFAULT_CENTER}
          defaultZoom={DEFAULT_ZOOM}
          mapId="cafe-finder-map"
        >
          <FitBoundsToResults cafes={cafes} />
          <ZoomToSelected cafes={cafes} selectedCafeId={selectedCafeId} />
          {selectedCafeId &&
            (() => {
              const selectedCafe = cafes.find((c) => c.id === selectedCafeId);
              if (!selectedCafe?.location) return null;
              return (
                <InfoWindow
                  position={{
                    lat: selectedCafe.location.latitude,
                    lng: selectedCafe.location.longitude,
                  }}
                  pixelOffset={[0, -36]}
                >
                  <p className="text-sm font-semibold text-espresso px-1">
                    {selectedCafe.displayName.text}
                  </p>
                </InfoWindow>
              );
            })()}
          {cafes
            .filter((cafe) => cafe.location)
            .map((cafe) => (
              <AdvancedMarker
                key={cafe.id}
                position={{
                  lat: cafe.location!.latitude,
                  lng: cafe.location!.longitude,
                }}
                title={cafe.displayName.text}
                onClick={() => onSelectCafe?.(cafe.id)}
              >
                <CoffeePin />
              </AdvancedMarker>
            ))}
        </Map>
      </div>
    </APIProvider>
  );
}