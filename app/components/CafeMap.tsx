"use client";

import { APIProvider, Map } from "@vis.gl/react-google-maps";

const BAKU_CENTER = { lat: 40.4093, lng: 49.8671 };

export default function CafeMap() {
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
        <Map defaultCenter={BAKU_CENTER} defaultZoom={12} />
      </div>
    </APIProvider>
  );
}