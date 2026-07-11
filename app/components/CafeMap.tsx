"use client";

import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";

const BAKU_CENTER = { lat: 40.4093, lng: 49.8671 };

type Cafe = {
  id: string;
  displayName: { text: string };
  location?: { latitude: number; longitude: number };
};

type CafeMapProps = {
  cafes: Cafe[];
};

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
          defaultCenter={BAKU_CENTER}
          defaultZoom={12}
          mapId="cafe-finder-map"
        >
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