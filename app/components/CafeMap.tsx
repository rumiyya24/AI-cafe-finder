"use client";

import { useEffect } from "react";
import { APIProvider, Map, AdvancedMarker, useMap } from "@vis.gl/react-google-maps";

const DEFAULT_CENTER = { lat: 20, lng: 0 }; // roughly centers the whole world map
const DEFAULT_ZOOM = 2;

type Cafe = {
  id: string;
  displayName: { text: string };
  location?: { latitude: number; longitude: number };
};

type CafeMapProps = {
  cafes: Cafe[];
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

export default function CafeMap({ cafes }: CafeMapProps) {
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
      <div className="w-full h-96 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-800">
        <Map
          defaultCenter={DEFAULT_CENTER}
          defaultZoom={DEFAULT_ZOOM}
          mapId="cafe-finder-map"
        >
          <FitBoundsToResults cafes={cafes} />
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
              />
            ))}
        </Map>
      </div>
    </APIProvider>
  );
}